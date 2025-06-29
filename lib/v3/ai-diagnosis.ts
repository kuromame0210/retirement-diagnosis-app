/**
 * V3診断システム - AI診断機能
 * Claude AIを使用した退職診断分析
 */

import { getJSTTimestamp } from '@/lib/utils/timestamp'

// ============================================
// 型定義
// ============================================

export interface V3DiagnosisRequest {
  // 回答データ（カラムベース）
  q1_text?: string
  q2_text?: string
  q3_text?: string
  q4_text?: string
  q5_text?: string
  q6_text?: string
  q7_text?: string
  q8_text?: string
  q9_text?: string
  q10_text?: string
  
  // 診断設定
  diagnosisType: 'partial' | 'final'
  answeredQuestions: number
  sessionId: string
}

export interface V3DiagnosisResult {
  // 診断結果タイプ
  result_type: '転職推奨型' | '転職検討型' | '現職改善型' | '様子見型' | '要注意型'
  
  // 信頼度・緊急度
  confidence_level: 'low' | 'medium' | 'high'
  urgency_level: 'low' | 'medium' | 'high'
  
  // メイン分析
  summary: string
  detailed_analysis: {
    emotional_state: string        // 感情状態の詳細分析
    stress_factors: string[]       // ストレス要因の具体的な分析
    motivation_level: string       // モチベーション状態の深い洞察
    career_concerns: string[]      // キャリア不安の根本原因
    work_environment: string       // 職場環境の詳細評価
    future_outlook: string         // 将来への見通しと具体的な予測
    psychological_impact: string   // 心理的影響の分析
    skill_assessment: string       // スキル・強みの客観的評価
    market_positioning: string     // 転職市場での位置づけ分析
  }
  
  // 多角的洞察
  multifaceted_insights: {
    psychological_perspective: string    // 心理学的洞察
    strategic_perspective: string        // 戦略的洞察
    economic_perspective: string         // 経済的洞察
    life_design_perspective: string      // ライフデザイン洞察
    organizational_perspective: string   // 組織行動学的洞察
    market_trends_perspective: string    // 市場動向洞察
  }

  // シナリオプランニング
  scenario_planning: {
    stay_current_scenario: {
      probability: string
      outcomes: string[]
      risks: string[]
      success_factors: string[]
    }
    job_change_scenario: {
      probability: string
      outcomes: string[]
      risks: string[]
      success_factors: string[]
    }
    hybrid_scenario: {
      probability: string
      outcomes: string[]
      risks: string[]
      success_factors: string[]
    }
  }
  
  // アクションプラン（詳細版）
  action_plan: {
    immediate_actions: Array<{
      action: string
      reason: string
      timeline: string
      difficulty_level: 'easy' | 'medium' | 'hard'
      expected_impact: string
    }>
    short_term_goals: Array<{
      goal: string
      specific_steps: string[]
      success_metrics: string
      timeline: string
      resources_needed: string[]
    }>
    long_term_goals: Array<{
      goal: string
      milestone_breakdown: string[]
      potential_obstacles: string[]
      success_criteria: string
      timeline: string
    }>
  }
  
  // 業界・職種別アドバイス
  industry_specific_advice: {
    current_industry_trends: string
    transferable_skills: string[]
    recommended_career_paths: string[]
    skill_gap_analysis: string
    market_demand_insights: string
  }
  
  // サービス推奨（詳細版）
  service_recommendations: Array<{
    category: 'transfer_agent' | 'skill_up' | 'career_counseling' | 'stress_management' | 'financial_planning' | 'networking'
    priority: 'high' | 'medium' | 'low'
    reason: string
    specific_services: string[]
    timing_recommendation: string
    expected_outcomes: string
  }>
  
  // 診断メタデータ
  diagnosed_at: string
  diagnosis_version: string
  answered_questions: number
}

// ============================================
// AI診断実行関数
// ============================================

/**
 * Claude AIによる退職診断実行
 */
export async function executeV3Diagnosis(request: V3DiagnosisRequest): Promise<V3DiagnosisResult> {
  try {
    // 回答データの準備
    const answers = prepareAnswersForAnalysis(request)
    
    // AI分析プロンプトの構築
    const prompt = buildDiagnosisPrompt(answers, request.diagnosisType, request.answeredQuestions)
    
    // Claude API呼び出し
    const analysisResult = await callClaudeAPI(prompt)
    
    // 結果のパース・構造化
    const diagnosisResult = parseAIResponse(analysisResult, request)
    
    console.log(`✅ [AI Diagnosis] ${request.diagnosisType} diagnosis completed:`, {
      sessionId: request.sessionId,
      resultType: diagnosisResult.result_type,
      confidenceLevel: diagnosisResult.confidence_level
    })
    
    return diagnosisResult
    
  } catch (error) {
    console.error('❌ [AI Diagnosis] Error:', error)
    
    // フォールバック診断結果
    return createFallbackDiagnosis(request)
  }
}

/**
 * 回答データを分析用に整理
 */
function prepareAnswersForAnalysis(request: V3DiagnosisRequest): string {
  const questions = [
    { num: 1, text: '今の仕事について、率直にどう感じていますか？', answer: request.q1_text },
    { num: 2, text: '仕事で最もストレスを感じるのはどのような時ですか？', answer: request.q2_text },
    { num: 3, text: '朝起きた時、仕事に対するモチベーションやエネルギーはどの程度ありますか？', answer: request.q3_text },
    { num: 4, text: 'あなたにとって理想的な働き方や仕事環境はどのようなものですか？', answer: request.q4_text },
    { num: 5, text: '現在のキャリアで最も不安に感じていることは何ですか？', answer: request.q5_text },
    { num: 6, text: '今後身につけたいスキルや成長したい分野はありますか？', answer: request.q6_text },
    { num: 7, text: 'ワークライフバランスについて、現在の状況と理想のバランスを教えてください。', answer: request.q7_text },
    { num: 8, text: '現在の職場の雰囲気や企業文化について、どのように感じていますか？', answer: request.q8_text },
    { num: 9, text: '給与や待遇面で感じていることがあれば教えてください。', answer: request.q9_text },
    { num: 10, text: '現状を変えるために、どの程度行動を起こす準備ができていますか？', answer: request.q10_text }
  ]
  
  const answeredQuestions = questions.filter(q => q.answer && q.answer.trim().length > 0)
  
  return answeredQuestions.map(q => 
    `【質問${q.num}】${q.text}\n【回答】${q.answer}\n`
  ).join('\n')
}

/**
 * Claude AI分析プロンプトの構築（多角的詳細分析版）
 */
function buildDiagnosisPrompt(answers: string, diagnosisType: 'partial' | 'final', answeredQuestions: number): string {
  const basePrompt = `あなたは複数の専門領域を持つキャリアコンサルティングチームです。以下の回答を基に、多角的な視点から深く詳細なキャリア診断を実行してください。

【回答データ】
${answers}

【分析チーム構成】
- 心理カウンセラー: メンタルヘルス・感情状態の専門家
- キャリアアドバイザー: 転職・昇進戦略の専門家  
- 産業心理学者: 職場環境・組織文化の専門家
- ファイナンシャルプランナー: 経済面・ライフプラン設計の専門家
- ライフコーチ: ワークライフバランス・人生設計の専門家
- 業界アナリスト: 市場動向・将来性分析の専門家

【多角的診断要件】
1. 心理学的視点: 感情パターン、ストレス反応、回復力、モチベーション源の分析
2. キャリア戦略視点: スキル棚卸し、市場価値、成長軌道、競争優位性の評価
3. 組織行動学視点: 職場適応性、コミュニケーションスタイル、リーダーシップ適性
4. 経済学的視点: 収入最適化、投資価値、機会コスト、リスク・リターン分析
5. ライフデザイン視点: 人生価値観、ライフステージ、家族・社会との調和
6. 業界・市場視点: トレンド分析、将来性予測、ポジショニング戦略

【統合的診断アプローチ】
- 短期・中期・長期の3層時間軸での分析
- リスク要因と機会要因の両面評価  
- 複数のシナリオプランニング
- 意思決定のための判断基準明示
- 回答者の価値観・性格に基づく個別最適化

【診断タイプ】: 転職推奨型/転職検討型/現職改善型/様子見型/要注意型

【回答形式】: 以下のJSONフォーマットで多角的に詳細回答してください

{
  "result_type": "診断タイプ",
  "confidence_level": "low/medium/high",
  "urgency_level": "low/medium/high",
  "summary": "統合的診断結果の要約（200-250字）",
  "detailed_analysis": {
    "emotional_state": "心理カウンセラー視点：感情状態の詳細分析（現在の精神的負荷、ストレス反応、回復力、感情調整能力）",
    "stress_factors": ["ストレス要因の多層分析", "トリガー特定と対処戦略", "予防的アプローチ"],
    "motivation_level": "モチベーション源の深層分析（内発的・外発的動機、持続要因、エネルギー回復方法）",
    "career_concerns": ["キャリア不安の根本分析", "市場変化への適応課題", "スキル陳腐化リスク"],
    "work_environment": "産業心理学者視点：職場環境の包括評価（組織文化適合性、人間関係動態、成長機会、改善可能性）",
    "future_outlook": "3つのシナリオ予測（楽観・現実・悲観シナリオでの将来予測）",
    "psychological_impact": "心理的影響の多面分析（自己効力感、自尊心、アイデンティティ、メンタルヘルス）",
    "skill_assessment": "キャリアアドバイザー視点：スキル・強みの戦略的評価（市場価値、希少性、発展可能性）",
    "market_positioning": "業界アナリスト視点：転職市場でのポジショニング分析（競争環境、差別化要因、市場機会）"
  },
  "multifaceted_insights": {
    "psychological_perspective": "心理学的洞察（性格特性、行動パターン、ストレス耐性、成長マインドセット）",
    "strategic_perspective": "戦略的洞察（キャリア戦略、競争優位性確立、ポートフォリオ構築）",
    "economic_perspective": "ファイナンシャルプランナー視点：経済的洞察（収入最適化、投資価値、機会コスト分析）",
    "life_design_perspective": "ライフコーチ視点：人生設計洞察（価値観整合性、ライフバランス、長期幸福度）",
    "organizational_perspective": "組織行動学的洞察（リーダーシップ適性、チーム適合性、企業文化マッチング）",
    "market_trends_perspective": "市場動向洞察（業界トレンド、技術変化、将来需要予測）"
  },
  "scenario_planning": {
    "stay_current_scenario": {
      "probability": "現職継続シナリオの実現可能性（%）",
      "outcomes": ["予想される結果1", "予想される結果2"],
      "risks": ["主要リスク1", "主要リスク2"],
      "success_factors": ["成功要因1", "成功要因2"]
    },
    "job_change_scenario": {
      "probability": "転職シナリオの実現可能性（%）",
      "outcomes": ["予想される結果1", "予想される結果2"],
      "risks": ["主要リスク1", "主要リスク2"],
      "success_factors": ["成功要因1", "成功要因2"]
    },
    "hybrid_scenario": {
      "probability": "段階的変化シナリオの実現可能性（%）",
      "outcomes": ["予想される結果1", "予想される結果2"],
      "risks": ["主要リスク1", "主要リスク2"],
      "success_factors": ["成功要因1", "成功要因2"]
    }
  },
  "action_plan": {
    "immediate_actions": [
      {
        "action": "即座に取るべき具体的行動",
        "reason": "なぜこの行動が必要か",
        "timeline": "実行期間",
        "difficulty_level": "easy/medium/hard",
        "expected_impact": "期待される効果"
      }
    ],
    "short_term_goals": [
      {
        "goal": "1-3ヶ月の短期目標",
        "specific_steps": ["具体的ステップ1", "具体的ステップ2"],
        "success_metrics": "成功指標",
        "timeline": "達成期限",
        "resources_needed": ["必要リソース1", "必要リソース2"]
      }
    ],
    "long_term_goals": [
      {
        "goal": "6ヶ月-1年の長期目標",
        "milestone_breakdown": ["マイルストーン1", "マイルストーン2"],
        "potential_obstacles": ["予想される障害1", "対処法"],
        "success_criteria": "成功基準",
        "timeline": "達成期限"
      }
    ]
  },
  "industry_specific_advice": {
    "current_industry_trends": "業界の最新動向と将来性",
    "transferable_skills": ["他業界で活用可能なスキル1", "スキル2"],
    "recommended_career_paths": ["推奨キャリアパス1", "パス2"],
    "skill_gap_analysis": "スキルギャップと習得優先度",
    "market_demand_insights": "市場需要の分析と今後の展望"
  },
  "service_recommendations": [
    {
      "category": "transfer_agent/skill_up/career_counseling/stress_management/financial_planning/networking",
      "priority": "high/medium/low",
      "reason": "推奨理由の詳細",
      "specific_services": ["具体的サービス1", "サービス2"],
      "timing_recommendation": "利用タイミング",
      "expected_outcomes": "期待される成果"
    }
  ]
}`
  
  return basePrompt.trim()
}

/**
 * Claude API呼び出し（高速化版）
 */
async function callClaudeAPI(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  
  console.log('🚀 [Claude API] リクエスト開始')
  const startTime = Date.now()
  
  // AbortControllerでタイムアウト設定
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒タイムアウト
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // より高速なモデル
        max_tokens: 500, // さらに削減: 800 → 500
        temperature: 0, // 最高速度: 0.1 → 0
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    const endTime = Date.now()
    console.log(`⚡ [Claude API] 完了 (${endTime - startTime}ms)`)
    
    return data.content[0].text
    
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      console.error('⏰ [Claude API] タイムアウト (10秒)')
      throw new Error('Claude API request timeout (10 seconds)')
    }
    throw error
  }
}

/**
 * AI回答のパース・構造化
 */
function parseAIResponse(response: string, request: V3DiagnosisRequest): V3DiagnosisResult {
  try {
    // JSONの抽出（```json...```のマークダウンを考慮）
    let jsonText = response.trim()
    
    if (jsonText.includes('```json')) {
      const start = jsonText.indexOf('```json') + 7
      const end = jsonText.lastIndexOf('```')
      jsonText = jsonText.substring(start, end).trim()
    } else if (jsonText.includes('```')) {
      const start = jsonText.indexOf('```') + 3
      const end = jsonText.lastIndexOf('```')
      jsonText = jsonText.substring(start, end).trim()
    }
    
    const parsed = JSON.parse(jsonText)
    
    // 必須フィールドの補完
    const result: V3DiagnosisResult = {
      result_type: parsed.result_type || '現職改善型',
      confidence_level: parsed.confidence_level || 'medium',
      urgency_level: parsed.urgency_level || 'medium',
      summary: parsed.summary || '分析結果の要約がありません',
      detailed_analysis: {
        emotional_state: parsed.detailed_analysis?.emotional_state || '分析中',
        stress_factors: parsed.detailed_analysis?.stress_factors || [],
        motivation_level: parsed.detailed_analysis?.motivation_level || '分析中',
        career_concerns: parsed.detailed_analysis?.career_concerns || [],
        work_environment: parsed.detailed_analysis?.work_environment || '分析中',
        future_outlook: parsed.detailed_analysis?.future_outlook || '分析中',
        psychological_impact: parsed.detailed_analysis?.psychological_impact || '分析中',
        skill_assessment: parsed.detailed_analysis?.skill_assessment || '分析中',
        market_positioning: parsed.detailed_analysis?.market_positioning || '分析中'
      },
      multifaceted_insights: {
        psychological_perspective: parsed.multifaceted_insights?.psychological_perspective || '心理学的分析を実行中',
        strategic_perspective: parsed.multifaceted_insights?.strategic_perspective || '戦略的分析を実行中',
        economic_perspective: parsed.multifaceted_insights?.economic_perspective || '経済的分析を実行中',
        life_design_perspective: parsed.multifaceted_insights?.life_design_perspective || 'ライフデザイン分析を実行中',
        organizational_perspective: parsed.multifaceted_insights?.organizational_perspective || '組織行動学的分析を実行中',
        market_trends_perspective: parsed.multifaceted_insights?.market_trends_perspective || '市場動向分析を実行中'
      },
      scenario_planning: {
        stay_current_scenario: {
          probability: parsed.scenario_planning?.stay_current_scenario?.probability || '分析中',
          outcomes: parsed.scenario_planning?.stay_current_scenario?.outcomes || ['現職継続の結果を分析中'],
          risks: parsed.scenario_planning?.stay_current_scenario?.risks || ['リスク分析中'],
          success_factors: parsed.scenario_planning?.stay_current_scenario?.success_factors || ['成功要因分析中']
        },
        job_change_scenario: {
          probability: parsed.scenario_planning?.job_change_scenario?.probability || '分析中',
          outcomes: parsed.scenario_planning?.job_change_scenario?.outcomes || ['転職の結果を分析中'],
          risks: parsed.scenario_planning?.job_change_scenario?.risks || ['リスク分析中'],
          success_factors: parsed.scenario_planning?.job_change_scenario?.success_factors || ['成功要因分析中']
        },
        hybrid_scenario: {
          probability: parsed.scenario_planning?.hybrid_scenario?.probability || '分析中',
          outcomes: parsed.scenario_planning?.hybrid_scenario?.outcomes || ['段階的変化の結果を分析中'],
          risks: parsed.scenario_planning?.hybrid_scenario?.risks || ['リスク分析中'],
          success_factors: parsed.scenario_planning?.hybrid_scenario?.success_factors || ['成功要因分析中']
        }
      },
      action_plan: {
        immediate_actions: parsed.action_plan?.immediate_actions || [],
        short_term_goals: parsed.action_plan?.short_term_goals || [],
        long_term_goals: parsed.action_plan?.long_term_goals || []
      },
      service_recommendations: parsed.service_recommendations || [],
      diagnosed_at: getJSTTimestamp(),
      diagnosis_version: 'v3.1',
      answered_questions: request.answeredQuestions
    }
    
    return result
    
  } catch (error) {
    console.error('AI response parse error:', error)
    return createFallbackDiagnosis(request)
  }
}

/**
 * フォールバック診断結果の作成（多角的版）
 */
function createFallbackDiagnosis(request: V3DiagnosisRequest): V3DiagnosisResult {
  return {
    result_type: '現職改善型',
    confidence_level: 'low',
    urgency_level: 'medium',
    summary: 'システムエラーのため詳細な分析ができませんでしたが、基本的な方向性をご提案いたします。より詳細な分析については、時間をおいて再度お試しいただくか、専門家にご相談ください。',
    detailed_analysis: {
      emotional_state: '現在の状況を総合的に見直し、ストレス要因の特定と対処方法を検討することをお勧めします。',
      stress_factors: ['システム分析制限', '詳細分析が必要'],
      motivation_level: 'ご自身の価値観と現在の環境の適合性を改めて評価してみてください。',
      career_concerns: ['キャリア方向性の明確化が必要', '市場価値の客観的評価が重要'],
      work_environment: '現在の職場環境について、改善可能な点と難しい点を整理することが有効です。',
      future_outlook: '複数のシナリオを想定した計画的なアプローチをお勧めします。',
      psychological_impact: 'メンタルヘルスの維持を最優先に、無理のない範囲での行動計画が重要です。',
      skill_assessment: '現在のスキルの棚卸しと、市場での競争力評価を行うことをお勧めします。',
      market_positioning: '業界動向と個人のポジションを客観的に分析することが必要です。'
    },
    multifaceted_insights: {
      psychological_perspective: 'ストレス管理と心理的安定を基盤とした意思決定が重要です。急激な変化よりも段階的なアプローチを検討してください。',
      strategic_perspective: '現状維持、段階的改善、環境変化の3つの選択肢を比較検討し、リスクとリターンを評価することをお勧めします。',
      economic_perspective: '短期的な経済的安定と長期的な成長可能性のバランスを考慮した計画を立てることが重要です。',
      life_design_perspective: 'キャリアだけでなく、人生全体の価値観と優先順位を整理し、統合的な人生設計を検討してください。',
      organizational_perspective: '現在の組織文化との適合性と、理想的な働き方について深く考察することをお勧めします。',
      market_trends_perspective: '業界の将来性と個人のスキル発展方向を照らし合わせた戦略的思考が必要です。'
    },
    scenario_planning: {
      stay_current_scenario: {
        probability: '詳細分析により判定',
        outcomes: ['現職での成長機会の追求', '段階的な改善による満足度向上'],
        risks: ['現状の問題の継続', '機会損失の可能性'],
        success_factors: ['積極的な改善提案', 'スキルアップへの投資']
      },
      job_change_scenario: {
        probability: '個別状況により判定',
        outcomes: ['新しい環境での成長機会', '理想に近い働き方の実現'],
        risks: ['適応期間のストレス', '経済的な一時的不安定'],
        success_factors: ['十分な準備期間', '市場価値の向上']
      },
      hybrid_scenario: {
        probability: '多くの場合で有効',
        outcomes: ['段階的な変化による安定した移行', 'リスク分散による安心感'],
        risks: ['変化のスピードが遅い', '中途半端な結果の可能性'],
        success_factors: ['明確なマイルストーン設定', '柔軟な計画調整']
      }
    },
    action_plan: {
      immediate_actions: [
        {
          action: '現状の客観的な整理と分析',
          reason: '問題の本質と優先順位を明確にするため',
          timeline: '1-2週間',
          difficulty_level: 'easy',
          expected_impact: '方向性の明確化'
        }
      ],
      short_term_goals: [
        {
          goal: '専門家への相談または再診断の実施',
          specific_steps: ['信頼できる相談先の選定', '具体的な相談内容の準備'],
          success_metrics: '客観的な第三者視点の獲得',
          timeline: '1ヶ月以内',
          resources_needed: ['時間確保', '相談費用の検討']
        }
      ],
      long_term_goals: [
        {
          goal: '包括的なキャリア戦略の策定',
          milestone_breakdown: ['現状分析完了', '選択肢の洗い出し', '実行計画の作成'],
          potential_obstacles: ['情報不足', '意思決定の迷い'],
          success_criteria: '具体的で実行可能な行動計画の完成',
          timeline: '3-6ヶ月'
        }
      ]
    },
    industry_specific_advice: {
      current_industry_trends: '詳細分析が制限されているため、業界専門家への相談を推奨します。',
      transferable_skills: ['詳細分析により特定'],
      recommended_career_paths: ['個別相談により明確化'],
      skill_gap_analysis: '専門的な評価が必要です',
      market_demand_insights: '業界動向の専門的分析を推奨します'
    },
    service_recommendations: [
      {
        category: 'career_counseling',
        priority: 'high',
        reason: 'システム制限により、専門家による詳細分析が最も有効です',
        specific_services: ['キャリアカウンセリング', '適性診断'],
        timing_recommendation: '早期の相談を推奨',
        expected_outcomes: '客観的分析と具体的方向性の獲得'
      }
    ],
    diagnosed_at: getJSTTimestamp(),
    diagnosis_version: 'v3.2-multifaceted-fallback',
    answered_questions: request.answeredQuestions
  }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 診断結果タイプの説明取得
 */
export function getDiagnosisTypeDescription(resultType: string): string {
  const descriptions = {
    '転職推奨型': '現在の職場環境が改善困難で、転職を積極的に推奨します',
    '転職検討型': '課題はありますが、転職を含めた選択肢を検討することをお勧めします',
    '現職改善型': '現在の職場での課題解決や改善に取り組むことをお勧めします',
    '様子見型': '現状に大きな問題はなく、しばらく様子を見ることをお勧めします',
    '要注意型': 'ストレスレベルが高く、メンタルヘルス面でのケアが必要です'
  }
  
  return descriptions[resultType] || '診断結果の詳細な説明は後日提供されます'
}

/**
 * 緊急度レベルの説明取得
 */
export function getUrgencyLevelDescription(urgencyLevel: string): string {
  const descriptions = {
    'low': 'すぐに行動する必要はありませんが、定期的に状況を見直しましょう',
    'medium': '3-6ヶ月以内に具体的な行動を起こすことをお勧めします',
    'high': '可能な限り早急に行動を起こすことが必要です'
  }
  
  return descriptions[urgencyLevel] || '状況に応じて適切なタイミングで行動してください'
}