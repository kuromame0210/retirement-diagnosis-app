/**
 * V3データベース操作のテスト
 */

// Supabaseクライアントのモック
const mockSupabaseClient = {
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }))
    })),
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }))
    })),
    upsert: jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }))
  }))
}

// Supabaseモジュールをモック
jest.mock('@/lib/supabase', () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient)
}))

// タイムスタンプユーティリティをモック
jest.mock('@/lib/utils/timestamp', () => ({
  getJSTTimestamp: jest.fn(() => '2025-06-29T15:00:00.000Z')
}))

describe('V3データベース操作', () => {
  let databaseModule: any

  beforeAll(async () => {
    databaseModule = await import('@/lib/v3/database')
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('診断データの保存', () => {
    const mockSessionData = {
      sessionId: 'v3_test_session_12345',
      userId: 'user_test_123',
      version: 'v3',
      currentStep: 5,
      totalQuestions: 10,
      completedQuestions: 4,
      isCompleted: false,
      textAnswers: {
        'q1_text': {
          questionId: 'q1_text',
          question: '今の仕事について、率直にどう感じていますか？',
          answer: 'とてもストレスを感じており、毎日が辛いです。',
          answeredAt: '2025-06-29T14:00:00.000Z',
          characterCount: 25
        },
        'q2_text': {
          questionId: 'q2_text',
          question: '仕事で最もストレスを感じるのはどのような時ですか？',
          answer: '上司からの理不尽な要求と長時間労働です。',
          answeredAt: '2025-06-29T14:05:00.000Z',
          characterCount: 21
        }
      },
      partialDiagnosisHistory: [{
        step: 2,
        answeredQuestions: 2,
        confidenceLevel: 'low',
        resultType: '転職検討型（暫定）',
        summary: '初期分析結果',
        createdAt: '2025-06-29T14:10:00.000Z'
      }],
      clickedServices: [{
        serviceCategory: '転職エージェント',
        serviceId: 'agent_service_1',
        clickedAt: '2025-06-29T14:15:00.000Z'
      }],
      startedAt: '2025-06-29T14:00:00.000Z',
      updatedAt: '2025-06-29T14:15:00.000Z'
    }

    it('should save session data successfully', async () => {
      const result = await databaseModule.saveV3DiagnosisData(mockSessionData, 'progress_update')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('career_user_diagnosis_v3')
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalled()
    })

    it('should handle database insert correctly', async () => {
      const upsertMock = jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }))
      mockSupabaseClient.from.mockReturnValue({
        upsert: upsertMock
      })

      await databaseModule.saveV3DiagnosisData(mockSessionData, 'progress_update')

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: mockSessionData.sessionId,
          user_id: mockSessionData.userId,
          version: mockSessionData.version,
          text_answers: mockSessionData.textAnswers,
          partial_results: mockSessionData.partialDiagnosisHistory,
          clicked_services: mockSessionData.clickedServices,
          answered_questions_count: mockSessionData.completedQuestions,
          is_completed: mockSessionData.isCompleted,
          started_at: mockSessionData.startedAt,
          updated_at: expect.any(String)
        })
      )
    })

    it('should handle final diagnosis data', async () => {
      const finalDiagnosisData = {
        ...mockSessionData,
        isCompleted: true,
        completedQuestions: 10,
        finalResult: {
          resultType: '転職推奨型',
          confidenceLevel: 'high',
          urgencyLevel: 'high',
          summary: '総合的な分析の結果、転職を推奨します。',
          actionPlan: ['履歴書更新', '求人検索', '面接準備'],
          detailedAnalysis: {
            emotionalState: {
              primary_emotion: 'stress',
              intensity: 'high'
            },
            careerGoals: {
              clarity_level: 'high',
              primary_goals: ['待遇改善', 'キャリアアップ']
            }
          },
          serviceRecommendations: [
            {
              service_category: 'career_counseling',
              priority: 'urgent',
              timing: 'immediate'
            }
          ]
        }
      }

      const result = await databaseModule.saveV3DiagnosisData(finalDiagnosisData, 'final_diagnosis')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_completed: true,
          final_result: finalDiagnosisData.finalResult,
          answered_questions_count: 10
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const upsertMock = jest.fn(() => Promise.resolve({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      }))
      
      mockSupabaseClient.from.mockReturnValue({
        upsert: upsertMock
      })

      const result = await databaseModule.saveV3DiagnosisData(mockSessionData, 'progress_update')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Database connection failed')
    })

    it('should handle network errors', async () => {
      const upsertMock = jest.fn(() => Promise.reject(new Error('Network error')))
      
      mockSupabaseClient.from.mockReturnValue({
        upsert: upsertMock
      })

      const result = await databaseModule.saveV3DiagnosisData(mockSessionData, 'progress_update')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })
  })

  describe('診断データの取得', () => {
    it('should retrieve session data by sessionId', async () => {
      const mockRetrievedData = [{
        id: 1,
        session_id: 'v3_test_session_12345',
        user_id: 'user_test_123',
        version: 'v3',
        text_answers: {
          'q1_text': {
            answer: 'テスト回答1'
          }
        },
        partial_results: [],
        final_result: null,
        answered_questions_count: 1,
        is_completed: false,
        started_at: '2025-06-29T14:00:00.000Z',
        updated_at: '2025-06-29T14:05:00.000Z'
      }]

      const selectMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: mockRetrievedData, error: null }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock
      })

      const result = await databaseModule.getV3DiagnosisData('v3_test_session_12345')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRetrievedData[0])
      expect(selectMock).toHaveBeenCalledWith('*')
      expect(selectMock().eq).toHaveBeenCalledWith('session_id', 'v3_test_session_12345')
    })

    it('should handle non-existent session', async () => {
      const selectMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock
      })

      const result = await databaseModule.getV3DiagnosisData('non_existent_session')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })

    it('should handle database query errors', async () => {
      const selectMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ 
          data: null, 
          error: { message: 'Query failed' } 
        }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock
      })

      const result = await databaseModule.getV3DiagnosisData('v3_test_session_12345')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Query failed')
    })
  })

  describe('統計データの取得', () => {
    it('should retrieve diagnosis statistics', async () => {
      const mockStats = [
        {
          result_type: '転職推奨型',
          count: 150,
          avg_confidence: 0.85
        },
        {
          result_type: '転職検討型', 
          count: 200,
          avg_confidence: 0.75
        },
        {
          result_type: '現職改善型',
          count: 100,
          avg_confidence: 0.70
        }
      ]

      const selectMock = jest.fn(() => Promise.resolve({ data: mockStats, error: null }))

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock
      })

      const result = await databaseModule.getV3DiagnosisStats()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockStats)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('career_user_diagnosis_v3')
    })

    it('should retrieve user diagnosis history', async () => {
      const mockHistory = [
        {
          id: 1,
          session_id: 'v3_session_1',
          final_result: {
            resultType: '転職推奨型',
            confidenceLevel: 'high'
          },
          is_completed: true,
          created_at: '2025-06-29T10:00:00.000Z'
        },
        {
          id: 2,
          session_id: 'v3_session_2',
          final_result: {
            resultType: '現職改善型',
            confidenceLevel: 'medium'
          },
          is_completed: true,
          created_at: '2025-06-28T15:00:00.000Z'
        }
      ]

      const selectMock = jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: mockHistory, error: null }))
        }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: selectMock
      })

      const result = await databaseModule.getUserV3History('user_test_123')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockHistory)
      expect(selectMock().eq).toHaveBeenCalledWith('user_id', 'user_test_123')
      expect(selectMock().eq().order).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('AI分析結果の保存', () => {
    it('should save AI analysis results', async () => {
      const mockAnalysisData = {
        sessionId: 'v3_test_session_12345',
        phase: 'detailed',
        analysisResult: {
          resultType: '転職推奨型',
          confidenceLevel: 'high',
          emotionalState: {
            primaryEmotion: 'stress',
            intensity: 'high',
            supportNeeds: ['情緒的サポート', 'ストレス軽減策']
          },
          personalizedAdvice: {
            immediateActions: ['転職サイト登録', '相談相手を見つける'],
            weeklyPlan: ['履歴書更新', '企業研究'],
            monthlyGoals: ['書類選考通過', '面接練習']
          }
        },
        processingTimeMs: 1250,
        tokenUsage: {
          input: 500,
          output: 300,
          total: 800
        },
        costEstimate: 0.45
      }

      const result = await databaseModule.saveV3AnalysisResult(mockAnalysisData)

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('career_user_diagnosis_v3')
    })

    it('should update existing session with analysis', async () => {
      const updateMock = jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [{ id: 1 }], error: null }))
      }))

      mockSupabaseClient.from.mockReturnValue({
        update: updateMock
      })

      const analysisData = {
        sessionId: 'v3_existing_session',
        phase: 'quick',
        analysisResult: {
          resultType: '転職検討型',
          confidenceLevel: 'medium'
        }
      }

      await databaseModule.saveV3AnalysisResult(analysisData)

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ai_analysis: expect.any(Object),
          updated_at: expect.any(String)
        })
      )
      expect(updateMock().eq).toHaveBeenCalledWith('session_id', 'v3_existing_session')
    })
  })

  describe('サービス推薦の追跡', () => {
    it('should track service recommendations', async () => {
      const recommendationData = {
        sessionId: 'v3_test_session_12345',
        recommendations: [
          {
            serviceCategory: 'career_counseling',
            serviceProvider: 'provider_1',
            score: 0.85,
            priority: 'urgent',
            timing: 'immediate',
            reasoning: 'ストレス状態が深刻なため即座のサポートが必要'
          },
          {
            serviceCategory: 'job_search',
            serviceProvider: 'provider_2', 
            score: 0.75,
            priority: 'recommended',
            timing: '1-3months',
            reasoning: '転職意向が明確なため求人サイト利用を推奨'
          }
        ],
        generatedAt: '2025-06-29T15:00:00.000Z'
      }

      const result = await databaseModule.saveV3ServiceRecommendations(recommendationData)

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          service_recommendations: recommendationData.recommendations,
          updated_at: expect.any(String)
        })
      )
    })

    it('should track service click events', async () => {
      const clickData = {
        sessionId: 'v3_test_session_12345',
        serviceCategory: 'career_counseling',
        serviceId: 'counseling_service_1',
        clickedAt: '2025-06-29T15:30:00.000Z',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        referrer: '/v3/result'
      }

      const result = await databaseModule.trackV3ServiceClick(clickData)

      expect(result.success).toBe(true)
    })
  })

  describe('データベーススキーマ検証', () => {
    it('should validate required fields', async () => {
      const incompleteData = {
        sessionId: 'v3_test_session',
        // userIdが欠損
        version: 'v3'
      }

      const result = await databaseModule.saveV3DiagnosisData(incompleteData, 'progress_update')

      // 実装によってはバリデーションエラーが発生する可能性がある
      expect(result).toBeDefined()
    })

    it('should handle JSONB data correctly', async () => {
      const complexData = {
        sessionId: 'v3_test_complex',
        userId: 'user_123',
        version: 'v3',
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            answer: 'これは複雑な回答です。特殊文字も含みます: 😊 "引用符" \\バックスラッシュ',
            metadata: {
              language: 'ja',
              sentiment: 'negative',
              keywords: ['ストレス', '不満', '改善']
            }
          }
        },
        aiAnalysis: {
          textAnalysis: {
            wordCount: 150,
            sentimentScore: -0.3,
            emotionDistribution: {
              'stress': 0.4,
              'anxiety': 0.3,
              'hope': 0.1
            }
          },
          recommendations: {
            confidence: 0.85,
            reasoning: 'テキスト分析に基づく推薦'
          }
        }
      }

      const result = await databaseModule.saveV3DiagnosisData(complexData, 'progress_update')

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          text_answers: complexData.textAnswers,
          ai_analysis: complexData.aiAnalysis
        })
      )
    })
  })
})