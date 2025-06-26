/**
 * V3 API カラムベース版のテスト
 * 新しいカラムベーステーブル構造に対応したAPIテスト
 */

import { NextRequest } from 'next/server'

// テスト用のHTTPリクエスト作成ヘルパー
const createMockRequest = (method: string, body?: any): NextRequest => {
  const url = 'http://localhost:3000/api/v3/test'
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  }
  
  if (body) {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(url, init)
}

// モック環境変数設定
process.env.ANTHROPIC_API_KEY = 'test-api-key'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'

describe('V3 API Column-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // fetchのモックをリセット
    global.fetch = jest.fn()
  })

  describe('/api/v3/save-diagnosis (Column-Based)', () => {
    let saveDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/save-diagnosis/route')
      saveDiagnosisHandler = module.POST
    })

    it('should save column-based diagnosis data successfully', async () => {
      // Supabase APIのモック
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{ id: 'test-id-123' }],
          error: null
        })
      })

      const requestBody = {
        sessionId: 'test-session-123',
        userId: 'test-user-123',
        questionNumber: 1,
        answerText: 'テスト回答です。現在の仕事にストレスを感じています。',
        currentStep: 2,
        completedQuestions: 1,
        isCompleted: false,
        updateType: 'answer_update'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle multiple question updates', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [{ id: 'test-id-123' }],
          error: null
        })
      })

      const requestBody = {
        sessionId: 'test-session-123',
        userId: 'test-user-123',
        q1_text: '1問目の回答',
        q2_text: '2問目の回答',
        q3_text: '3問目の回答',
        currentStep: 4,
        completedQuestions: 3,
        isCompleted: false,
        updateType: 'progress_update'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle missing sessionId', async () => {
      const requestBody = {
        userId: 'test-user-123',
        q1_text: 'テスト回答',
        updateType: 'answer_update'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('sessionId and userId are required')
    })
  })

  describe('/api/v3/partial-diagnosis (Column-Based)', () => {
    let partialDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/partial-diagnosis/route')
      partialDiagnosisHandler = module.POST
    })

    it('should execute partial diagnosis with column data', async () => {
      // Claude API レスポンスをモック
      const mockClaudeResponse = {
        result_type: '転職検討型',
        confidence_level: 'medium',
        urgency_level: 'medium',
        summary: '現在の状況を分析した結果、転職を検討する段階にあります。',
        detailed_analysis: {
          emotional_state: 'ストレス状態',
          stress_factors: ['上司との関係', '業務量過多'],
          motivation_level: '低下傾向',
          career_concerns: ['将来性への不安'],
          work_environment: '改善余地あり',
          future_outlook: '転職により改善可能'
        },
        action_plan: {
          immediate_actions: ['ストレス管理の実践'],
          short_term_goals: ['転職活動の準備'],
          long_term_goals: ['キャリアプランの明確化']
        },
        service_recommendations: [{
          category: 'career_counseling',
          priority: 'high',
          reason: 'キャリア相談が必要'
        }]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockClaudeResponse) }]
        })
      })

      const requestBody = {
        sessionId: 'test-session-123',
        q1_text: '現在の仕事について非常にストレスを感じています。',
        q2_text: '上司からの無理な要求が多く、毎日残業しています。',
        q3_text: '朝起きるのが辛く、仕事へのモチベーションが全くありません。'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.resultType).toBe('転職検討型')
      expect(data.result.answeredQuestions).toBe(3)
      expect(data.result.recommendations).toBeDefined()
      expect(data.metadata.diagnosisVersion).toBeDefined()
    })

    it('should handle single question answer', async () => {
      const mockClaudeResponse = {
        result_type: '様子見型',
        confidence_level: 'low',
        urgency_level: 'low',
        summary: '1問のみの回答のため、詳細な分析は困難です。',
        detailed_analysis: {
          emotional_state: '分析中',
          stress_factors: [],
          motivation_level: '分析中',
          career_concerns: [],
          work_environment: '分析中',
          future_outlook: '分析中'
        },
        action_plan: {
          immediate_actions: ['他の質問への回答を推奨'],
          short_term_goals: ['詳細な自己分析'],
          long_term_goals: ['状況の整理']
        },
        service_recommendations: []
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockClaudeResponse) }]
        })
      })

      const requestBody = {
        sessionId: 'test-session-123',
        q1_text: '普通です。'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.answeredQuestions).toBe(1)
      expect(data.result.confidenceLevel).toBe('low')
    })

    it('should handle no answers provided', async () => {
      const requestBody = {
        sessionId: 'test-session-123'
        // 回答なし
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('At least 1 question must be answered')
    })

    it('should handle Claude API failure', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      const requestBody = {
        sessionId: 'test-session-123',
        q1_text: 'テスト回答'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.result.resultType).toBe('診断エラー')
    })
  })

  describe('/api/v3/final-diagnosis (Column-Based)', () => {
    let finalDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/final-diagnosis/route')
      finalDiagnosisHandler = module.POST
    })

    it('should execute final diagnosis with all answers', async () => {
      const mockFinalResponse = {
        result_type: '転職推奨型',
        confidence_level: 'high',
        urgency_level: 'high',
        summary: '総合的な分析の結果、転職を積極的に推奨します。現在の職場環境は改善が困難と判断されます。',
        detailed_analysis: {
          emotional_state: '高ストレス状態',
          stress_factors: ['職場環境', '人間関係', '業務量'],
          motivation_level: '著しく低下',
          career_concerns: ['スキル停滞', '将来性への不安'],
          work_environment: '改善困難',
          future_outlook: '転職により大幅改善期待'
        },
        action_plan: {
          immediate_actions: ['履歴書の作成', '転職サイト登録'],
          short_term_goals: ['面接対策', '企業研究'],
          long_term_goals: ['新職場での成長', 'スキルアップ']
        },
        service_recommendations: [
          {
            category: 'transfer_agent',
            priority: 'high',
            reason: '転職エージェントの活用を推奨'
          },
          {
            category: 'skill_up',
            priority: 'medium',
            reason: 'スキルアップで転職を有利に'
          }
        ]
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockFinalResponse) }]
        })
      })

      const requestBody = {
        sessionId: 'test-session-123',
        q1_text: '毎日会社に行くのが苦痛で仕方ありません。',
        q2_text: '上司からのパワハラが酷く、精神的に限界です。',
        q3_text: '朝起きるのも辛く、全くやる気が出ません。',
        q4_text: 'リモートワークで自分のペースで働きたいです。',
        q5_text: 'このままでは成長できずキャリアが停滞してしまいます。',
        q6_text: 'プログラミングスキルを身につけたいです。',
        q7_text: '残業が多すぎて家族との時間が全くありません。',
        q8_text: '社内の雰囲気が最悪で、誰も助けてくれません。',
        q9_text: '給料も安く、同年代と比べて明らかに劣っています。',
        q10_text: '今すぐにでも転職活動を始めたいと思っています。',
        partialDiagnosisHistory: [
          {
            answeredQuestions: 3,
            resultType: '転職検討型',
            summary: '初期分析では転職検討を推奨'
          }
        ]
      }

      const request = createMockRequest('POST', requestBody)
      const response = await finalDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.resultType).toBe('転職推奨型')
      expect(data.result.confidenceLevel).toBe('high')
      expect(data.result.serviceRecommendations).toHaveLength(2)
      expect(data.result.actionPlan).toBeDefined()
      expect(data.result.nextStepsTimeline).toHaveLength(3)
      expect(data.metadata.answeredQuestions).toBe(10)
    })

    it('should handle incomplete final diagnosis', async () => {
      const requestBody = {
        sessionId: 'test-session-123',
        q1_text: 'テスト回答1',
        q2_text: 'テスト回答2'
        // 他の質問が未回答
      }

      const mockPartialResponse = {
        result_type: '分析不足',
        confidence_level: 'low',
        urgency_level: 'medium',
        summary: '回答数が不足しているため、十分な分析ができません。',
        detailed_analysis: {
          emotional_state: '分析中',
          stress_factors: [],
          motivation_level: '分析中',
          career_concerns: [],
          work_environment: '分析中',
          future_outlook: '分析中'
        },
        action_plan: {
          immediate_actions: ['全ての質問に回答'],
          short_term_goals: ['詳細な自己分析'],
          long_term_goals: ['状況の整理']
        },
        service_recommendations: []
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockPartialResponse) }]
        })
      })

      const request = createMockRequest('POST', requestBody)
      const response = await finalDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.resultType).toBe('分析不足')
      expect(data.metadata.answeredQuestions).toBe(2)
      expect(data.metadata.analysisCompleteness).toBe('basic')
    })

    it('should handle missing sessionId', async () => {
      const requestBody = {
        q1_text: 'テスト回答'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await finalDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('sessionId is required')
    })
  })

  describe('Integration Test', () => {
    it('should complete full diagnosis workflow', async () => {
      // 1. データ保存
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('save-diagnosis')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              data: [{ id: 'test-id-123' }],
              error: null
            })
          })
        }
        
        // Claude API
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            content: [{ 
              text: JSON.stringify({
                result_type: '転職検討型',
                confidence_level: 'medium',
                urgency_level: 'medium',
                summary: 'ワークフロー統合テスト成功',
                detailed_analysis: {
                  emotional_state: 'テスト中',
                  stress_factors: ['統合テスト'],
                  motivation_level: 'テスト中',
                  career_concerns: [],
                  work_environment: 'テスト環境',
                  future_outlook: '良好'
                },
                action_plan: {
                  immediate_actions: ['テスト完了'],
                  short_term_goals: [],
                  long_term_goals: []
                },
                service_recommendations: []
              })
            }]
          })
        })
      })

      // save-diagnosis
      const { POST: saveHandler } = await import('../app/api/v3/save-diagnosis/route')
      const saveRequest = createMockRequest('POST', {
        sessionId: 'integration-test-123',
        userId: 'test-user-123',
        q1_text: '統合テスト回答',
        updateType: 'answer_update'
      })
      
      const saveResponse = await saveHandler(saveRequest)
      expect(saveResponse.status).toBe(200)

      // partial-diagnosis
      const { POST: partialHandler } = await import('../app/api/v3/partial-diagnosis/route')
      const partialRequest = createMockRequest('POST', {
        sessionId: 'integration-test-123',
        q1_text: '統合テスト回答'
      })
      
      const partialResponse = await partialHandler(partialRequest)
      const partialData = await partialResponse.json()
      
      expect(partialResponse.status).toBe(200)
      expect(partialData.success).toBe(true)
      expect(partialData.result.resultType).toBe('転職検討型')
    })
  })
})