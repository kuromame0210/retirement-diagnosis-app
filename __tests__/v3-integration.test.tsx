/**
 * V3診断システム統合テスト
 * API連携とデータフローを確認
 */

import { executeV3Diagnosis, V3DiagnosisRequest } from '@/lib/v3/ai-diagnosis'
import { V3ServiceRecommendationEngine } from '@/lib/v3/serviceRecommendation'
import { V3Session } from '@/lib/v3/session'

// fetchのモック
const mockFetch = jest.fn()
global.fetch = mockFetch

// 環境変数のモック
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    ANTHROPIC_API_KEY: 'test-api-key'
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('V3診断システム統合テスト', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('完全なワークフロー統合テスト', () => {
    test('診断→サービス推薦の完全フローが正常に動作する', async () => {
      // Step 1: AI診断を実行
      const mockDiagnosisResponse = {
        content: [{
          text: JSON.stringify({
            result_type: '転職検討型',
            confidence_level: 'high',
            urgency_level: 'medium',
            summary: '転職を含めた選択肢を慎重に検討することをお勧めします。',
            detailed_analysis: {
              emotional_state: '中程度のストレスと将来への不安',
              stress_factors: ['キャリア停滞感', '給与への不満'],
              motivation_level: '向上心は維持されている',
              career_concerns: ['将来性への不安', '市場価値'],
              work_environment: '改善余地はあるが限界もある',
              future_outlook: '複数の選択肢を検討すべき',
              psychological_impact: '中程度の心理的影響',
              skill_assessment: '市場価値は十分にある',
              market_positioning: '転職可能な範囲内'
            },
            multifaceted_insights: {
              psychological_perspective: 'バランスの取れた判断が必要',
              strategic_perspective: '複数選択肢の比較検討が重要',
              economic_perspective: '収入向上の可能性を検討',
              life_design_perspective: 'ライフプランとの整合性確認',
              organizational_perspective: '組織での成長可能性も考慮',
              market_trends_perspective: '転職市場の動向確認が必要'
            },
            scenario_planning: {
              stay_current_scenario: {
                probability: '50%',
                outcomes: ['安定継続'],
                risks: ['成長停滞'],
                success_factors: ['積極的改善提案']
              },
              job_change_scenario: {
                probability: '50%',
                outcomes: ['新環境での成長'],
                risks: ['適応リスク'],
                success_factors: ['十分な準備']
              },
              hybrid_scenario: {
                probability: '60%',
                outcomes: ['段階的検討'],
                risks: ['決断の遅れ'],
                success_factors: ['期限設定']
              }
            },
            action_plan: {
              immediate_actions: [{
                action: '現状分析と目標設定',
                reason: '客観的判断のための基盤作り',
                timeline: '2週間',
                difficulty_level: 'easy',
                expected_impact: '方向性の明確化'
              }],
              short_term_goals: [{
                goal: '転職市場調査',
                specific_steps: ['求人情報収集', '面接準備'],
                success_metrics: '市場価値の把握',
                timeline: '2ヶ月',
                resources_needed: ['転職サイト活用']
              }],
              long_term_goals: [{
                goal: '最適な選択の実行',
                milestone_breakdown: ['情報収集完了', '決断'],
                potential_obstacles: ['迷い'],
                success_criteria: '満足度向上',
                timeline: '6ヶ月'
              }]
            },
            industry_specific_advice: {
              current_industry_trends: '変化の過渡期',
              transferable_skills: ['業界経験', 'ネットワーク'],
              recommended_career_paths: ['同業界転職', '関連業界挑戦'],
              skill_gap_analysis: '最新技術習得が有効',
              market_demand_insights: '経験者需要は中程度'
            },
            service_recommendations: [{
              category: 'career_counseling',
              priority: 'high',
              reason: '客観的な判断支援が必要',
              specific_services: ['キャリア相談', '適性診断'],
              timing_recommendation: '1ヶ月以内',
              expected_outcomes: '最適な選択の決定'
            }]
          })
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDiagnosisResponse
      })

      const diagnosisRequest: V3DiagnosisRequest = {
        q1_text: '現在の仕事には満足していますが、キャリアアップについて考えると不安になります。',
        q2_text: '給与面での不満と、将来的な成長が見込めるかが分からないことがストレスです。',
        q3_text: 'やる気はありますが、このまま続けていいのか迷いがあります。',
        q4_text: '理想の職場は、成長機会があり適正な評価をしてくれる環境です。',
        diagnosisType: 'final',
        answeredQuestions: 4,
        sessionId: 'test-integration-session'
      }

      const diagnosisResult = await executeV3Diagnosis(diagnosisRequest)

      // 診断結果の検証
      expect(diagnosisResult.result_type).toBe('転職検討型')
      expect(diagnosisResult.confidence_level).toBe('high')
      expect(diagnosisResult.summary).toContain('転職を含めた選択肢を慎重に検討')
      expect(diagnosisResult.detailed_analysis.stress_factors).toContain('キャリア停滞感')

      // Step 2: サービス推薦を生成
      const serviceEngine = new V3ServiceRecommendationEngine()
      const mockSession: V3Session = {
        sessionId: 'test-integration-session',
        currentStep: 10,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: diagnosisRequest.q1_text || '',
            answer: diagnosisRequest.q1_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (diagnosisRequest.q1_text || '').length
          },
          'q2_text': {
            questionId: 'q2_text',
            question: diagnosisRequest.q2_text || '',
            answer: diagnosisRequest.q2_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (diagnosisRequest.q2_text || '').length
          },
          'q3_text': {
            questionId: 'q3_text',
            question: diagnosisRequest.q3_text || '',
            answer: diagnosisRequest.q3_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (diagnosisRequest.q3_text || '').length
          },
          'q4_text': {
            questionId: 'q4_text',
            question: diagnosisRequest.q4_text || '',
            answer: diagnosisRequest.q4_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (diagnosisRequest.q4_text || '').length
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: [],
        finalResult: {
          resultType: diagnosisResult.result_type,
          summary: diagnosisResult.summary,
          detailedAnalysis: diagnosisResult.detailed_analysis,
          recommendations: [],
          diagnosedAt: diagnosisResult.diagnosed_at,
          answeredQuestions: diagnosisResult.answered_questions
        }
      }

      const serviceRecommendations = await serviceEngine.generateRecommendations(mockSession)

      // サービス推薦の検証
      expect(serviceRecommendations).toHaveLength(3)
      expect(serviceRecommendations.every(rec => rec.rank > 0)).toBe(true)
      expect(serviceRecommendations.every(rec => rec.score > 0)).toBe(true)
      expect(serviceRecommendations.every(rec => rec.aiReason.length > 0)).toBe(true)
      expect(serviceRecommendations.every(rec => ['urgent', 'recommended', 'consider'].includes(rec.priority))).toBe(true)

      // キャリア関連サービスが推薦されることを確認（より柔軟な条件）
      const hasCareerService = serviceRecommendations.some(rec =>
        rec.service.category.some(cat => cat.includes('転職') || cat.includes('キャリア')) ||
        rec.service.name.includes('転職') ||
        rec.matchFactors.some(factor => 
          factor.includes('転職検討') || 
          factor.includes('成長') ||
          factor.includes('基本推奨') ||
          factor.includes('スキル')
        )
      )
      expect(hasCareerService).toBe(true)

      console.log('統合テスト完了:')
      console.log('- 診断タイプ:', diagnosisResult.result_type)
      console.log('- 推薦サービス数:', serviceRecommendations.length)
      console.log('- トップ推薦:', serviceRecommendations[0].service.name)
    })

    test('異なる回答パターンで適切な診断結果が返される', async () => {
      // 高ストレス状態の回答パターン
      const highStressResponse = {
        content: [{
          text: JSON.stringify({
            result_type: '転職推奨型',
            confidence_level: 'high',
            urgency_level: 'high',
            summary: '現在の職場環境は深刻な問題があり、転職を強く推奨します。',
            detailed_analysis: {
              emotional_state: '高いストレス状態',
              stress_factors: ['人間関係の悪化', '過度な労働時間'],
              motivation_level: '非常に低い',
              career_concerns: ['健康への影響'],
              work_environment: '改善困難',
              future_outlook: '現職継続は困難',
              psychological_impact: '深刻な影響',
              skill_assessment: '転職市場での競争力あり',
              market_positioning: '緊急転職が必要'
            },
            multifaceted_insights: {
              psychological_perspective: '心理的ストレスが限界点',
              strategic_perspective: '転職が最適解',
              economic_perspective: '収入向上の可能性',
              life_design_perspective: 'ワークライフバランス改善必須',
              organizational_perspective: '組織文化との不適合',
              market_trends_perspective: '転職市場は良好'
            },
            scenario_planning: {
              stay_current_scenario: { probability: '10%', outcomes: ['状況悪化'], risks: ['健康被害'], success_factors: ['根本的改革'] },
              job_change_scenario: { probability: '90%', outcomes: ['環境改善'], risks: ['適応期間'], success_factors: ['事前準備'] },
              hybrid_scenario: { probability: '20%', outcomes: ['段階的改善'], risks: ['時間の浪費'], success_factors: ['期限設定'] }
            },
            action_plan: {
              immediate_actions: [{ action: '転職活動開始', reason: '緊急対応必要', timeline: '1週間', difficulty_level: 'medium', expected_impact: 'ストレス軽減' }],
              short_term_goals: [{ goal: '転職先決定', specific_steps: ['履歴書作成'], success_metrics: '内定獲得', timeline: '2ヶ月', resources_needed: ['転職エージェント'] }],
              long_term_goals: [{ goal: '新職場定着', milestone_breakdown: ['試用期間クリア'], potential_obstacles: ['環境適応'], success_criteria: '継続勤務', timeline: '1年' }]
            },
            industry_specific_advice: {
              current_industry_trends: '転職需要高',
              transferable_skills: ['専門知識'],
              recommended_career_paths: ['同業界'],
              skill_gap_analysis: '現状十分',
              market_demand_insights: '需要高'
            },
            service_recommendations: [{ category: 'transfer_agent', priority: 'high', reason: '緊急転職サポート', specific_services: ['転職エージェント'], timing_recommendation: '即座に', expected_outcomes: '転職成功' }]
          })
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => highStressResponse
      })

      const highStressRequest: V3DiagnosisRequest = {
        q1_text: '今の職場は本当にストレスが多くて、毎日が辛いです。上司のパワハラもひどく、もう限界を感じています。',
        q2_text: '特に上司からの理不尽な要求と、同僚との人間関係が最悪です。毎日胃が痛くなります。',
        q3_text: '朝起きるのが本当に辛くて、仕事に行くのが嫌で仕方ありません。やる気が全く出ません。',
        diagnosisType: 'final',
        answeredQuestions: 3,
        sessionId: 'test-high-stress-session'
      }

      const highStressResult = await executeV3Diagnosis(highStressRequest)

      expect(highStressResult.result_type).toBe('転職推奨型')
      expect(highStressResult.confidence_level).toBe('high')
      expect(highStressResult.urgency_level).toBe('high')
      expect(highStressResult.summary).toContain('転職を強く推奨')

      // 対応するサービス推薦をテスト
      const serviceEngine = new V3ServiceRecommendationEngine()
      const highStressSession: V3Session = {
        sessionId: 'test-high-stress-session',
        currentStep: 10,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        textAnswers: {
          'q1_text': {
            questionId: 'q1_text',
            question: '',
            answer: highStressRequest.q1_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (highStressRequest.q1_text || '').length
          },
          'q2_text': {
            questionId: 'q2_text',
            question: '',
            answer: highStressRequest.q2_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (highStressRequest.q2_text || '').length
          },
          'q3_text': {
            questionId: 'q3_text',
            question: '',
            answer: highStressRequest.q3_text || '',
            answeredAt: new Date().toISOString(),
            characterCount: (highStressRequest.q3_text || '').length
          }
        },
        partialDiagnosisHistory: [],
        clickedServices: []
      }

      const highStressRecommendations = await serviceEngine.generateRecommendations(highStressSession)

      expect(highStressRecommendations).toHaveLength(3)
      
      // 高ストレス状態に適したサービス推薦を確認
      const hasUrgentRecommendation = highStressRecommendations.some(rec =>
        rec.priority === 'urgent' || 
        rec.timing === 'immediate' ||
        rec.matchFactors.some(factor => 
          factor.includes('ストレス') || factor.includes('転職検討') || factor.includes('環境変化')
        )
      )
      expect(hasUrgentRecommendation).toBe(true)
    })
  })
})