/**
 * V3段階的診断システムのテスト（動作確認版）
 * Request/Response APIエラーを修正した完全動作版
 */

// V3セッション管理のモック
const mockV3Session = {
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
      answer: '毎日がとても辛く、やりがいを感じられません。朝起きるのも憂鬱で、仕事に行くのが嫌です。',
      answeredAt: '2025-06-29T14:00:00.000Z',
      characterCount: 50
    },
    'q2_text': {
      questionId: 'q2_text', 
      question: '仕事で最もストレスを感じるのはどのような時ですか？',
      answer: '上司からの理不尽な要求と、長時間労働が続いている時です。特に残業が多くてプライベートな時間がありません。',
      answeredAt: '2025-06-29T14:05:00.000Z',
      characterCount: 60
    },
    'q3_text': {
      questionId: 'q3_text',
      question: '朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？',
      answer: 'ほとんどありません。毎朝「また今日も仕事か...」と思ってしまいます。',
      answeredAt: '2025-06-29T14:10:00.000Z',
      characterCount: 40
    },
    'q4_text': {
      questionId: 'q4_text',
      question: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？',
      answer: 'リモートワークが可能で、裁量権があり、チームワークを重視する環境です。成長できる機会もほしいです。',
      answeredAt: '2025-06-29T14:15:00.000Z',
      characterCount: 55
    }
  },
  partialDiagnosisHistory: [],
  clickedServices: [],
  startedAt: '2025-06-29T14:00:00.000Z',
  updatedAt: '2025-06-29T14:15:00.000Z'
}

// V3セッション管理をモック
jest.mock('@/lib/v3/session', () => ({
  getV3Session: jest.fn(() => mockV3Session),
  syncV3SessionToServer: jest.fn(() => Promise.resolve({ success: true })),
  saveV3Session: jest.fn(),
  clearV3Session: jest.fn(),
  getV3ProgressInfo: jest.fn(() => ({
    currentStep: 5,
    completedQuestions: 4,
    totalQuestions: 10,
    progressPercentage: 40,
    isCompleted: false,
    canDiagnose: true,
    hasPartialDiagnosis: false,
    hasFinalResult: false
  }))
}))

// V3データベース操作をモック
jest.mock('@/lib/v3/database', () => ({
  saveV3DiagnosisData: jest.fn(() => Promise.resolve({ success: true })),
  getV3DiagnosisData: jest.fn(() => Promise.resolve(null))
}))

// タイムスタンプユーティリティをモック
jest.mock('@/lib/utils/timestamp', () => ({
  getJSTTimestamp: jest.fn(() => '2025-06-29T14:30:00.000Z')
}))

describe('V3段階的診断システム（動作確認版）', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Phase 1: 即時診断（Haiku）', () => {
    let stagedDiagnosisHandler: any

    beforeAll(async () => {
      // 動的インポートでAPIハンドラーを取得
      const module = await import('../app/api/v3/staged-diagnosis/route')
      stagedDiagnosisHandler = module.POST
    })

    it('should execute quick diagnosis successfully', async () => {
      // Claude Haiku APIレスポンスをモック
      const mockHaikuResponse = {
        result_type: '転職検討型',
        confidence_level: 'medium',
        urgency_level: 'high',
        summary: '現在の状況を分析した結果、転職を積極的に検討する段階にあります。ストレス要因が多く、モチベーションの低下が見られます。',
        immediate_actions: [
          '今日から転職サイトに登録してみる',
          '信頼できる人に相談する',
          'ストレス軽減方法を試す'
        ],
        estimated_detail_time: 15
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockHaikuResponse) }]
        })
      })

      // リクエストボディを作成
      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'quick',
        diagnosisType: 'final',
        q1_text: mockV3Session.textAnswers.q1_text.answer,
        q2_text: mockV3Session.textAnswers.q2_text.answer,
        q3_text: mockV3Session.textAnswers.q3_text.answer,
        q4_text: mockV3Session.textAnswers.q4_text.answer
      }

      // Requestオブジェクトを作成
      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      // APIハンドラーを実行
      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      // レスポンスを検証
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('転職検討型')
      expect(data.result.confidence_level).toBe('medium')
      expect(data.result.urgency_level).toBe('high')
      expect(data.result.immediate_actions).toHaveLength(3)
      expect(data.result.phase).toBe('quick')
      expect(data.metadata.phase).toBe('quick')
      expect(data.metadata.answered_questions).toBe(4)
    })

    it('should handle insufficient answers', async () => {
      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'quick',
        diagnosisType: 'final'
        // 回答なし
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('At least one answer is required')
    })

    it('should handle Claude API errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'quick',
        diagnosisType: 'final',
        q1_text: mockV3Session.textAnswers.q1_text.answer
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Phase 2: 詳細パーソナル診断（Sonnet）', () => {
    let stagedDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/staged-diagnosis/route')
      stagedDiagnosisHandler = module.POST
    })

    it('should execute detailed personal diagnosis successfully', async () => {
      // Claude Sonnet APIレスポンスをモック
      const mockSonnetResponse = {
        result_type: '転職推奨型',
        confidence_level: 'high',
        urgency_level: 'high',
        personal_summary: 'あなたが感じている辛さや憂鬱な気持ち、本当によく分かります。毎朝仕事に行くのが嫌だという感情は、とても自然で正当なものです。',
        emotional_connection: {
          recognition: 'あなたが毎日感じている辛さや憂鬱な気持ち、痛いほどよく分かります',
          validation: 'そのような感情を抱くのは当然で、あなたが悪いわけではありません',
          hope_message: 'でも大丈夫。必ず道はあります。一緒に最適な解決策を見つけていきましょう'
        },
        personal_insights: {
          your_situation_analysis: 'あなたは現在、理不尽な上司と長時間労働により、深刻なストレス状態にあります',
          emotional_pattern: 'あなたは朝の憂鬱感から判断すると、慢性的なストレス反応を示しています',
          stress_response: 'あなたのストレス反応は典型的な燃え尽き症候群の初期段階を示しています',
          motivation_drivers: ['成長機会', 'ワークライフバランス', 'チームワーク'],
          career_strengths: ['環境適応力', '問題認識力', '理想追求力'],
          growth_areas: ['ストレス管理', '転職活動スキル']
        },
        personalized_action_plan: {
          this_week: [{
            action: '転職サイトに登録し、求人情報を1日10分だけ見る',
            why_for_you: 'あなたの理想である裁量権とリモートワークの求人を探すため',
            how_to_start: 'まずは大手転職サイト1つに登録するだけでOK',
            expected_feeling: '選択肢があることを実感し、少し気持ちが軽くなります'
          }],
          this_month: [{
            goal: '転職活動の基盤作り',
            your_approach: 'あなたのペースで、無理せず進める',
            success_indicators: ['履歴書完成', '企業研究3社'],
            potential_challenges: '時間確保の難しさ',
            support_needed: ['時間管理', '精神的支援']
          }],
          next_3_months: [{
            vision: '理想的な職場環境での新しいスタート',
            milestone_path: ['書類選考通過', '面接練習', '内定獲得'],
            decision_points: ['給与交渉のタイミング', '退職時期の決定'],
            backup_plans: ['現職での改善交渉', '転職時期の調整']
          }]
        },
        personalized_services: [{
          service_category: 'career_counseling',
          why_recommended_for_you: 'あなたの感情的な負担を理解し、適切なサポートを提供できるため',
          timing_for_you: '今すぐ相談することで、精神的な負担を軽減できます',
          expected_benefit_for_you: 'あなたの状況に最適化された転職戦略の策定',
          how_to_choose: 'あなたの価値観に合う、共感力の高いカウンセラーを選ぶ'
        }],
        your_future_scenarios: {
          stay_current_path: {
            probability_for_you: '現状維持は精神的に困難',
            what_happens_to_you: ['ストレス増大', '健康への悪影響'],
            your_risks: ['燃え尽き症候群', 'うつ症状'],
            your_success_keys: ['職場環境の改善', 'ストレス管理']
          },
          change_path: {
            probability_for_you: '高い成功可能性',
            what_happens_to_you: ['ストレス軽減', '理想的な働き方の実現'],
            your_risks: ['転職活動の負担', '適応期間'],
            your_success_keys: ['適切な企業選択', '転職タイミング']
          }
        },
        diagnosed_at: '2025-06-29T14:30:00.000Z',
        phase: 'detailed',
        answered_questions: 4
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockSonnetResponse) }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'detailed',
        diagnosisType: 'final',
        q1_text: mockV3Session.textAnswers.q1_text.answer,
        q2_text: mockV3Session.textAnswers.q2_text.answer,
        q3_text: mockV3Session.textAnswers.q3_text.answer,
        q4_text: mockV3Session.textAnswers.q4_text.answer
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      // レスポンスを検証
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('転職推奨型')
      expect(data.result.confidence_level).toBe('high')
      expect(data.result.emotional_connection).toBeDefined()
      expect(data.result.personal_insights).toBeDefined()
      expect(data.result.personalized_action_plan).toBeDefined()
      expect(data.result.your_future_scenarios).toBeDefined()
      expect(data.result.phase).toBe('detailed')
      expect(data.result.answered_questions).toBe(4)
    })

    it('should handle JSON parsing errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: 'invalid json response from claude' }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'detailed',
        diagnosisType: 'final',
        q1_text: mockV3Session.textAnswers.q1_text.answer
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      // フォールバック診断が返されることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('現職改善型')
      expect(data.result.confidence_level).toBe('low')
      expect(data.result.phase).toBe('detailed')
    })
  })

  describe('API Validation', () => {
    let stagedDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/staged-diagnosis/route')
      stagedDiagnosisHandler = module.POST
    })

    it('should require sessionId', async () => {
      const requestBody = {
        phase: 'quick',
        q1_text: 'テスト回答'
        // sessionId missing
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('sessionId is required')
    })

    it('should validate phase parameter', async () => {
      const requestBody = {
        sessionId: 'test-session',
        phase: 'invalid-phase',
        q1_text: 'テスト回答'
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid phase')
    })

    it('should handle malformed JSON gracefully', async () => {
      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json syntax}'
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Performance and Reliability', () => {
    let stagedDiagnosisHandler: any

    beforeAll(async () => {
      const module = await import('../app/api/v3/staged-diagnosis/route')
      stagedDiagnosisHandler = module.POST
    })

    it('should handle large text answers', async () => {
      const mockResponse = {
        result_type: '現職改善型',
        confidence_level: 'medium',
        urgency_level: 'medium',
        summary: '詳細な回答をありがとうございます。',
        immediate_actions: ['分析を継続']
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockResponse) }]
        })
      })

      const largeText = 'あ'.repeat(5000) // 5000文字

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'quick',
        q1_text: largeText
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should measure processing time', async () => {
      const mockResponse = {
        result_type: '転職検討型',
        confidence_level: 'medium',
        immediate_actions: ['テスト']
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(mockResponse) }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'quick',
        q1_text: 'テスト回答'
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const startTime = Date.now()
      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(data.metadata.processing_time_ms).toBeDefined()
      expect(typeof data.metadata.processing_time_ms).toBe('number')
      expect(data.metadata.processing_time_ms).toBeGreaterThan(0)
    })
  })
})

describe('V3 EmpatheticAdvisor Integration', () => {
  it('should analyze emotional state correctly', async () => {
    // EmpatheticAdvisorクラスを直接テスト
    const { EmpatheticAdvisor } = await import('@/lib/v3/empathetic-advisor')
    const advisor = new EmpatheticAdvisor()

    const testAnswers = {
      q1: 'とてもストレスを感じています。毎日辛くて仕方ありません。',
      q2: '不安で不安でたまりません。将来が見えません。',
      q3: 'イライラすることが多く、職場の環境に腹が立ちます。'
    }

    const emotionalState = advisor.analyzeEmotionalState(testAnswers)

    expect(emotionalState.primaryEmotion).toBeDefined()
    expect(['stress', 'anxiety', 'frustration', 'sadness', 'confusion', 'hope']).toContain(emotionalState.primaryEmotion)
    expect(emotionalState.intensity).toBeDefined()
    expect(['low', 'medium', 'high']).toContain(emotionalState.intensity)
    expect(emotionalState.supportNeeds).toBeDefined()
    expect(Array.isArray(emotionalState.supportNeeds)).toBe(true)
  })

  it('should generate empathetic message', async () => {
    const { EmpatheticAdvisor } = await import('@/lib/v3/empathetic-advisor')
    const advisor = new EmpatheticAdvisor()

    const emotionalState = {
      primaryEmotion: 'stress' as const,
      intensity: 'high' as const,
      supportNeeds: ['情緒的サポート', 'ストレス軽減策']
    }

    const testAnswers = {
      q1: 'ストレスがひどくて限界です。',
      q2: '毎日が辛すぎます。'
    }

    const empathyMessage = advisor.generateEmpatheticMessage(emotionalState, testAnswers)

    expect(empathyMessage.recognition).toBeDefined()
    expect(empathyMessage.validation).toBeDefined()
    expect(empathyMessage.hope_message).toBeDefined()
    expect(typeof empathyMessage.recognition).toBe('string')
    expect(empathyMessage.recognition.length).toBeGreaterThan(0)
  })
})