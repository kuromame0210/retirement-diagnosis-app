/**
 * V3診断システム - セッション管理
 * 
 * SessionStorageベースのV3診断セッション管理
 * V1(localStorage)、V2(sessionStorage)に続くV3専用実装
 */

import { getJSTTimestamp } from '@/lib/utils/timestamp'

// ============================================
// V3セッション型定義
// ============================================

export interface V3Session {
  sessionId: string
  userId: string
  version: 'v3'
  
  // 診断進行状況
  currentStep: number
  totalQuestions: number
  completedQuestions: number
  isCompleted: boolean
  
  // 回答データ
  textAnswers: Record<string, V3Answer>
  
  // 診断結果履歴
  partialDiagnosisHistory: V3PartialResult[]
  finalResult?: V3FinalResult
  
  // サービスクリック履歴
  clickedServices: V3ClickedService[]
  
  // タイムスタンプ
  startedAt: string
  updatedAt: string
  completedAt?: string
}

export interface V3Answer {
  questionId: string
  question: string
  answer: string
  answeredAt: string
  characterCount: number
}

export interface V3PartialResult {
  diagnosedAt: string
  answeredQuestions: number
  confidenceLevel: 'low' | 'medium' | 'high'
  resultType: string
  summary: string
  recommendations: string[]
}

export interface V3FinalResult {
  diagnosedAt: string
  resultType: string
  confidenceLevel: 'high'
  urgencyLevel: 'low' | 'medium' | 'high'
  summary: string
  detailedAnalysis: Record<string, any>
  actionPlan: string[]
  serviceRecommendations: any[]
}

export interface V3ClickedService {
  serviceId: string
  serviceName: string
  serviceUrl: string
  clickedAt: string
  diagnosisStage: string // 'partial_N' or 'final'
  resultTypeWhenClicked?: string
}

// ============================================
// セッション管理関数
// ============================================

const V3_SESSION_KEY = 'v3_diagnosis_session'

/**
 * V3セッションを取得（存在しない場合は新規作成）
 */
export function getV3Session(): V3Session {
  if (typeof window === 'undefined') {
    // SSR環境では新規セッションを返す
    return createNewV3Session()
  }

  try {
    const stored = sessionStorage.getItem(V3_SESSION_KEY)
    if (stored) {
      const session = JSON.parse(stored) as V3Session
      // バージョンチェック
      if (session.version === 'v3' && session.sessionId) {
        return session
      }
    }
  } catch (error) {
    console.warn('V3セッション読み込みエラー:', error)
  }

  // 新規セッション作成
  const newSession = createNewV3Session()
  saveV3Session(newSession)
  return newSession
}

/**
 * V3セッションを保存
 */
export function saveV3Session(session: Partial<V3Session> | V3Session): void {
  if (typeof window === 'undefined') return

  try {
    let updatedSession: V3Session
    
    // 完全なセッションオブジェクトの場合はそのまま保存
    if ('sessionId' in session && 'userId' in session && 'version' in session) {
      updatedSession = session as V3Session
    } else {
      // 部分的な更新の場合は既存セッションとマージ
      const stored = sessionStorage.getItem(V3_SESSION_KEY)
      let currentSession: V3Session
      
      if (stored) {
        try {
          currentSession = JSON.parse(stored) as V3Session
        } catch {
          currentSession = createNewV3Session()
        }
      } else {
        currentSession = createNewV3Session()
      }
      
      updatedSession = {
        ...currentSession,
        ...session,
        updatedAt: getJSTTimestamp()
      }
    }

    sessionStorage.setItem(V3_SESSION_KEY, JSON.stringify(updatedSession))
  } catch (error) {
    console.error('V3セッション保存エラー:', error)
  }
}

/**
 * 新規V3セッションを作成
 */
function createNewV3Session(): V3Session {
  const timestamp = getJSTTimestamp()
  
  return {
    sessionId: `v3_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    userId: `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    version: 'v3',
    currentStep: 1,
    totalQuestions: 10,
    completedQuestions: 0,
    isCompleted: false,
    textAnswers: {},
    partialDiagnosisHistory: [],
    clickedServices: [],
    startedAt: timestamp,
    updatedAt: timestamp
  }
}

/**
 * 回答を追加
 */
export function addV3Answer(questionId: string, question: string, answer: string): void {
  const session = getV3Session()
  const timestamp = getJSTTimestamp()

  const answerData: V3Answer = {
    questionId,
    question,
    answer: answer.trim(),
    answeredAt: timestamp,
    characterCount: answer.trim().length
  }

  const updatedAnswers = {
    ...session.textAnswers,
    [questionId]: answerData
  }

  const completedCount = Object.keys(updatedAnswers).length

  saveV3Session({
    textAnswers: updatedAnswers,
    completedQuestions: completedCount,
    currentStep: Math.min(completedCount + 1, session.totalQuestions),
    isCompleted: completedCount >= session.totalQuestions
  })
}

/**
 * 途中診断結果を追加
 */
export function addV3PartialResult(result: Omit<V3PartialResult, 'diagnosedAt'>): void {
  const session = getV3Session()
  const timestamp = getJSTTimestamp()

  const partialResult: V3PartialResult = {
    ...result,
    diagnosedAt: timestamp
  }

  const updatedHistory = [...session.partialDiagnosisHistory, partialResult]

  saveV3Session({
    partialDiagnosisHistory: updatedHistory
  })
}

/**
 * 最終診断結果を設定
 */
export function setV3FinalResult(result: Omit<V3FinalResult, 'diagnosedAt'>): void {
  const session = getV3Session()
  const timestamp = getJSTTimestamp()

  const finalResult: V3FinalResult = {
    ...result,
    diagnosedAt: timestamp
  }

  saveV3Session({
    finalResult,
    completedAt: timestamp,
    isCompleted: true
  })
}

/**
 * サービスクリックを記録
 */
export function addV3ClickedService(
  serviceId: string,
  serviceName: string,
  serviceUrl: string,
  diagnosisStage: string,
  resultType?: string
): void {
  const session = getV3Session()
  const timestamp = getJSTTimestamp()

  // 重複チェック（同じサービスの重複クリックは許可）
  const clickedService: V3ClickedService = {
    serviceId,
    serviceName,
    serviceUrl,
    clickedAt: timestamp,
    diagnosisStage,
    resultTypeWhenClicked: resultType
  }

  const updatedClickedServices = [...session.clickedServices, clickedService]

  saveV3Session({
    clickedServices: updatedClickedServices
  })
}

/**
 * セッションをクリア
 */
export function clearV3Session(): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(V3_SESSION_KEY)
  } catch (error) {
    console.error('V3セッションクリアエラー:', error)
  }
}

/**
 * 回答の進行状況を取得
 */
export function getV3ProgressInfo() {
  const session = getV3Session()
  
  return {
    currentStep: session.currentStep,
    completedQuestions: session.completedQuestions,
    totalQuestions: session.totalQuestions,
    progressPercentage: Math.round((session.completedQuestions / session.totalQuestions) * 100),
    isCompleted: session.isCompleted,
    canDiagnose: session.completedQuestions >= 1,
    hasPartialDiagnosis: session.partialDiagnosisHistory.length > 0,
    hasFinalResult: !!session.finalResult
  }
}

/**
 * セッションをサーバーに同期
 */
export async function syncV3SessionToServer(): Promise<{ success: boolean; error?: string }> {
  const session = getV3Session()

  try {
    // textAnswersをカラムベース形式に変換
    const columnBasedAnswers: Record<string, any> = {}
    Object.entries(session.textAnswers).forEach(([key, answer]) => {
      columnBasedAnswers[key] = answer.answer
    })

    console.log('🔍 [Session Sync] 送信データ:', {
      sessionId: session.sessionId,
      userId: session.userId,
      answersCount: Object.keys(session.textAnswers).length,
      columnBasedAnswers,
      updateType: session.isCompleted ? 'final_completed' : 'progress_update'
    })

    const response = await fetch('/api/v3/save-diagnosis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId: session.sessionId,
        userId: session.userId,
        // カラムベース形式で送信
        ...columnBasedAnswers,
        partialDiagnosisHistory: session.partialDiagnosisHistory,
        finalResult: session.finalResult,
        clickedServices: session.clickedServices,
        currentStep: session.currentStep,
        completedQuestions: session.completedQuestions,
        isCompleted: session.isCompleted,
        updateType: session.isCompleted ? 'final_completed' : 'progress_update'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ [Session Sync] API エラー:', response.status, errorText)
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ [Session Sync] 成功:', result)
    return { success: true }

  } catch (error) {
    console.error('❌ [Session Sync] V3セッション同期エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * デバッグ用：セッション情報を表示
 */
export function debugV3Session(): void {
  if (typeof window === 'undefined') return

  const session = getV3Session()
  console.log('🔍 [V3 Session Debug]', {
    sessionId: session.sessionId,
    userId: session.userId,
    progress: `${session.completedQuestions}/${session.totalQuestions}`,
    isCompleted: session.isCompleted,
    partialDiagnosisCount: session.partialDiagnosisHistory.length,
    hasFinalResult: !!session.finalResult,
    clickedServicesCount: session.clickedServices.length,
    lastUpdated: session.updatedAt
  })
}