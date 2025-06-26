/**
 * V3最終診断API（カラムベース版）
 * 
 * POST /api/v3/final-diagnosis
 * 全回答に基づいて最終診断を実行
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeV3Diagnosis } from '@/lib/v3/ai-diagnosis'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, partialDiagnosisHistory } = body

    if (!sessionId) {
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

    // 最終診断の実行可能性をチェック
    if (answeredCount < 2) {
      return NextResponse.json(
        { error: 'Final diagnosis requires at least 2 answers' },
        { status: 400 }
      )
    }

    console.log('🎯 [V3 Final Diagnosis] Request:', {
      sessionId,
      answeredQuestions: answeredCount,
      partialDiagnosisCount: partialDiagnosisHistory?.length || 0,
      diagnosisType: answeredCount >= 10 ? 'complete' : 'early'
    })

    // AI診断を実行（最終診断）
    const diagnosisRequest = {
      ...answers,
      diagnosisType: 'final' as const,
      answeredQuestions: answeredCount,
      sessionId
    }

    const diagnosisResult = await executeV3Diagnosis(diagnosisRequest)

    // レスポンス形式を統一
    const finalResult = {
      resultType: diagnosisResult.result_type,
      confidenceLevel: diagnosisResult.confidence_level,
      urgencyLevel: diagnosisResult.urgency_level,
      summary: diagnosisResult.summary,
      detailedAnalysis: {
        emotionalState: {
          status: diagnosisResult.detailed_analysis.emotional_state,
          description: diagnosisResult.detailed_analysis.emotional_state
        },
        careerGoals: {
          clarity: diagnosisResult.detailed_analysis.future_outlook,
          description: diagnosisResult.detailed_analysis.future_outlook
        },
        stressFactors: {
          level: diagnosisResult.urgency_level,
          sources: diagnosisResult.detailed_analysis.stress_factors
        },
        workValues: {
          primary: diagnosisResult.detailed_analysis.work_environment,
          secondary: []
        },
        actionReadiness: {
          level: diagnosisResult.urgency_level,
          barriers: diagnosisResult.detailed_analysis.career_concerns
        }
      },
      comprehensiveAdvice: diagnosisResult.summary,
      actionPlan: [
        ...diagnosisResult.action_plan.immediate_actions,
        ...diagnosisResult.action_plan.short_term_goals,
        ...diagnosisResult.action_plan.long_term_goals
      ],
      riskAssessment: {
        level: diagnosisResult.urgency_level,
        factors: diagnosisResult.detailed_analysis.stress_factors
      },
      opportunityAnalysis: {
        potential: diagnosisResult.confidence_level,
        areas: diagnosisResult.action_plan.long_term_goals
      },
      serviceRecommendations: diagnosisResult.service_recommendations.map(rec => ({
        id: rec.category,
        name: getServiceName(rec.category),
        description: rec.reason,
        category: rec.category,
        priority: rec.priority
      })),
      longTermStrategy: diagnosisResult.action_plan.long_term_goals.join(' '),
      nextStepsTimeline: [
        {
          timeframe: '今週中',
          actions: diagnosisResult.action_plan.immediate_actions.slice(0, 2)
        },
        {
          timeframe: '今月中',
          actions: diagnosisResult.action_plan.short_term_goals.slice(0, 2)
        },
        {
          timeframe: '3ヶ月以内',
          actions: diagnosisResult.action_plan.long_term_goals.slice(0, 2)
        }
      ]
    }

    console.log('✅ [V3 Final Diagnosis] Success:', {
      sessionId,
      resultType: finalResult.resultType,
      urgencyLevel: finalResult.urgencyLevel,
      serviceRecommendationsCount: finalResult.serviceRecommendations.length
    })

    return NextResponse.json({
      success: true,
      result: finalResult,
      metadata: {
        answeredQuestions: answeredCount,
        totalQuestions: 10,
        analysisCompleteness: answeredCount >= 7 ? 'comprehensive' : 'basic',
        processingTime: new Date().toISOString(),
        diagnosisVersion: diagnosisResult.diagnosis_version
      }
    })

  } catch (error) {
    console.error('❌ [V3 Final Diagnosis] Error:', error)
    
    // フォールバック診断結果
    const fallbackResult = {
      resultType: '診断エラー',
      confidenceLevel: 'low' as const,
      urgencyLevel: 'medium' as const,
      summary: '申し訳ございません。診断システムに一時的な問題が発生しています。お手数ですが、しばらく待ってから再度お試しください。',
      detailedAnalysis: {
        emotionalState: { status: 'エラー', description: '分析できませんでした' },
        careerGoals: { clarity: 'エラー', description: '分析できませんでした' },
        stressFactors: { level: 'エラー', sources: [] },
        workValues: { primary: 'エラー', secondary: [] },
        actionReadiness: { level: 'エラー', barriers: [] }
      },
      comprehensiveAdvice: '技術的な問題により診断を完了できませんでした。',
      actionPlan: ['システム復旧後に再度診断をお試しください'],
      riskAssessment: { level: 'unknown', factors: [] },
      opportunityAnalysis: { potential: 'unknown', areas: [] },
      serviceRecommendations: [],
      longTermStrategy: '診断完了後に詳細な戦略をご提案いたします',
      nextStepsTimeline: []
    }

    return NextResponse.json({
      success: false,
      result: fallbackResult,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * サービスカテゴリから名前を取得
 */
function getServiceName(category: string): string {
  const serviceNames = {
    'transfer_agent': '転職エージェントサービス',
    'skill_up': 'スキルアップ支援',
    'career_counseling': 'キャリアカウンセリング',
    'stress_management': 'ストレス管理サポート'
  }
  
  return serviceNames[category] || 'キャリア支援サービス'
}

