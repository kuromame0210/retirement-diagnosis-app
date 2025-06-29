/**
 * V3段階的診断API
 * Phase 1: Haiku即時診断 → Phase 2: Sonnet詳細パーソナル診断
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  executeQuickDiagnosis, 
  executeDetailedPersonalDiagnosis,
  StagedDiagnosisRequest 
} from '@/lib/v3/staged-diagnosis'
import { v3ServiceEngine } from '@/lib/v3/serviceRecommendation'
import { getV3Session } from '@/lib/v3/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phase, ...diagnosisRequest } = body
    
    // リクエスト検証
    if (!diagnosisRequest.sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    // 有効な回答があるかチェック
    const answers = [
      diagnosisRequest.q1_text,
      diagnosisRequest.q2_text, 
      diagnosisRequest.q3_text,
      diagnosisRequest.q4_text,
      diagnosisRequest.q5_text,
      diagnosisRequest.q6_text,
      diagnosisRequest.q7_text,
      diagnosisRequest.q8_text,
      diagnosisRequest.q9_text,
      diagnosisRequest.q10_text
    ].filter(answer => answer && answer.trim().length > 0)
    
    if (answers.length === 0) {
      return NextResponse.json(
        { error: 'At least one answer is required' },
        { status: 400 }
      )
    }
    
    diagnosisRequest.answeredQuestions = answers.length
    
    console.log(`📊 [Staged Diagnosis API] Phase: ${phase}, Answers: ${answers.length}`)
    
    // Phase別実行
    let result
    let processingTime
    const startTime = Date.now()
    
    switch (phase) {
      case 'quick':
        result = await executeQuickDiagnosis(diagnosisRequest as StagedDiagnosisRequest)
        processingTime = Date.now() - startTime
        console.log(`⚡ [Quick Diagnosis] 完了: ${processingTime}ms`)
        break
        
      case 'detailed':
        result = await executeDetailedPersonalDiagnosis(diagnosisRequest as StagedDiagnosisRequest)
        
        // サービス推薦を生成
        try {
          console.log(`🎯 [Service Recommendation] 生成開始...`)
          const serviceStartTime = Date.now()
          
          const sessionData = getV3Session()
          const recommendations = await v3ServiceEngine.generateRecommendations(sessionData)
          
          const serviceProcessingTime = Date.now() - serviceStartTime
          console.log(`✅ [Service Recommendation] 完了: ${serviceProcessingTime}ms, ${recommendations.length}件`)
          
          // 診断結果にサービス推薦を追加
          result.service_recommendations = recommendations
          
        } catch (serviceError) {
          console.error('⚠️ [Service Recommendation] エラー:', serviceError)
          // サービス推薦エラーは診断結果に影響しない
          result.service_recommendations = []
        }
        
        processingTime = Date.now() - startTime
        console.log(`🎯 [Detailed Personal Diagnosis] 完了: ${processingTime}ms`)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid phase. Must be "quick" or "detailed"' },
          { status: 400 }
        )
    }
    
    return NextResponse.json({
      success: true,
      result,
      metadata: {
        processing_time_ms: processingTime,
        phase,
        answered_questions: answers.length,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ [Staged Diagnosis API] Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// CORS対応
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}