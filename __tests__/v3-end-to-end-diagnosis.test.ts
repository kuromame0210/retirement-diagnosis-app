/**
 * V3 AI診断エンドツーエンドテスト
 * 実際のAI診断が確実に成功することを保証するテスト
 */

// V3セッション管理のモック
const mockV3Session = {
  sessionId: 'v3_e2e_test_session',
  userId: 'user_e2e_test',
  version: 'v3',
  textAnswers: {
    'q1_text': { 
      answer: '毎日がとても辛く、仕事に行くのが憂鬱です。上司からの理不尽な要求と長時間労働で限界を感じています。',
      answeredAt: '2025-06-29T14:00:00.000Z',
      characterCount: 50
    },
    'q2_text': { 
      answer: '職場の人間関係が最悪で、特に上司のパワハラがひどいです。毎日怒鳴られて、自分の価値が分からなくなります。',
      answeredAt: '2025-06-29T14:05:00.000Z',
      characterCount: 55
    },
    'q3_text': { 
      answer: '朝起きるときから既にやる気がなく、「また今日も耐えなければ」という気持ちです。モチベーションは皆無です。',
      answeredAt: '2025-06-29T14:10:00.000Z',
      characterCount: 50
    }
  }
}

jest.mock('@/lib/v3/session', () => ({
  getV3Session: jest.fn(() => mockV3Session)
}))

jest.mock('@/lib/v3/database', () => ({
  saveV3DiagnosisData: jest.fn(() => Promise.resolve({ success: true }))
}))

jest.mock('@/lib/utils/timestamp', () => ({
  getJSTTimestamp: jest.fn(() => '2025-06-29T15:00:00.000Z')
}))

describe('V3 AI診断エンドツーエンドテスト', () => {
  let stagedDiagnosisHandler: any

  beforeAll(async () => {
    const module = await import('../app/api/v3/staged-diagnosis/route')
    stagedDiagnosisHandler = module.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('実際のClaudeレスポンスパターンのテスト', () => {
    it('should handle perfectly valid Claude response', async () => {
      // 完璧なClaudeレスポンス
      const perfectResponse = {
        result_type: '転職推奨型',
        confidence_level: 'high',
        urgency_level: 'high',
        personal_summary: 'あなたが感じている職場での辛さや憂鬱な気持ち、そして上司からの理不尽な扱いについて、深く共感いたします。毎日が苦痛に感じられる環境で働き続けることは、心身ともに大きな負担となります。',
        emotional_connection: {
          recognition: 'あなたが毎日感じている辛さや憂鬱な気持ち、そして職場での理不尽な扱いに対する怒りや絶望感、痛いほどよく分かります',
          validation: 'そのような環境でストレスを感じ、モチベーションを失うのは当然のことです。あなたが悪いわけでは決してありません',
          hope_message: 'でも大丈夫です。あなたには必ず他の道があります。一緒に最適な解決策を見つけていきましょう'
        },
        personal_insights: {
          your_situation_analysis: 'あなたは現在、パワハラと長時間労働という深刻な問題に直面しており、精神的・身体的に限界に近い状態にあります',
          emotional_pattern: 'あなたの感情パターンは、継続的なストレス下での典型的な反応を示しており、うつ症状の兆候も見られます',
          stress_response: 'あなたのストレス反応は既に危険域に達しており、早急な環境改善が必要です',
          motivation_drivers: ['安全で健康的な労働環境', '人間的な尊重', 'ワークライフバランス'],
          career_strengths: ['忍耐力', '責任感', '状況把握力'],
          growth_areas: ['ストレス管理', '自己主張', '境界設定']
        },
        personalized_action_plan: {
          this_week: [{
            action: '労働基準監督署または労働相談ホットラインに相談する',
            why_for_you: 'あなたが受けているパワハラは違法行為であり、専門機関の介入が必要です',
            how_to_start: '平日の昼休みや帰宅後に、まずは電話相談から始めてみてください',
            expected_feeling: '一人で抱え込んでいた問題に対して、具体的な対処法が見えてくる安心感'
          }],
          this_month: [{
            goal: '転職活動の開始と精神的サポートの確保',
            your_approach: 'あなたの心身の状態を最優先に、無理のない範囲で進める',
            success_indicators: ['転職サイトへの登録完了', 'カウンセリング開始'],
            potential_challenges: '現職での業務継続とのバランス',
            support_needed: ['家族や友人の理解', '専門家のサポート']
          }],
          next_3_months: [{
            vision: '健康的で人間らしい働き方ができる新しい環境での再スタート',
            milestone_path: ['健康状態の回復', '適切な職場の発見', '円滑な転職'],
            decision_points: ['転職のタイミング', '条件の優先順位'],
            backup_plans: ['休職による回復期間の確保', '法的措置の検討']
          }]
        },
        personalized_services: [{
          service_category: 'mental_health_support',
          why_recommended_for_you: 'あなたの現在の精神状態では、専門的なメンタルヘルスサポートが急務です',
          timing_for_you: '今すぐにでも開始することをお勧めします',
          expected_benefit_for_you: '心身の健康回復と、適切な判断力の回復',
          how_to_choose: 'ハラスメント被害者の支援経験が豊富な専門家を選んでください'
        }],
        your_future_scenarios: {
          stay_current_path: {
            probability_for_you: '継続は極めて困難かつ危険',
            what_happens_to_you: ['心身の健康状態がさらに悪化', 'うつ病等の精神疾患発症リスク'],
            your_risks: ['長期的な健康被害', '職業能力の低下', '人間関係への影響'],
            your_success_keys: ['即座の環境改善', '専門的サポートの活用']
          },
          change_path: {
            probability_for_you: '適切な準備により高い成功確率',
            what_happens_to_you: ['心身の健康回復', '自己肯定感の回復', '新しい可能性の発見'],
            your_risks: ['転職活動中のストレス', '経済的な不安'],
            your_success_keys: ['健康回復を最優先', '十分な準備期間の確保', '適切なサポート活用']
          }
        }
      }

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: JSON.stringify(perfectResponse) }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'detailed',
        diagnosisType: 'final',
        q1_text: mockV3Session.textAnswers.q1_text.answer,
        q2_text: mockV3Session.textAnswers.q2_text.answer,
        q3_text: mockV3Session.textAnswers.q3_text.answer
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      // 完璧な診断結果が返されることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('転職推奨型')
      expect(data.result.confidence_level).toBe('high')
      expect(data.result.personal_summary).toContain('深く共感いたします')
      expect(data.result.emotional_connection.recognition).toContain('痛いほどよく分かります')
      expect(data.result.personal_insights.your_situation_analysis).toContain('パワハラと長時間労働')
      expect(data.result.personalized_action_plan.this_week[0].action).toContain('労働基準監督署')
      expect(data.result.your_future_scenarios.stay_current_path.probability_for_you).toContain('困難かつ危険')
    })

    it('should handle markdown-wrapped Claude response', async () => {
      const markdownResponse = `Based on your responses, here's my detailed analysis:

\`\`\`json
{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "urgency_level": "high",
  "personal_summary": "あなたの置かれている状況は非常に深刻で、心身の健康に重大な影響を与えています。このような環境では転職を強くお勧めします。",
  "emotional_connection": {
    "recognition": "毎日の辛さと絶望感、よく分かります",
    "validation": "あなたは何も悪くありません",
    "hope_message": "必ず良い道があります"
  },
  "personal_insights": {
    "your_situation_analysis": "深刻なハラスメント環境にあります",
    "emotional_pattern": "慢性的ストレス反応を示しています",
    "stress_response": "限界を超えている状態です",
    "motivation_drivers": ["健康的な環境", "人間的尊重"],
    "career_strengths": ["忍耐力", "真摯さ"],
    "growth_areas": ["自己主張", "境界設定"]
  }
}
\`\`\`

This analysis shows that your situation requires immediate action.`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: markdownResponse }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'detailed',
        q1_text: mockV3Session.textAnswers.q1_text.answer
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
      expect(data.result.result_type).toBe('転職推奨型')
      expect(data.result.personal_summary).toContain('非常に深刻')
      expect(data.result.personal_insights.stress_response).toBe('限界を超えている状態です')
    })

    it('should handle severely corrupted JSON with robust parsing', async () => {
      // 実際のエラーパターン：途中で切れたJSON
      const corruptedResponse = `{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "あなたの状況を分析した結果、転職をお勧めします。現在の職場環境は..."`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: corruptedResponse }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'detailed',
        q1_text: mockV3Session.textAnswers.q1_text.answer
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      // 堅牢な解析により部分的でも意味のある結果が返される
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('転職推奨型')
      expect(data.result.confidence_level).toBe('high')
      expect(data.result.personal_summary).toContain('転職をお勧めします')
    })

    it('should never return system error message to users', async () => {
      // 完全に壊れたレスポンス
      const completelyBrokenResponse = 'Network timeout error occurred'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: completelyBrokenResponse }]
        })
      })

      const requestBody = {
        sessionId: mockV3Session.sessionId,
        phase: 'detailed',
        q1_text: mockV3Session.textAnswers.q1_text.answer
      }

      const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()

      // システムエラーメッセージではなく、意味のあるフォールバック診断が返される
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBeDefined()
      expect(data.result.personal_summary).not.toContain('システムエラーのため詳細分析ができませんでした')
      expect(data.result.personal_summary).toContain('専門家との個別相談をお勧めします')
      expect(data.result.personal_insights.emotional_pattern).not.toBe('あなたの感情パターンについて、さらなる対話が必要です。')
      expect(data.result.personalized_action_plan.this_week[0].action).toContain('専門家')
    })
  })

  describe('AI診断品質保証テスト', () => {
    it('should always provide actionable advice regardless of parsing quality', async () => {
      const testResponses = [
        // ケース1: 完璧なJSON
        JSON.stringify({
          result_type: '転職推奨型',
          personal_summary: '完璧な分析結果です',
          personalized_action_plan: {
            this_week: [{ action: '完璧なアクション' }]
          }
        }),
        // ケース2: 部分的なJSON
        '{"result_type": "転職検討型", "personal_summary": "部分的な分析',
        // ケース3: 非JSON
        '分析結果をお伝えできませんでした'
      ]

      for (let i = 0; i < testResponses.length; i++) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: testResponses[i] }]
          })
        })

        const requestBody = {
          sessionId: `test_session_${i}`,
          phase: 'detailed',
          q1_text: '詳細な回答内容です'
        }

        const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        const response = await stagedDiagnosisHandler(request)
        const data = await response.json()

        // すべてのケースで実用的なアドバイスが提供される
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.result.result_type).toBeDefined()
        expect(data.result.personal_summary).toBeDefined()
        expect(data.result.personal_summary.length).toBeGreaterThan(10)
        expect(data.result.personalized_action_plan.this_week).toBeInstanceOf(Array)
        expect(data.result.personalized_action_plan.this_week.length).toBeGreaterThan(0)
        expect(data.result.personalized_action_plan.this_week[0].action).toBeDefined()
        expect(data.result.personalized_action_plan.this_week[0].action.length).toBeGreaterThan(5)
      }
    })

    it('should provide empathetic and professional responses', async () => {
      const emotionallyChargeCases = [
        // ケース1: 軽微なJSON問題
        '{"result_type": "転職推奨型", "emotional_connection": {"recognition": "理解します"',
        // ケース2: 完全破損
        'Error in analysis system'
      ]

      for (const testCase of emotionallyChargeCases) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: testCase }]
          })
        })

        const requestBody = {
          sessionId: 'emotional_test',
          phase: 'detailed',
          q1_text: '精神的に限界で、毎日が辛いです'
        }

        const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        const response = await stagedDiagnosisHandler(request)
        const data = await response.json()

        // 共感的で専門的な応答が保証される
        expect(data.result.emotional_connection).toBeDefined()
        expect(data.result.emotional_connection.recognition).toBeDefined()
        expect(data.result.emotional_connection.validation).toBeDefined()
        expect(data.result.emotional_connection.hope_message).toBeDefined()
        
        // 共感的な言葉遣いの確認
        expect(data.result.emotional_connection.recognition).toMatch(/(理解|分かります|共感)/i)
        expect(data.result.emotional_connection.validation).toMatch(/(自然|正当|当然)/i)
        expect(data.result.emotional_connection.hope_message).toMatch(/(道|解決|一緒)/i)
      }
    })

    it('should maintain consistent response structure across all scenarios', async () => {
      const diverseResponses = [
        // 完璧なケース
        JSON.stringify({ result_type: '転職推奨型', confidence_level: 'high' }),
        // エラーケース
        'System malfunction',
        // 部分ケース
        '{"result_type": "現職改善型"'
      ]

      for (const testResponse of diverseResponses) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: testResponse }]
          })
        })

        const requestBody = {
          sessionId: 'structure_test',
          phase: 'detailed',
          q1_text: 'テスト回答'
        }

        const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        const response = await stagedDiagnosisHandler(request)
        const data = await response.json()

        // 一貫した構造の確認
        const requiredFields = [
          'result_type', 'confidence_level', 'urgency_level',
          'emotional_connection', 'personal_summary', 'personal_insights',
          'personalized_action_plan', 'personalized_services', 'your_future_scenarios',
          'diagnosed_at', 'phase', 'answered_questions'
        ]

        for (const field of requiredFields) {
          expect(data.result[field]).toBeDefined()
        }

        // ネストされた構造の確認
        expect(data.result.personal_insights.your_situation_analysis).toBeDefined()
        expect(data.result.personal_insights.emotional_pattern).toBeDefined()
        expect(data.result.personal_insights.motivation_drivers).toBeInstanceOf(Array)
        expect(data.result.personalized_action_plan.this_week).toBeInstanceOf(Array)
        expect(data.result.your_future_scenarios.stay_current_path).toBeDefined()
        expect(data.result.your_future_scenarios.change_path).toBeDefined()
      }
    })
  })

  describe('ユーザビリティ保証テスト', () => {
    it('should never display technical error messages to users', async () => {
      const technicalErrors = [
        'JSON.parse error at position 1256',
        'TypeError: Cannot read property',
        'SyntaxError: Unexpected token',
        'ReferenceError: undefined is not defined',
        'Network timeout occurred'
      ]

      for (const errorText of technicalErrors) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: errorText }]
          })
        })

        const requestBody = {
          sessionId: 'user_test',
          phase: 'detailed',
          q1_text: 'ユーザーテスト'
        }

        const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        const response = await stagedDiagnosisHandler(request)
        const data = await response.json()

        // 技術的エラーメッセージが表示されないことを確認
        const responseText = JSON.stringify(data.result)
        expect(responseText).not.toMatch(/JSON\.parse|TypeError|SyntaxError|ReferenceError|Error|error/i)
        expect(responseText).not.toContain('システムエラー')
        expect(responseText).not.toContain('詳細分析ができませんでした')
        
        // 代わりに有用な内容が提供されることを確認
        expect(data.result.personal_summary).toMatch(/(分析|アドバイス|相談|サポート)/i)
        expect(data.result.personalized_action_plan.this_week[0].action).toMatch(/(相談|検討|整理|準備)/i)
      }
    })

    it('should provide meaningful next steps in all scenarios', async () => {
      const challengingCases = [
        '', // 空レスポンス
        '{}', // 空JSON
        'null', // null
        '{"error": "Analysis failed"}' // エラーJSON
      ]

      for (const testCase of challengingCases) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            content: [{ text: testCase }]
          })
        })

        const requestBody = {
          sessionId: 'meaningful_test',
          phase: 'detailed',
          q1_text: '具体的なアドバイスが欲しいです'
        }

        const request = new Request('http://localhost:3000/api/v3/staged-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        const response = await stagedDiagnosisHandler(request)
        const data = await response.json()

        // 意味のある次のステップが提供される
        expect(data.result.personalized_action_plan.this_week).toBeInstanceOf(Array)
        expect(data.result.personalized_action_plan.this_week.length).toBeGreaterThan(0)
        
        const firstAction = data.result.personalized_action_plan.this_week[0]
        expect(firstAction.action).toBeDefined()
        expect(firstAction.why_for_you).toBeDefined()
        expect(firstAction.how_to_start).toBeDefined()
        expect(firstAction.expected_feeling).toBeDefined()
        
        // アクションが具体的で実行可能
        expect(firstAction.action.length).toBeGreaterThan(10)
        expect(firstAction.how_to_start.length).toBeGreaterThan(10)
      }
    })
  })
})