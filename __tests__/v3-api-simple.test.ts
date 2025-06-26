/**
 * V3 API 簡易テスト
 * カラムベース版APIの基本動作確認
 */

// 環境変数をモック
process.env.ANTHROPIC_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

// fetchをモック
global.fetch = jest.fn()

// AI診断機能のテスト
describe('V3 AI Diagnosis Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  test('executeV3Diagnosis function should work', async () => {
    // Claude API レスポンスをモック
    const mockClaudeResponse = {
      result_type: '転職検討型',
      confidence_level: 'medium',
      urgency_level: 'medium',
      summary: 'テスト診断結果です',
      detailed_analysis: {
        emotional_state: 'ストレス状態',
        stress_factors: ['テストストレス'],
        motivation_level: '低下',
        career_concerns: ['テスト不安'],
        work_environment: 'テスト環境',
        future_outlook: 'テスト見通し'
      },
      action_plan: {
        immediate_actions: ['テストアクション'],
        short_term_goals: ['テスト短期目標'],
        long_term_goals: ['テスト長期目標']
      },
      service_recommendations: [{
        category: 'career_counseling',
        priority: 'high',
        reason: 'テスト推奨理由'
      }]
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: JSON.stringify(mockClaudeResponse) }]
      })
    })

    const { executeV3Diagnosis } = await import('@/lib/v3/ai-diagnosis')
    
    const diagnosisRequest = {
      q1_text: 'テスト回答1',
      q2_text: 'テスト回答2',
      diagnosisType: 'partial' as const,
      answeredQuestions: 2,
      sessionId: 'test-session'
    }

    const result = await executeV3Diagnosis(diagnosisRequest)

    expect(result.result_type).toBe('転職検討型')
    expect(result.confidence_level).toBe('medium')
    expect(result.detailed_analysis.emotional_state).toBe('ストレス状態')
    expect(result.action_plan.immediate_actions).toContain('テストアクション')
    expect(result.service_recommendations).toHaveLength(1)
    expect(result.diagnosed_at).toBeDefined()
    expect(result.diagnosis_version).toBe('v3.1')
  })

  test('executeV3Diagnosis should handle API errors gracefully', async () => {
    // API エラーをシミュレート
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    const { executeV3Diagnosis } = await import('@/lib/v3/ai-diagnosis')
    
    const diagnosisRequest = {
      q1_text: 'テスト回答',
      diagnosisType: 'partial' as const,
      answeredQuestions: 1,
      sessionId: 'test-session'
    }

    const result = await executeV3Diagnosis(diagnosisRequest)

    // フォールバック結果が返される
    expect(result.result_type).toBe('現職改善型')
    expect(result.confidence_level).toBe('low')
    expect(result.summary).toContain('システムエラー')
    expect(result.diagnosis_version).toBe('v3.1-fallback')
  })

  test('executeV3Diagnosis should handle malformed API response', async () => {
    // 不正なレスポンスをシミュレート
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: 'invalid json response' }]
      })
    })

    const { executeV3Diagnosis } = await import('@/lib/v3/ai-diagnosis')
    
    const diagnosisRequest = {
      q1_text: 'テスト回答',
      diagnosisType: 'final' as const,
      answeredQuestions: 1,
      sessionId: 'test-session'
    }

    const result = await executeV3Diagnosis(diagnosisRequest)

    // フォールバック結果が返される
    expect(result.result_type).toBe('現職改善型')
    expect(result.confidence_level).toBe('low')
    expect(result.diagnosis_version).toBe('v3.1-fallback')
  })
})

// データベース機能のテスト
describe('V3 Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  test('saveV3DiagnosisData should construct column-based record', async () => {
    // Supabase API レスポンスをモック
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        // 既存レコード確認 (存在しない)
        ok: true,
        json: () => Promise.resolve({
          data: null,
          error: { code: 'PGRST116' }
        })
      })
      .mockResolvedValueOnce({
        // 新規挿入
        ok: true,
        json: () => Promise.resolve({
          data: [{ id: 'test-id-123' }],
          error: null
        })
      })

    const { saveV3DiagnosisData } = await import('@/lib/v3/database')
    
    const saveRequest = {
      sessionId: 'test-session-123',
      userId: 'test-user-123',
      questionNumber: 1,
      answerText: 'テスト回答です',
      currentStep: 2,
      completedQuestions: 1,
      isCompleted: false,
      updateType: 'answer_update' as const
    }

    const result = await saveV3DiagnosisData(saveRequest)

    expect(result.success).toBe(true)
    expect(result.id).toBe('test-id-123')
    expect(result.message).toContain('作成')
    
    // fetchが2回呼ばれることを確認 (select + insert)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  test('saveV3DiagnosisData should handle update existing record', async () => {
    // 既存レコードありのモック
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        // 既存レコード確認 (存在する)
        ok: true,
        json: () => Promise.resolve({
          data: { id: 'existing-id', created_at: '2025-01-01' },
          error: null
        })
      })
      .mockResolvedValueOnce({
        // 更新
        ok: true,
        json: () => Promise.resolve({
          data: [{ id: 'existing-id' }],
          error: null
        })
      })

    const { saveV3DiagnosisData } = await import('@/lib/v3/database')
    
    const saveRequest = {
      sessionId: 'existing-session',
      userId: 'test-user-123',
      q1_text: '更新されたテスト回答',
      currentStep: 2,
      completedQuestions: 1,
      isCompleted: false,
      updateType: 'progress_update' as const
    }

    const result = await saveV3DiagnosisData(saveRequest)

    expect(result.success).toBe(true)
    expect(result.id).toBe('existing-id')
    expect(result.message).toContain('更新')
  })

  test('saveV3DiagnosisData should handle database errors', async () => {
    // データベースエラーをシミュレート
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: null,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Connection failed'
        }
      })
    })

    const { saveV3DiagnosisData } = await import('@/lib/v3/database')
    
    const saveRequest = {
      sessionId: 'test-session',
      userId: 'test-user',
      currentStep: 1,
      completedQuestions: 0,
      isCompleted: false,
      updateType: 'progress_update' as const
    }

    const result = await saveV3DiagnosisData(saveRequest)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ユーティリティ関数のテスト
describe('V3 Utility Functions', () => {
  test('getDiagnosisTypeDescription should return correct descriptions', async () => {
    const { getDiagnosisTypeDescription } = await import('@/lib/v3/ai-diagnosis')

    expect(getDiagnosisTypeDescription('転職推奨型')).toContain('転職を積極的に推奨')
    expect(getDiagnosisTypeDescription('転職検討型')).toContain('転職を含めた選択肢を検討')
    expect(getDiagnosisTypeDescription('現職改善型')).toContain('現在の職場での課題解決')
    expect(getDiagnosisTypeDescription('様子見型')).toContain('しばらく様子を見る')
    expect(getDiagnosisTypeDescription('要注意型')).toContain('メンタルヘルス面でのケア')
    expect(getDiagnosisTypeDescription('unknown')).toContain('後日提供')
  })

  test('getUrgencyLevelDescription should return correct descriptions', async () => {
    const { getUrgencyLevelDescription } = await import('@/lib/v3/ai-diagnosis')

    expect(getUrgencyLevelDescription('low')).toContain('すぐに行動する必要はありません')
    expect(getUrgencyLevelDescription('medium')).toContain('3-6ヶ月以内')
    expect(getUrgencyLevelDescription('high')).toContain('可能な限り早急に')
    expect(getUrgencyLevelDescription('unknown')).toContain('適切なタイミング')
  })
})

// 質問管理のテスト
describe('V3 Questions Management', () => {
  test('V3_QUESTIONS should have correct q1_text format', async () => {
    const { V3_QUESTIONS } = await import('@/lib/v3/questions')

    expect(V3_QUESTIONS).toHaveLength(10)
    expect(V3_QUESTIONS[0].id).toBe('q1_text')
    expect(V3_QUESTIONS[1].id).toBe('q2_text')
    expect(V3_QUESTIONS[9].id).toBe('q10_text')

    // 全ての質問がq{number}_text形式であることを確認
    V3_QUESTIONS.forEach((q, index) => {
      expect(q.id).toBe(`q${index + 1}_text`)
      expect(q.order).toBe(index + 1)
      expect(q.question).toBeDefined()
      expect(q.placeholder).toBeDefined()
    })
  })

  test('getQuestionById should return correct question', async () => {
    const { getQuestionById } = await import('@/lib/v3/questions')

    const q1 = getQuestionById('q1_text')
    expect(q1).toBeDefined()
    expect(q1?.order).toBe(1)
    expect(q1?.id).toBe('q1_text')

    const nonExistent = getQuestionById('invalid_id')
    expect(nonExistent).toBeUndefined()
  })

  test('getPartialDiagnosisConfig should return appropriate config', async () => {
    const { getPartialDiagnosisConfig } = await import('@/lib/v3/questions')

    const config1 = getPartialDiagnosisConfig(1)
    expect(config1.confidenceLevel).toBe('low')
    expect(config1.accuracyPercentage).toBe('30-40%')

    const config5 = getPartialDiagnosisConfig(5)
    expect(config5.confidenceLevel).toBe('medium')
    expect(config5.accuracyPercentage).toBe('60-70%')

    const config8 = getPartialDiagnosisConfig(8)
    expect(config8.confidenceLevel).toBe('high')
    expect(config8.accuracyPercentage).toBe('80-90%')

    const config10 = getPartialDiagnosisConfig(10)
    expect(config10.confidenceLevel).toBe('high')
    expect(config10.accuracyPercentage).toBe('95%+')
  })
})

// 統合テスト
describe('V3 System Integration', () => {
  test('Full workflow should work together', async () => {
    // 1. 質問データの確認
    const { V3_QUESTIONS, getQuestionById } = await import('@/lib/v3/questions')
    const q1 = getQuestionById('q1_text')
    expect(q1).toBeDefined()

    // 2. AI診断の実行
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        content: [{ text: JSON.stringify({
          result_type: '転職検討型',
          confidence_level: 'medium',
          urgency_level: 'medium',
          summary: '統合テスト成功',
          detailed_analysis: {
            emotional_state: 'テスト',
            stress_factors: [],
            motivation_level: 'テスト',
            career_concerns: [],
            work_environment: 'テスト',
            future_outlook: 'テスト'
          },
          action_plan: {
            immediate_actions: [],
            short_term_goals: [],
            long_term_goals: []
          },
          service_recommendations: []
        }) }]
      })
    })

    const { executeV3Diagnosis } = await import('@/lib/v3/ai-diagnosis')
    const diagnosisResult = await executeV3Diagnosis({
      q1_text: '統合テスト回答',
      diagnosisType: 'partial',
      answeredQuestions: 1,
      sessionId: 'integration-test'
    })

    expect(diagnosisResult.result_type).toBe('転職検討型')

    // 3. データベース保存のシミュレート
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'integration-test-id' }], error: null })
      })

    const { saveV3DiagnosisData } = await import('@/lib/v3/database')
    const saveResult = await saveV3DiagnosisData({
      sessionId: 'integration-test',
      userId: 'integration-user',
      q1_text: '統合テスト回答',
      currentStep: 2,
      completedQuestions: 1,
      isCompleted: false,
      updateType: 'answer_update'
    })

    expect(saveResult.success).toBe(true)
    expect(saveResult.id).toBe('integration-test-id')
  })
})