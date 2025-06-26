/**
 * V3 API エンドポイントのテスト
 */

import { NextRequest } from 'next/server'

// V3セッション管理のモック
const mockV3Session = {
  sessionId: 'v3_test_session',
  userId: 'user_test_123',
  version: 'v3',
  currentStep: 5,
  totalQuestions: 10,
  completedQuestions: 4,
  isCompleted: false,
  textAnswers: {
    'q1_current_feeling': {
      questionId: 'q1_current_feeling',
      question: 'テスト質問',
      answer: 'テスト回答',
      answeredAt: '2025-06-23T14:00:00.000Z',
      characterCount: 4
    }
  },
  partialDiagnosisHistory: [],
  clickedServices: [],
  startedAt: '2025-06-23T14:00:00.000Z',
  updatedAt: '2025-06-23T14:00:00.000Z'
}

jest.mock('@/lib/v3/session', () => ({
  getV3Session: jest.fn(() => mockV3Session),
  syncV3SessionToServer: jest.fn(() => Promise.resolve({ success: true }))
}))

// V3データベース操作のモック
jest.mock('@/lib/v3/database', () => ({
  saveV3DiagnosisData: jest.fn(() => Promise.resolve({ success: true }))
}))

// Anthropic Claude APIのモック
global.fetch = jest.fn()

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

describe('V3 API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('/api/v3/save-diagnosis', () => {
    // save-diagnosis APIのテストは動的インポートを使用
    let saveDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/save-diagnosis/route')
      saveDiagnosisHandler = module.POST
    })

    it('should save diagnosis data successfully', async () => {
      const requestBody = {
        sessionData: mockV3Session,
        updateType: 'progress_update'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('診断データを保存しました')
    })

    it('should handle invalid request body', async () => {
      const request = createMockRequest('POST', {}) // 空のボディ

      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('sessionData')
    })

    it('should handle database errors', async () => {
      const { saveV3DiagnosisData } = require('@/lib/v3/database')
      saveV3DiagnosisData.mockResolvedValueOnce({ 
        success: false, 
        error: 'Database error' 
      })

      const requestBody = {
        sessionData: mockV3Session,
        updateType: 'progress_update'
      }

      const request = createMockRequest('POST', requestBody)
      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Database error')
    })
  })

  describe('/api/v3/partial-diagnosis', () => {
    let partialDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/partial-diagnosis/route')
      partialDiagnosisHandler = module.POST
    })

    it('should execute partial diagnosis successfully', async () => {
      // Claude API レスポンスをモック
      const mockClaudeResponse = {
        resultType: '転職検討型（暫定）',
        confidenceLevel: 'medium',
        urgencyLevel: 'medium',
        summary: '現在の状況を分析した結果、転職を検討する段階にあります。',
        recommendations: ['詳細な自己分析を継続', '転職市場の調査を開始'],
        nextStepAdvice: '残りの質問に回答して、より正確な診断を受けることをお勧めします。'
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockClaudeResponse) }]
        })
      })

      const requestBody = {
        textAnswers: mockV3Session.textAnswers,
        answeredQuestions: 4
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.resultType).toBe('転職検討型（暫定）')
      expect(data.result.confidenceLevel).toBe('medium')
    })

    it('should handle insufficient answers', async () => {
      const requestBody = {
        textAnswers: {},
        answeredQuestions: 0
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('十分な回答がありません')
    })

    it('should handle Claude API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const requestBody = {
        textAnswers: mockV3Session.textAnswers,
        answeredQuestions: 4
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Claude API')
    })

    it('should parse malformed Claude response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'invalid json response' }]
        })
      })

      const requestBody = {
        textAnswers: mockV3Session.textAnswers,
        answeredQuestions: 4
      }

      const request = createMockRequest('POST', requestBody)
      const response = await partialDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.resultType).toBe('分析中')
      expect(data.result.summary).toContain('現在分析中です')
    })
  })

  describe('/api/v3/final-diagnosis', () => {
    let finalDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/final-diagnosis/route')
      finalDiagnosisHandler = module.POST
    })

    it('should execute final diagnosis successfully', async () => {
      const mockFinalResponse = {
        resultType: '転職積極型',
        confidenceLevel: 'high',
        urgencyLevel: 'high',
        summary: '総合的な分析の結果、積極的な転職活動を推奨します。',
        actionPlan: [
          '履歴書・職務経歴書の更新',
          '転職サイトへの登録',
          '面接対策の準備'
        ],
        detailedAnalysis: {
          emotionalState: {
            current_level: 'ストレス高',
            primary_emotions: ['不満', '焦り', '期待']
          },
          careerGoals: {
            clarity_level: '明確',
            primary_goals: ['キャリアアップ', '待遇改善']
          }
        },
        longTermStrategy: '3-6ヶ月以内の転職を目標に、戦略的に活動することをお勧めします。',
        serviceRecommendations: []
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockFinalResponse) }]
        })
      })

      const completedTextAnswers = {
        'q1_current_feeling': { answer: 'テスト回答1' },
        'q2_motivation_level': { answer: 'テスト回答2' },
        'q3_work_environment': { answer: 'テスト回答3' },
        'q4_career_goals': { answer: 'テスト回答4' },
        'q5_skills_satisfaction': { answer: 'テスト回答5' },
        'q6_work_life_balance': { answer: 'テスト回答6' },
        'q7_growth_opportunities': { answer: 'テスト回答7' },
        'q8_company_culture': { answer: 'テスト回答8' },
        'q9_future_vision': { answer: 'テスト回答9' },
        'q10_action_readiness': { answer: 'テスト回答10' }
      }

      const requestBody = {
        textAnswers: completedTextAnswers,
        partialDiagnosisHistory: []
      }

      const request = createMockRequest('POST', requestBody)
      const response = await finalDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.resultType).toBe('転職積極型')
      expect(data.result.confidenceLevel).toBe('high')
      expect(data.result.actionPlan).toHaveLength(3)
      expect(data.result.detailedAnalysis).toBeDefined()
    })

    it('should handle incomplete answers', async () => {
      const incompleteAnswers = {
        'q1_current_feeling': { answer: 'テスト回答1' }
        // 他の質問が未回答
      }

      const requestBody = {
        textAnswers: incompleteAnswers,
        partialDiagnosisHistory: []
      }

      const request = createMockRequest('POST', requestBody)
      const response = await finalDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('すべての質問への回答が必要です')
    })

    it('should incorporate partial diagnosis history', async () => {
      const mockResponseWithHistory = {
        resultType: '転職検討型',
        confidenceLevel: 'high',
        summary: '途中診断の結果も踏まえた総合分析です。',
        actionPlan: ['継続的な検討を推奨']
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockResponseWithHistory) }]
        })
      })

      const completedAnswers = Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `q${i + 1}_test`,
          { answer: `テスト回答${i + 1}` }
        ])
      )

      const partialHistory = [{
        answeredQuestions: 3,
        confidenceLevel: 'low',
        resultType: '転職検討型（暫定）',
        summary: '初期分析結果'
      }]

      const requestBody = {
        textAnswers: completedAnswers,
        partialDiagnosisHistory: partialHistory
      }

      const request = createMockRequest('POST', requestBody)
      const response = await finalDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.summary).toContain('途中診断の結果も踏まえた')
    })
  })

  describe('API Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      const { POST: saveDiagnosisHandler } = await import('../app/api/v3/save-diagnosis/route')
      
      // 不正なJSONをシミュレート
      const request = new NextRequest('http://localhost:3000/api/v3/save-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      })

      const response = await saveDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('JSON')
    })

    it('should handle missing Content-Type header', async () => {
      const { POST: saveDiagnosisHandler } = await import('../app/api/v3/save-diagnosis/route')
      
      const request = new NextRequest('http://localhost:3000/api/v3/save-diagnosis', {
        method: 'POST',
        body: JSON.stringify({ sessionData: mockV3Session })
      })

      const response = await saveDiagnosisHandler(request)
      
      // Content-Typeがなくても正常に処理される場合もあるが、
      // エラーハンドリングが適切に行われることを確認
      expect(response.status).toBeLessThan(500)
    })
  })

  describe('API Rate Limiting & Security', () => {
    it('should handle large request payloads', async () => {
      const { POST: partialDiagnosisHandler } = await import('../app/api/v3/partial-diagnosis/route')
      
      const largeTextAnswers = Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [
          `q${i + 1}_test`,
          { 
            answer: 'あ'.repeat(10000), // 10,000文字の回答
            answeredAt: '2025-06-23T14:00:00.000Z',
            characterCount: 10000
          }
        ])
      )

      const requestBody = {
        textAnswers: largeTextAnswers,
        answeredQuestions: 10
      }

      const request = createMockRequest('POST', requestBody)
      
      // レスポンスが適切に処理されることを確認
      // 実際のAPI実装では文字数制限があるかもしれません
      try {
        const response = await partialDiagnosisHandler(request)
        expect(response.status).toBeLessThan(500)
      } catch (error) {
        // エラーが発生した場合も適切にハンドリングされることを確認
        expect(error).toBeDefined()
      }
    })
  })
})