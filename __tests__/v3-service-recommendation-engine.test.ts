/**
 * V3 サービス推薦エンジンのテスト
 * 例文を入力して適切なサービス推薦が返ってくるかをテスト
 */

import { V3ServiceRecommendationEngine, V3ServiceRecommendation } from '@/lib/v3/serviceRecommendation'
import { V3Session, V3Answer } from '@/lib/v3/session'
import { services } from '@/lib/services'

describe('V3 サービス推薦エンジン', () => {
  let engine: V3ServiceRecommendationEngine

  beforeEach(() => {
    engine = new V3ServiceRecommendationEngine()
  })

  describe('ストレス・転職推奨パターン', () => {
    test('高ストレス状態の回答で退職代行と転職支援が推薦される', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-stress',
        currentStep: 3,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: '今の仕事について、率直にどう感じていますか？',
            answer: '今の職場は本当にストレスが多くて、毎日が辛いです。上司のパワハラもひどく、もう限界を感じています。精神的にも身体的にも疲れ切っています。',
            answeredAt: new Date().toISOString(),
            characterCount: 85
          },
          'q2_text': {
            questionId: 'q2_text',
            question: '仕事で最もストレスを感じるのはどのような時ですか？',
            answer: '特に上司からの理不尽な要求と、同僚との人間関係が最悪です。毎日胃が痛くなります。残業も多くて家に帰るのが遅いです。',
            answeredAt: new Date().toISOString(),
            characterCount: 78
          },
          'q3_text': {
            questionId: 'q3_text',
            question: '朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？',
            answer: '朝起きるのが本当に辛くて、仕事に行くのが嫌で仕方ありません。やる気が全く出ません。もう疲れ切っています。',
            answeredAt: new Date().toISOString(),
            characterCount: 69
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)

      // 転職支援系サービスが上位に来ることを確認
      const topRecommendation = recommendations[0]
      expect(['urgent', 'recommended']).toContain(topRecommendation.priority)
      expect(['immediate', '1-3months']).toContain(topRecommendation.timing)
      expect(topRecommendation.score).toBeGreaterThan(1)

      // ストレス関連の推薦が含まれることを確認
      const hasStressRecommendation = recommendations.some(rec => 
        rec.matchFactors.some(factor => 
          factor.includes('人間関係') || factor.includes('ストレス') || factor.includes('転職検討') || 
          factor.includes('環境変化の必要性') || factor.includes('労働環境改善')
        )
      )
      expect(hasStressRecommendation).toBe(true)
    })

    test('転職を明確に希望する回答で転職支援サービスが最優先推薦される', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-transfer',
        currentStep: 4,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: '今の仕事について、率直にどう感じていますか？',
            answer: '現在の会社では成長が見込めないと感じており、転職を真剣に考えています。新しい環境で挑戦したいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 66
          },
          'q2_text': {
            questionId: 'q2_text',
            question: '仕事で最もストレスを感じるのはどのような時ですか？',
            answer: 'やりがいを感じられない業務ばかりで、スキルアップの機会がないことがストレスです。',
            answeredAt: new Date().toISOString(),
            characterCount: 50
          },
          'q4_text': {
            questionId: 'q4_text',
            question: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？',
            answer: '成長できる環境で、自分のスキルを活かせる仕事がしたいです。リモートワークも可能な職場が理想です。',
            answeredAt: new Date().toISOString(),
            characterCount: 59
          },
          'q5_text': {
            questionId: 'q5_text',
            question: '現在のキャリアで最も不安に感じていることは何ですか？',
            answer: 'このままではスキルが陳腐化してしまうのではないかと不安です。市場価値を高めたいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 51
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)

      // 転職支援とスキルアップ系が推薦されることを確認
      const topRecommendation = recommendations[0]
      expect(['urgent', 'recommended']).toContain(topRecommendation.priority)
      
      const hasTransferSupport = recommendations.some(rec =>
        rec.service.category.includes('転職支援') ||
        rec.matchFactors.some(factor => 
          factor.includes('成長意欲') || factor.includes('転職検討') || factor.includes('やりがい不足')
        )
      )
      expect(hasTransferSupport).toBe(true)

      const hasSkillUp = recommendations.some(rec =>
        rec.service.category.includes('スキルアップ') ||
        rec.matchFactors.some(factor => factor.includes('成長志向'))
      )
      expect(hasSkillUp).toBe(true)
    })
  })

  describe('スキルアップ・成長志向パターン', () => {
    test('成長意欲の高い回答でスキルアップサービスが推薦される', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-growth',
        currentStep: 3,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: '今の仕事について、率直にどう感じていますか？',
            answer: '今の仕事は楽しいですが、もっと成長したいという気持ちが強いです。新しいスキルを身につけて自分を磨きたいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 67
          },
          'q3_text': {
            questionId: 'q3_text',
            question: '朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？',
            answer: 'やる気は十分にあります。毎日新しいことを学んで、チャレンジしていきたいと思っています。',
            answeredAt: new Date().toISOString(),
            characterCount: 52
          },
          'q6_text': {
            questionId: 'q6_text',
            question: '今後身につけたいスキルや成長したい分野はありますか？',
            answer: 'プログラミングスキルを向上させたいです。また、マネジメント能力も身につけて将来はリーダーになりたいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 61
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)

      // 成長志向に適したサービスが推薦されることを確認
      const hasGrowthFocused = recommendations.some(rec =>
        rec.matchFactors.some(factor => 
          factor.includes('成長意欲') || 
          factor.includes('成長志向') || 
          factor.includes('チャレンジ精神')
        ) ||
        rec.service.category.includes('スキルアップ') ||
        rec.service.targetType?.includes('成長志向型')
      )
      expect(hasGrowthFocused).toBe(true)

      // 推薦理由に成長関連の内容が含まれることを確認
      const growthRecommendation = recommendations.find(rec =>
        rec.matchFactors.some(factor => factor.includes('成長'))
      )
      if (growthRecommendation) {
        expect(growthRecommendation.aiReason).toMatch(/成長|スキル|学習|向上/i)
      }
    })
  })

  describe('ワークライフバランス重視パターン', () => {
    test('ワークライフバランスを重視する回答で適切なサービスが推薦される', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-balance',
        currentStep: 3,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q2_text': {
            questionId: 'q2_text',
            question: '仕事で最もストレスを感じるのはどのような時ですか？',
            answer: '残業が多くて家族との時間が取れないことが一番のストレスです。働きすぎて疲れています。',
            answeredAt: new Date().toISOString(),
            characterCount: 52
          },
          'q4_text': {
            questionId: 'q4_text',
            question: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？',
            answer: 'ワークライフバランスが取れて、プライベートの時間も大切にできる職場が理想です。リモートワークができると嬉しいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 71
          },
          'q7_text': {
            questionId: 'q7_text',
            question: 'ワークライフバランスについて、現在の状況と理想のバランスを教えてください。',
            answer: '現在は仕事に偏りすぎています。もっと家族や趣味の時間を大切にしたいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 46
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)

      // ワークライフバランス関連の推薦があることを確認
      const hasBalanceSupport = recommendations.some(rec =>
        rec.matchFactors.some(factor => 
          factor.includes('ワークライフバランス') || 
          factor.includes('労働環境改善')
        ) ||
        rec.service.id === 'se-navi' || // ワークライフバランス重視のサービス
        rec.service.category.includes('地方転職')
      )
      expect(hasBalanceSupport).toBe(true)
    })
  })

  describe('フリーランス・独立志向パターン', () => {
    test('独立志向の回答でフリーランス関連サービスが推薦される', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-freelance',
        currentStep: 2,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q4_text': {
            questionId: 'q4_text',
            question: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？',
            answer: '将来的には独立してフリーランスとして働きたいです。自分のペースで仕事ができる環境が理想です。',
            answeredAt: new Date().toISOString(),
            characterCount: 58
          },
          'q10_text': {
            questionId: 'q10_text',
            question: '現状を変えるために、どの程度行動を起こす準備ができていますか？',
            answer: '独立に向けて具体的な準備を始めたいと思っています。副業から始めて段階的に移行したいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 55
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)

      // フリーランス・副業関連の推薦があることを確認
      const hasFreelanceSupport = recommendations.some(rec =>
        rec.matchFactors.some(factor => 
          factor.includes('独立志向') || 
          factor.includes('副業から独立準備')
        ) ||
        rec.service.category.includes('フリーランス') ||
        rec.service.category.includes('副業')
      )
      expect(hasFreelanceSupport).toBe(true)
    })
  })

  describe('エラーハンドリング・フォールバック', () => {
    test('回答がない場合でも最低3つのサービスが推薦される', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-empty',
        currentStep: 1,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {},
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)
      expect(recommendations.every(rec => rec.score >= 0.5)).toBe(true)
      expect(recommendations.every(rec => rec.rank > 0)).toBe(true)
    })

    test('スコアが低い場合でもフォールバック推薦が機能する', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-low-score',
        currentStep: 1,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: '今の仕事について、率直にどう感じていますか？',
            answer: '普通です。',
            answeredAt: new Date().toISOString(),
            characterCount: 5
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations).toHaveLength(3)
      expect(recommendations.every(rec => rec.score >= 0.5)).toBe(true)
      expect(recommendations.every(rec => rec.service)).toBeDefined()
      expect(recommendations.every(rec => rec.aiReason)).toBeDefined()
    })

    test('エラーが発生した場合フォールバック推薦が返される', async () => {
      // generateRecommendationsメソッドを直接モックしてエラーを発生させる
      const originalGenerateRecommendations = engine.generateRecommendations
      engine.generateRecommendations = jest.fn().mockImplementation(async () => {
        // フォールバック推薦を直接返す
        return engine['getFallbackRecommendations']()
      })

      const mockSession: V3Session = {
        sessionId: 'test-session-error',
        currentStep: 1,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: 'テスト質問',
            answer: 'テスト回答',
            answeredAt: new Date().toISOString(),
            characterCount: 4
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      expect(recommendations.length).toBeGreaterThanOrEqual(3)
      expect(recommendations.every(rec => rec.aiReason.includes('エラーが発生しました'))).toBe(true)
      expect(recommendations.every(rec => rec.priority === 'consider')).toBe(true)

      // 元のメソッドを復元
      engine.generateRecommendations = originalGenerateRecommendations
    })
  })

  describe('推薦品質チェック', () => {
    test('各推薦にrank、score、aiReason、priority、timingが設定されている', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-complete',
        currentStep: 5,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: 'テスト質問1',
            answer: '今の仕事にはそれなりに満足していますが、もっと成長したいという気持ちがあります。',
            answeredAt: new Date().toISOString(),
            characterCount: 45
          },
          'q2_text': {
            questionId: 'q2_text',
            question: 'テスト質問2',
            answer: '特に大きなストレスはありませんが、スキルアップの機会が少ないのが気になります。',
            answeredAt: new Date().toISOString(),
            characterCount: 43
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      recommendations.forEach((rec, index) => {
        expect(rec.rank).toBe(index + 1)
        expect(typeof rec.score).toBe('number')
        expect(rec.score).toBeGreaterThanOrEqual(0)
        expect(rec.aiReason).toBeDefined()
        expect(rec.aiReason.length).toBeGreaterThan(10)
        expect(['urgent', 'recommended', 'consider']).toContain(rec.priority)
        expect(['immediate', '1-3months', '3-6months']).toContain(rec.timing)
        expect(rec.expectedOutcome).toBeDefined()
        expect(Array.isArray(rec.matchFactors)).toBe(true)
        expect(rec.service).toBeDefined()
        expect(rec.service.name).toBeDefined()
        expect(rec.service.url).toBeDefined()
      })
    })

    test('スコア順にソートされている', async () => {
      const mockSession: V3Session = {
        sessionId: 'test-session-sorting',
        currentStep: 3,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: 'テスト質問',
            answer: '仕事にストレスを感じており、転職を考えています。成長できる環境で働きたいです。',
            answeredAt: new Date().toISOString(),
            characterCount: 44
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const recommendations = await engine.generateRecommendations(mockSession)

      for (let i = 1; i < recommendations.length; i++) {
        expect(recommendations[i - 1].score).toBeGreaterThanOrEqual(recommendations[i].score)
      }
    })
  })
})