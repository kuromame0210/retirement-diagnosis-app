/**
 * V3 AI診断機能のテスト
 * 例文を入力して正しい診断結果が返ってくるかをテスト
 */

import { executeV3Diagnosis, V3DiagnosisRequest, V3DiagnosisResult } from '@/lib/v3/ai-diagnosis'

// モック環境変数を設定
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

// Claude APIをモック
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('V3 AI診断機能', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('正常な診断パターン', () => {
    test('転職推奨型の診断が正しく動作する', async () => {
      // モックレスポンス
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            result_type: '転職推奨型',
            confidence_level: 'high',
            urgency_level: 'high',
            summary: '現在の職場環境は深刻な問題があり、転職を強く推奨します。',
            detailed_analysis: {
              emotional_state: '高いストレス状態で精神的負担が大きい',
              stress_factors: ['人間関係の悪化', '過度な労働時間'],
              motivation_level: '非常に低く、回復が困難な状況',
              career_concerns: ['スキル停滞', '将来性への不安'],
              work_environment: '改善困難な環境',
              future_outlook: '現職継続は困難',
              psychological_impact: '自己肯定感の低下が見られる',
              skill_assessment: '転職市場での競争力あり',
              market_positioning: '有利なポジション'
            },
            multifaceted_insights: {
              psychological_perspective: '心理的ストレスが限界点に達している',
              strategic_perspective: '転職が最適解',
              economic_perspective: '収入向上の可能性あり',
              life_design_perspective: 'ワークライフバランス改善が必要',
              organizational_perspective: '組織文化との不適合',
              market_trends_perspective: '転職市場は良好'
            },
            scenario_planning: {
              stay_current_scenario: {
                probability: '20%',
                outcomes: ['状況悪化'],
                risks: ['健康被害'],
                success_factors: ['根本的改革']
              },
              job_change_scenario: {
                probability: '80%',
                outcomes: ['環境改善', '収入向上'],
                risks: ['適応期間'],
                success_factors: ['事前準備']
              },
              hybrid_scenario: {
                probability: '30%',
                outcomes: ['段階的改善'],
                risks: ['時間の浪費'],
                success_factors: ['明確な期限設定']
              }
            },
            action_plan: {
              immediate_actions: [{
                action: '転職活動の開始',
                reason: '現状の深刻さから緊急対応が必要',
                timeline: '1週間以内',
                difficulty_level: 'medium',
                expected_impact: 'メンタル改善への第一歩'
              }],
              short_term_goals: [{
                goal: '転職先の決定',
                specific_steps: ['履歴書作成', '面接準備'],
                success_metrics: '内定獲得',
                timeline: '3ヶ月',
                resources_needed: ['転職エージェント']
              }],
              long_term_goals: [{
                goal: '新職場での定着',
                milestone_breakdown: ['試用期間クリア', 'チーム貢献'],
                potential_obstacles: ['環境適応'],
                success_criteria: '1年継続勤務',
                timeline: '1年'
              }]
            },
            industry_specific_advice: {
              current_industry_trends: '転職需要が高まっている',
              transferable_skills: ['コミュニケーション能力', 'プロジェクト管理'],
              recommended_career_paths: ['管理職', '専門職'],
              skill_gap_analysis: 'デジタルスキルの向上が必要',
              market_demand_insights: '経験者の需要が高い'
            },
            service_recommendations: [{
              category: 'transfer_agent',
              priority: 'high',
              reason: '緊急度が高く専門サポートが必要',
              specific_services: ['転職エージェント', 'キャリア相談'],
              timing_recommendation: '即座に',
              expected_outcomes: '最適な転職先の発見'
            }]
          })
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request: V3DiagnosisRequest = {
        q1_text: '今の職場は本当にストレスが多くて、毎日が辛いです。上司のパワハラもひどく、もう限界を感じています。',
        q2_text: '特に上司からの理不尽な要求と、同僚との人間関係が最悪です。毎日胃が痛くなります。',
        q3_text: '朝起きるのが本当に辛くて、仕事に行くのが嫌で仕方ありません。やる気が全く出ません。',
        diagnosisType: 'final',
        answeredQuestions: 3,
        sessionId: 'test-session-123'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
      expect(result.urgency_level).toBe('high')
      expect(result.summary).toContain('転職を強く推奨します')
      expect(result.detailed_analysis.stress_factors).toContain('人間関係の悪化')
      expect(result.service_recommendations[0].category).toBe('transfer_agent')
      expect(result.service_recommendations[0].priority).toBe('high')
    })

    test('現職改善型の診断が正しく動作する', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            result_type: '現職改善型',
            confidence_level: 'medium',
            urgency_level: 'low',
            summary: '現在の職場には改善の余地があり、まずは環境改善を試みることをお勧めします。',
            detailed_analysis: {
              emotional_state: '軽度のストレスは感じているが対処可能',
              stress_factors: ['業務量の多さ'],
              motivation_level: '中程度で改善可能',
              career_concerns: ['スキルアップの機会不足'],
              work_environment: '改善の余地あり',
              future_outlook: '前向きな展望が可能',
              psychological_impact: '軽微な影響',
              skill_assessment: '成長の余地あり',
              market_positioning: '現職でのスキルアップが有効'
            },
            multifaceted_insights: {
              psychological_perspective: 'ストレス管理で対応可能',
              strategic_perspective: '現職でのキャリア形成が有効',
              economic_perspective: '安定的な収入確保が可能',
              life_design_perspective: 'ワークライフバランスの調整が必要',
              organizational_perspective: '組織内での役割改善が可能',
              market_trends_perspective: '業界内での経験積み上げが有利'
            },
            scenario_planning: {
              stay_current_scenario: {
                probability: '70%',
                outcomes: ['環境改善', 'スキル向上'],
                risks: ['変化の遅さ'],
                success_factors: ['積極的な提案']
              },
              job_change_scenario: {
                probability: '30%',
                outcomes: ['新環境での成長'],
                risks: ['適応コスト'],
                success_factors: ['十分な準備']
              },
              hybrid_scenario: {
                probability: '60%',
                outcomes: ['段階的キャリア形成'],
                risks: ['時間の要求'],
                success_factors: ['計画的アプローチ']
              }
            },
            action_plan: {
              immediate_actions: [{
                action: '上司との面談',
                reason: '業務改善の相談',
                timeline: '2週間以内',
                difficulty_level: 'easy',
                expected_impact: '業務負荷の軽減'
              }],
              short_term_goals: [{
                goal: '業務効率化',
                specific_steps: ['プロセス見直し', 'ツール導入'],
                success_metrics: '残業時間削減',
                timeline: '3ヶ月',
                resources_needed: ['上司の協力']
              }],
              long_term_goals: [{
                goal: 'リーダーシップスキル向上',
                milestone_breakdown: ['研修参加', 'プロジェクトリード'],
                potential_obstacles: ['時間確保'],
                success_criteria: '昇進',
                timeline: '1年'
              }]
            },
            industry_specific_advice: {
              current_industry_trends: '業界成長期にある',
              transferable_skills: ['専門知識', 'チームワーク'],
              recommended_career_paths: ['専門職深化', 'マネジメント'],
              skill_gap_analysis: 'リーダーシップスキル強化が必要',
              market_demand_insights: '経験者への需要は安定'
            },
            service_recommendations: [{
              category: 'skill_up',
              priority: 'medium',
              reason: 'スキル向上による現職でのキャリア発展',
              specific_services: ['研修プログラム', 'オンライン学習'],
              timing_recommendation: '1-3ヶ月後',
              expected_outcomes: '専門性向上と昇進可能性'
            }]
          })
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request: V3DiagnosisRequest = {
        q1_text: '今の仕事は基本的に好きですが、もう少し成長できる環境があればいいなと思います。',
        q2_text: '時々業務量が多くて忙しいですが、やりがいを感じる瞬間もあります。',
        q3_text: 'やる気はそれなりにありますが、もっとスキルアップしたいという気持ちが強いです。',
        diagnosisType: 'partial',
        answeredQuestions: 3,
        sessionId: 'test-session-456'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('現職改善型')
      expect(result.confidence_level).toBe('medium')
      expect(result.urgency_level).toBe('low')
      expect(result.summary).toContain('環境改善を試みる')
      expect(result.service_recommendations[0].category).toBe('skill_up')
      expect(result.service_recommendations[0].priority).toBe('medium')
    })

    test('転職検討型の診断が正しく動作する', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            result_type: '転職検討型',
            confidence_level: 'medium',
            urgency_level: 'medium',
            summary: '現在の状況を総合的に検討し、転職も含めた選択肢を慎重に検討することをお勧めします。',
            detailed_analysis: {
              emotional_state: '中程度のストレスと不満',
              stress_factors: ['キャリア停滞感', '給与への不満'],
              motivation_level: '波があるが向上心は維持',
              career_concerns: ['将来性への不安', '市場価値'],
              work_environment: '改善余地があるが限界もある',
              future_outlook: '複数の選択肢を検討すべき',
              psychological_impact: '中程度の影響',
              skill_assessment: '市場価値は十分',
              market_positioning: '転職可能な範囲'
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
              priority: 'medium',
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
        json: async () => mockResponse
      })

      const request: V3DiagnosisRequest = {
        q1_text: '今の仕事に不満はありませんが、キャリアアップについて考えると少し不安になります。',
        q2_text: '給与面での不満と、将来的な成長が見込めるか分からないことがストレスです。',
        q3_text: 'やる気はありますが、このまま続けていいのか迷いもあります。',
        diagnosisType: 'final',
        answeredQuestions: 3,
        sessionId: 'test-session-789'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('転職検討型')
      expect(result.confidence_level).toBe('medium')
      expect(result.urgency_level).toBe('medium')
      expect(result.summary).toContain('転職も含めた選択肢を慎重に検討')
      expect(result.service_recommendations[0].category).toBe('career_counseling')
    })
  })

  describe('エラーハンドリング', () => {
    test('API呼び出しが失敗した場合、フォールバック診断を返す', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      const request: V3DiagnosisRequest = {
        q1_text: 'テスト回答',
        diagnosisType: 'final',
        answeredQuestions: 1,
        sessionId: 'test-session-error'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('現職改善型')
      expect(result.confidence_level).toBe('low')
      expect(result.summary).toContain('システムエラー')
      expect(result.diagnosis_version).toContain('fallback')
    })

    test('API_KEYが設定されていない場合、エラーハンドリングされる', async () => {
      const originalApiKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY

      const request: V3DiagnosisRequest = {
        q1_text: 'テスト回答',
        diagnosisType: 'final',
        answeredQuestions: 1,
        sessionId: 'test-session-no-key'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('現職改善型')
      expect(result.confidence_level).toBe('low')
      expect(result.summary).toContain('システムエラー')

      process.env.ANTHROPIC_API_KEY = originalApiKey
    })

    test('不正なJSONレスポンスの場合、フォールバック診断を返す', async () => {
      const mockResponse = {
        content: [{
          text: '不正なJSON文字列'
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request: V3DiagnosisRequest = {
        q1_text: 'テスト回答',
        diagnosisType: 'final',
        answeredQuestions: 1,
        sessionId: 'test-session-invalid-json'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('現職改善型')
      expect(result.confidence_level).toBe('low')
      expect(result.summary).toContain('システムエラー')
    })
  })

  describe('入力バリデーション', () => {
    test('必要な回答が含まれていれば正常に処理される', async () => {
      const mockResponse = {
        content: [{
          text: JSON.stringify({
            result_type: '現職改善型',
            confidence_level: 'medium',
            urgency_level: 'low',
            summary: 'テスト診断結果',
            detailed_analysis: {
              emotional_state: 'テスト',
              stress_factors: [],
              motivation_level: 'テスト',
              career_concerns: [],
              work_environment: 'テスト',
              future_outlook: 'テスト',
              psychological_impact: 'テスト',
              skill_assessment: 'テスト',
              market_positioning: 'テスト'
            },
            multifaceted_insights: {
              psychological_perspective: 'テスト',
              strategic_perspective: 'テスト',
              economic_perspective: 'テスト',
              life_design_perspective: 'テスト',
              organizational_perspective: 'テスト',
              market_trends_perspective: 'テスト'
            },
            scenario_planning: {
              stay_current_scenario: {
                probability: '50%',
                outcomes: ['テスト'],
                risks: ['テスト'],
                success_factors: ['テスト']
              },
              job_change_scenario: {
                probability: '50%',
                outcomes: ['テスト'],
                risks: ['テスト'],
                success_factors: ['テスト']
              },
              hybrid_scenario: {
                probability: '50%',
                outcomes: ['テスト'],
                risks: ['テスト'],
                success_factors: ['テスト']
              }
            },
            action_plan: {
              immediate_actions: [],
              short_term_goals: [],
              long_term_goals: []
            },
            industry_specific_advice: {
              current_industry_trends: 'テスト',
              transferable_skills: [],
              recommended_career_paths: [],
              skill_gap_analysis: 'テスト',
              market_demand_insights: 'テスト'
            },
            service_recommendations: []
          })
        }]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request: V3DiagnosisRequest = {
        q1_text: '有効な回答文',
        q2_text: '',
        q3_text: '',
        diagnosisType: 'partial',
        answeredQuestions: 1,
        sessionId: 'test-session-valid'
      }

      const result = await executeV3Diagnosis(request)

      expect(result.result_type).toBe('現職改善型')
      expect(result.confidence_level).toBe('medium')
      expect(result.answered_questions).toBe(1)
      expect(result.diagnosed_at).toBeDefined()
      expect(result.diagnosis_version).toBe('v3.1')
    })
  })

  describe('ユーティリティ関数', () => {
    test('診断結果タイプの説明が正しく取得される', async () => {
      const { getDiagnosisTypeDescription } = await import('@/lib/v3/ai-diagnosis')
      
      expect(getDiagnosisTypeDescription('転職推奨型')).toContain('転職を積極的に推奨')
      expect(getDiagnosisTypeDescription('現職改善型')).toContain('現在の職場での課題解決')
      expect(getDiagnosisTypeDescription('転職検討型')).toContain('転職を含めた選択肢を検討')
      expect(getDiagnosisTypeDescription('様子見型')).toContain('しばらく様子を見る')
      expect(getDiagnosisTypeDescription('要注意型')).toContain('メンタルヘルス面でのケア')
      expect(getDiagnosisTypeDescription('不明なタイプ')).toContain('詳細な説明は後日提供')
    })

    test('緊急度レベルの説明が正しく取得される', async () => {
      const { getUrgencyLevelDescription } = await import('@/lib/v3/ai-diagnosis')
      
      expect(getUrgencyLevelDescription('low')).toContain('すぐに行動する必要はありません')
      expect(getUrgencyLevelDescription('medium')).toContain('3-6ヶ月以内に具体的な行動')
      expect(getUrgencyLevelDescription('high')).toContain('可能な限り早急に行動')
      expect(getUrgencyLevelDescription('不明レベル')).toContain('適切なタイミングで行動')
    })
  })
})