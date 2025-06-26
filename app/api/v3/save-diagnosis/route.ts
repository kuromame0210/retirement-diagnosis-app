/**
 * V3診断データ保存API
 * 
 * POST /api/v3/save-diagnosis
 * V3診断の進行状況・結果をSupabaseに保存
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveV3DiagnosisData } from '@/lib/v3/database'
import type { V3SaveRequest } from '@/lib/v3/database'

export async function POST(request: NextRequest) {
  try {
    const body: V3SaveRequest = await request.json()

    // 必須フィールドの検証
    if (!body.sessionId || !body.userId) {
      return NextResponse.json(
        { error: 'sessionId and userId are required' },
        { status: 400 }
      )
    }

    // updateTypeの検証（answer_updateを追加）
    const validUpdateTypes = ['progress_update', 'partial_diagnosis', 'final_completed', 'click_only', 'answer_update']
    if (!validUpdateTypes.includes(body.updateType)) {
      return NextResponse.json(
        { error: `Invalid updateType: ${body.updateType}. Valid types: ${validUpdateTypes.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('📝 [V3 Save API] Request:', {
      sessionId: body.sessionId,
      updateType: body.updateType,
      completedQuestions: body.completedQuestions,
      isCompleted: body.isCompleted,
      hasPartialHistory: !!body.partialDiagnosisHistory?.length,
      hasFinalResult: !!body.finalResult,
      clickedServicesCount: body.clickedServices?.length || 0
    })

    // データベースに保存
    const result = await saveV3DiagnosisData(body)

    if (!result.success) {
      console.error('❌ [V3 Save API] Database save failed:', result.error)
      return NextResponse.json(
        { error: result.error || 'Database save failed' },
        { status: 500 }
      )
    }

    console.log('✅ [V3 Save API] Success:', {
      id: result.id,
      message: result.message
    })

    return NextResponse.json({
      success: true,
      id: result.id,
      message: result.message
    })

  } catch (error) {
    console.error('❌ [V3 Save API] Unexpected error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/v3/save-diagnosis?sessionId=xxx
// 特定のセッションデータを取得（デバッグ用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId parameter is required' },
        { status: 400 }
      )
    }

    const { getV3DiagnosisData } = await import('@/lib/v3/database')
    const data = await getV3DiagnosisData(sessionId)

    if (!data) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ [V3 Save API] GET error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}