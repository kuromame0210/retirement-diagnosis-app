/**
 * V3途中診断API（カラムベース版）
 * 
 * POST /api/v3/partial-diagnosis
 * 現在の回答に基づいて途中診断を実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeV3Diagnosis } from '@/lib/v3/ai-diagnosis'
import { executeFastV3Diagnosis } from '@/lib/v3/fast-diagnosis'
import { getPartialDiagnosisConfig } from '@/lib/v3/questions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    console.log('🔍 [V3 API Debug] Received request body:', body)
    console.log('🔍 [V3 API Debug] sessionId:', sessionId)
    console.log('🔍 [V3 API Debug] Body keys:', Object.keys(body))

    if (!sessionId) {
      console.error('❌ [V3 API] Missing sessionId in request:', body)
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // カラムベースの回答データを取得
    const answers = {
      q1_text: body.q1_text,
      q2_text: body.q2_text,
      q3_text: body.q3_text,
      q4_text: body.q4_text,
      q5_text: body.q5_text,
      q6_text: body.q6_text,
      q7_text: body.q7_text,
      q8_text: body.q8_text,
      q9_text: body.q9_text,
      q10_text: body.q10_text
    }

    // 回答済み質問数をカウント
    const answeredCount = Object.values(answers).filter(answer => 
      answer && typeof answer === 'string' && answer.trim().length > 0
    ).length

    // 受信した有効な回答をログ出力
    const validAnswers = Object.entries(answers).filter(([key, value]) => 
      value && typeof value === 'string' && value.trim().length > 0
    )
    
    console.log('🔍 [V3 API Debug] Valid answers received:', validAnswers)
    console.log('🔍 [V3 API Debug] Valid answer count:', answeredCount)

    if (answeredCount < 1) {
      console.error('❌ [V3 API] No valid answers received. Body:', body)
      return NextResponse.json(
        { 
          error: 'At least 1 question must be answered',
          details: {
            receivedKeys: Object.keys(body),
            validAnswerCount: answeredCount,
            allAnswers: answers
          }
        },
        { status: 400 }
      )
    }

    console.log('🔍 [V3 Partial Diagnosis] Request:', {
      sessionId,
      answeredQuestions: answeredCount
    })

    // 高速AI診断を実行（10秒以内保証）
    const diagnosisRequest = {
      ...answers,
      diagnosisType: 'partial' as const,
      answeredQuestions: answeredCount,
      sessionId
    }

    console.log('⚡ [V3 Fast Diagnosis] 高速診断開始')
    const startTime = Date.now()
    
    // 高速診断システムを使用
    const diagnosisResult = await executeFastV3Diagnosis(diagnosisRequest)
    
    const endTime = Date.now()
    console.log(`🚀 [V3 Fast Diagnosis] 完了 (${endTime - startTime}ms)`)
    const partialConfig = getPartialDiagnosisConfig(answeredCount)

    // レスポンス形式を統一
    const response = {
      answeredQuestions: answeredCount,
      confidenceLevel: diagnosisResult.confidence_level,
      accuracyPercentage: partialConfig.accuracyPercentage,
      resultType: diagnosisResult.result_type,
      urgencyLevel: diagnosisResult.urgency_level,
      summary: diagnosisResult.summary,
      keyInsights: [
        diagnosisResult.detailed_analysis.emotional_state,
        ...diagnosisResult.detailed_analysis.stress_factors,
        diagnosisResult.detailed_analysis.motivation_level
      ].filter(insight => insight && insight !== '分析中'),
      recommendations: diagnosisResult.action_plan.immediate_actions,
      nextStepAdvice: answeredCount < 10 ? 
        '残りの質問にお答えいただくと、より詳細で精度の高い診断結果をご提供できます。' : 
        '全ての質問にお答えいただき、ありがとうございます。',
      missingInsights: answeredCount < 10 ? [
        'より詳細なストレス要因の分析',
        'キャリア目標との整合性',
        '具体的な行動計画の策定'
      ] : []
    }

    console.log('✅ [V3 Partial Diagnosis] Success:', {
      sessionId,
      resultType: response.resultType,
      confidenceLevel: response.confidenceLevel,
      urgencyLevel: response.urgencyLevel
    })

    return NextResponse.json({
      success: true,
      result: response,
      metadata: {
        answeredQuestions: answeredCount,
        totalQuestions: 10,
        confidenceLevel: partialConfig.confidenceLevel,
        canContinue: answeredCount < 10,
        diagnosisVersion: diagnosisResult.diagnosis_version
      }
    })

  } catch (error) {
    console.error('❌ [V3 Partial Diagnosis] Error:', error)
    
    // フォールバック診断結果
    const fallbackResult = {
      answeredQuestions: 0,
      confidenceLevel: 'low' as const,
      accuracyPercentage: '30-40%',
      resultType: '診断エラー',
      urgencyLevel: 'medium' as const,
      summary: '申し訳ございません。現在診断システムに一時的な問題が発生しています。しばらく待ってから再度お試しください。',
      keyInsights: ['システムエラーのため分析できませんでした'],
      recommendations: ['時間をおいて再度診断をお試しください'],
      nextStepAdvice: '技術的な問題が解決するまでお待ちください',
      missingInsights: []
    }

    return NextResponse.json({
      success: false,
      result: fallbackResult,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

