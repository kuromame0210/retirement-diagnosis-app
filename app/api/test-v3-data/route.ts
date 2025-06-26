/**
 * V3テストデータ作成API
 */

import { saveV3DiagnosisData } from '@/lib/v3/database'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const testSessionId = `v3_test_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`
    
    // テストデータ作成
    const saveRequest = {
      sessionId: testSessionId,
      userId: 'test-user-001',
      q1_text: 'テスト回答です。現在の仕事についてはストレスを感じており、転職を検討中です。',
      q2_text: '上司からの無理な要求があった時にストレスを感じます。',
      q3_text: 'あまりモチベーションが湧かず、エネルギーも低い状態です。',
      questionNumber: 3,
      answerText: 'あまりモチベーションが湧かず、エネルギーも低い状態です。',
      currentStep: 4,
      completedQuestions: 3,
      isCompleted: false,
      partialDiagnosisHistory: [
        {
          diagnosedAt: new Date().toISOString(),
          answeredQuestions: 3,
          resultType: '転職検討型（暫定）',
          confidenceLevel: 'medium',
          summary: '3問時点での分析結果：ストレス症状とモチベーション低下が見られる',
          recommendations: ['ストレス要因の具体的な分析', '転職市場の調査開始']
        }
      ],
      updateType: 'partial_diagnosis' as const
    }
    
    const result = await saveV3DiagnosisData(saveRequest)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'テストデータが作成されました',
        sessionId: testSessionId,
        result: result
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ テストデータ作成エラー:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}