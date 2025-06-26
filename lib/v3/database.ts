/**
 * V3診断システム - データベース操作
 * 
 * career_user_diagnosis_v3テーブルへのCRUD操作
 * Supabase Admin Client使用
 */

import { supabaseAdmin } from '@/lib/supabase'
import { getJSTTimestamp } from '@/lib/utils/timestamp'
import type { V3Session, V3Answer, V3PartialResult, V3FinalResult, V3ClickedService } from './session'

// ============================================
// 型定義
// ============================================

export interface V3DatabaseRecord {
  id?: string
  user_id: string
  session_id: string
  version_type: 'v3'
  
  // 個別質問回答カラム
  q1_text?: string
  q2_text?: string
  q3_text?: string
  q4_text?: string
  q5_text?: string
  q6_text?: string
  q7_text?: string
  q8_text?: string
  q9_text?: string
  q10_text?: string
  
  // 個別質問内容（参照用）
  q1_question?: string
  q2_question?: string
  q3_question?: string
  q4_question?: string
  q5_question?: string
  q6_question?: string
  q7_question?: string
  q8_question?: string
  q9_question?: string
  q10_question?: string
  
  // 個別回答時刻
  q1_answered_at?: string
  q2_answered_at?: string
  q3_answered_at?: string
  q4_answered_at?: string
  q5_answered_at?: string
  q6_answered_at?: string
  q7_answered_at?: string
  q8_answered_at?: string
  q9_answered_at?: string
  q10_answered_at?: string
  
  // 進捗管理
  current_step: number
  total_questions: number
  completed_questions: number
  is_completed: boolean
  
  // AI分析結果
  partial_results: V3PartialResult[]
  final_result?: V3FinalResult
  ai_analysis?: Record<string, any>
  clicked_services: V3ClickedService[]
  
  // 環境情報
  device_info?: Record<string, any>
  ip_address?: string
  region?: string
  user_agent?: string
  
  // タイムスタンプ
  started_at: string
  first_partial_diagnosis_at?: string
  completed_at?: string
  last_activity_at: string
  created_at: string
  updated_at: string
}

export interface V3SaveRequest {
  sessionId: string
  userId: string
  
  // 個別質問回答
  q1_text?: string
  q2_text?: string
  q3_text?: string
  q4_text?: string
  q5_text?: string
  q6_text?: string
  q7_text?: string
  q8_text?: string
  q9_text?: string
  q10_text?: string
  
  // 現在回答中の質問番号（どの質問を更新するか）
  questionNumber?: number
  answerText?: string
  
  // 進捗状況
  currentStep: number
  completedQuestions: number
  isCompleted: boolean
  
  // AI分析結果
  partialDiagnosisHistory?: V3PartialResult[]
  finalResult?: V3FinalResult
  aiAnalysis?: Record<string, any>
  
  // その他
  clickedServices?: V3ClickedService[]
  updateType: 'progress_update' | 'partial_diagnosis' | 'final_completed' | 'click_only' | 'answer_update'
}

export interface V3SaveResponse {
  success: boolean
  id?: string
  message?: string
  error?: string
}

// ============================================
// データベース操作関数
// ============================================

/**
 * V3診断データを保存（UPSERT）
 */
export async function saveV3DiagnosisData(request: V3SaveRequest): Promise<V3SaveResponse> {
  try {
    const timestamp = getJSTTimestamp()
    
    // デバイス情報を取得（可能な場合）
    const deviceInfo = await getDeviceInfo()
    
    // カラムベース版のデータベースレコードを構築
    const dbRecord: any = {
      user_id: request.userId,
      session_id: request.sessionId,
      version_type: 'v3',
      current_step: request.currentStep,
      total_questions: 10,
      // completed_questionsとis_completedはトリガーで自動計算されるため設定不要
      partial_results: request.partialDiagnosisHistory || [],
      final_result: request.finalResult,
      ai_analysis: request.aiAnalysis || {},
      clicked_services: request.clickedServices || [],
      device_info: deviceInfo,
      last_activity_at: timestamp,
      updated_at: timestamp
    }

    // 個別質問回答を設定
    if (request.q1_text !== undefined) dbRecord.q1_text = request.q1_text
    if (request.q2_text !== undefined) dbRecord.q2_text = request.q2_text
    if (request.q3_text !== undefined) dbRecord.q3_text = request.q3_text
    if (request.q4_text !== undefined) dbRecord.q4_text = request.q4_text
    if (request.q5_text !== undefined) dbRecord.q5_text = request.q5_text
    if (request.q6_text !== undefined) dbRecord.q6_text = request.q6_text
    if (request.q7_text !== undefined) dbRecord.q7_text = request.q7_text
    if (request.q8_text !== undefined) dbRecord.q8_text = request.q8_text
    if (request.q9_text !== undefined) dbRecord.q9_text = request.q9_text
    if (request.q10_text !== undefined) dbRecord.q10_text = request.q10_text

    // 質問番号ベースでの更新（一つの質問だけ更新する場合）
    if (request.questionNumber && request.answerText !== undefined) {
      const questionKey = `q${request.questionNumber}_text`
      const answeredAtKey = `q${request.questionNumber}_answered_at`
      dbRecord[questionKey] = request.answerText
      dbRecord[answeredAtKey] = timestamp
    }

    // 特別な更新タイプでの追加処理
    if (request.updateType === 'partial_diagnosis' && request.partialDiagnosisHistory?.length === 1) {
      dbRecord.first_partial_diagnosis_at = timestamp
    }

    if (request.updateType === 'final_completed') {
      dbRecord.completed_at = timestamp
    }

    // 既存レコードの確認
    const { data: existingRecord } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('id, created_at')
      .eq('session_id', request.sessionId)
      .single()

    let result

    if (existingRecord) {
      // 更新（UPDATE）
      const { data, error } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .update(dbRecord)
        .eq('session_id', request.sessionId)
        .select('id')
        .single()

      if (error) throw error
      result = data

    } else {
      // 新規作成（INSERT）
      dbRecord.created_at = timestamp
      dbRecord.started_at = timestamp
      
      const { data, error } = await supabaseAdmin
        .from('career_user_diagnosis_v3')
        .insert(dbRecord)
        .select('id')
        .single()

      if (error) throw error
      result = data
    }

    console.log(`✅ [V3 Database] ${existingRecord ? 'Updated' : 'Created'} record:`, {
      sessionId: request.sessionId,
      updateType: request.updateType,
      completedQuestions: request.completedQuestions,
      isCompleted: request.isCompleted
    })

    return {
      success: true,
      id: result.id,
      message: `V3診断データを${existingRecord ? '更新' : '作成'}しました`
    }

  } catch (error) {
    console.error('❌ [V3 Database] Save error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * V3診断データを取得
 */
export async function getV3DiagnosisData(sessionId: string): Promise<V3DatabaseRecord | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // レコードが見つからない場合
        return null
      }
      throw error
    }

    return data

  } catch (error) {
    console.error('❌ [V3 Database] Get error:', error)
    return null
  }
}

/**
 * V3診断データ一覧を取得（管理画面用）
 */
export async function getV3DiagnosisListForAdmin(limit: number = 100): Promise<{
  data: V3DatabaseRecord[]
  count: number
}> {
  try {
    // 件数取得
    const { count } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('id', { count: 'exact', head: true })

    // データ取得
    const { data, error } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return {
      data: data || [],
      count: count || 0
    }

  } catch (error) {
    console.error('V3 Database List error:', error)
    return {
      data: [],
      count: 0
    }
  }
}

/**
 * V3サービスクリック統計を取得（管理画面用）
 */
export async function getV3ServiceClickStats(): Promise<Array<{
  serviceName: string
  serviceUrl?: string
  clickCount: number
  latestClick: string
}>> {
  try {
    const { data, error } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('clicked_services, updated_at')
      .not('clicked_services', 'eq', '[]')

    if (error) throw error

    // クリック統計を集計
    const clickStats: Record<string, {
      serviceName: string
      serviceUrl?: string
      clickCount: number
      latestClick: string
    }> = {}

    data?.forEach(record => {
      if (record.clicked_services && Array.isArray(record.clicked_services)) {
        record.clicked_services.forEach((service: V3ClickedService) => {
          const key = service.serviceName

          if (!clickStats[key]) {
            clickStats[key] = {
              serviceName: service.serviceName,
              serviceUrl: service.serviceUrl,
              clickCount: 0,
              latestClick: service.clickedAt
            }
          }

          clickStats[key].clickCount++

          // より新しいクリック時刻を保持
          if (new Date(service.clickedAt) > new Date(clickStats[key].latestClick)) {
            clickStats[key].latestClick = service.clickedAt
          }
        })
      }
    })

    // クリック数でソート
    return Object.values(clickStats).sort((a, b) => b.clickCount - a.clickCount)

  } catch (error) {
    console.error('❌ [V3 Database] Click stats error:', error)
    return []
  }
}

/**
 * V3診断統計を取得（管理画面用）
 */
export async function getV3DiagnosisStats(): Promise<{
  totalDiagnoses: number
  completedDiagnoses: number
  averageQuestions: number
  completionRate: number
  partialDiagnosisUsage: number
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('career_user_diagnosis_v3')
      .select('completed_questions, is_completed, partial_results')

    if (error) throw error

    const records = data || []
    const totalCount = records.length
    const completedCount = records.filter(r => r.is_completed).length
    const averageQuestions = totalCount > 0 
      ? records.reduce((sum, r) => sum + (r.completed_questions || 0), 0) / totalCount 
      : 0
    const partialDiagnosisCount = records.filter(r => 
      r.partial_results && Array.isArray(r.partial_results) && r.partial_results.length > 0
    ).length

    return {
      totalDiagnoses: totalCount,
      completedDiagnoses: completedCount,
      averageQuestions: Math.round(averageQuestions * 10) / 10,
      completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      partialDiagnosisUsage: Math.round((partialDiagnosisCount / Math.max(totalCount, 1)) * 100)
    }

  } catch (error) {
    console.error('❌ [V3 Database] Stats error:', error)
    return {
      totalDiagnoses: 0,
      completedDiagnoses: 0,
      averageQuestions: 0,
      completionRate: 0,
      partialDiagnosisUsage: 0
    }
  }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * デバイス情報を取得
 */
async function getDeviceInfo(): Promise<Record<string, any>> {
  // サーバーサイドでは空のオブジェクトを返す
  if (typeof window === 'undefined') {
    return {
      serverSide: true,
      timestamp: getJSTTimestamp()
    }
  }

  try {
    const deviceInfo: Record<string, any> = {
      userAgent: navigator?.userAgent || 'unknown',
      platform: navigator?.platform || 'unknown',
      language: navigator?.language || 'unknown',
      screenWidth: screen?.width || 0,
      screenHeight: screen?.height || 0,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: getJSTTimestamp()
    }

    // 追加の情報（利用可能な場合）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      deviceInfo.connection = {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink
      }
    }

    return deviceInfo

  } catch (error) {
    console.warn('デバイス情報取得エラー:', error)
    return {
      error: 'device_info_failed',
      timestamp: getJSTTimestamp()
    }
  }
}