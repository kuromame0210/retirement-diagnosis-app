/**
 * V3段階的診断システム
 * Phase 1: Haiku即時診断 → Phase 2: Sonnet詳細パーソナル診断
 */

import { getJSTTimestamp } from '@/lib/utils/timestamp'
import { EmpatheticAdvisor } from '@/lib/v3/empathetic-advisor'

// ============================================
// 型定義
// ============================================

export interface StagedDiagnosisRequest {
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
  diagnosisType: 'partial' | 'final'
  answeredQuestions: number
  sessionId: string
}

// Phase 1: 即時診断結果（軽量）
export interface QuickDiagnosisResult {
  result_type: '転職推奨型' | '転職検討型' | '現職改善型' | '様子見型' | '要注意型'
  confidence_level: 'low' | 'medium' | 'high'
  urgency_level: 'low' | 'medium' | 'high'
  summary: string
  immediate_actions: string[]
  estimated_detail_time: number // 詳細分析の推定時間（秒）
  phase: 'quick'
}

// Phase 2: 詳細パーソナル診断結果
export interface DetailedPersonalDiagnosisResult {
  result_type: '転職推奨型' | '転職検討型' | '現職改善型' | '様子見型' | '要注意型'
  confidence_level: 'low' | 'medium' | 'high'
  urgency_level: 'low' | 'medium' | 'high'
  
  // 感情的共感と個人認識
  emotional_connection: {
    recognition: string          // あなたの○○という気持ち、よく分かります
    validation: string           // その感情は自然で、あなたが悪いわけではありません
    hope_message: string         // 必ず道はあります。一緒に歩んでいきましょう
  }
  
  // パーソナライズされた詳細分析
  personal_summary: string
  personal_insights: {
    your_situation_analysis: string      // あなたの現状分析
    emotional_pattern: string            // あなたの感情パターン
    stress_response: string              // あなたのストレス反応
    motivation_drivers: string[]         // あなたのモチベーション要因
    career_strengths: string[]           // あなたの強み
    growth_areas: string[]               // あなたの成長領域
  }
  
  // あなた専用のアクションプラン
  personalized_action_plan: {
    this_week: Array<{
      action: string
      why_for_you: string               // なぜあなたに必要か
      how_to_start: string              // あなたの場合の始め方
      expected_feeling: string          // 期待される気持ちの変化
    }>
    this_month: Array<{
      goal: string
      your_approach: string             // あなたに適したアプローチ
      success_indicators: string[]      // あなたの成功指標
      potential_challenges: string      // あなたが直面しそうな課題
      support_needed: string[]          // あなたに必要なサポート
    }>
    next_3_months: Array<{
      vision: string
      milestone_path: string[]          // あなた専用のマイルストーン
      decision_points: string[]         // あなたの判断ポイント
      backup_plans: string[]            // あなたの代替案
    }>
  }
  
  // あなたに最適化されたサービス推薦
  personalized_services: Array<{
    service_category: string
    why_recommended_for_you: string     // なぜあなたに推奨か
    timing_for_you: string              // あなたの最適タイミング
    expected_benefit_for_you: string    // あなたの期待効果
    how_to_choose: string               // あなたの選び方
  }>
  
  // あなたの将来シナリオ
  your_future_scenarios: {
    stay_current_path: {
      probability_for_you: string
      what_happens_to_you: string[]
      your_risks: string[]
      your_success_keys: string[]
    }
    change_path: {
      probability_for_you: string
      what_happens_to_you: string[]
      your_risks: string[]
      your_success_keys: string[]
    }
  }
  
  diagnosed_at: string
  phase: 'detailed'
  answered_questions: number
}

// ============================================
// Phase 1: Haiku即時診断
// ============================================

export async function executeQuickDiagnosis(request: StagedDiagnosisRequest): Promise<QuickDiagnosisResult> {
  try {
    const answers = prepareAnswersForQuickAnalysis(request)
    const prompt = buildQuickDiagnosisPrompt(answers, request.answeredQuestions)
    
    console.log('🚀 [Quick Diagnosis] Haiku分析開始')
    const startTime = Date.now()
    
    const result = await callClaudeAPI(prompt, 'haiku')
    const diagnosis = parseQuickDiagnosisResponse(result, request)
    
    const endTime = Date.now()
    console.log(`⚡ [Quick Diagnosis] 完了 (${endTime - startTime}ms)`)
    
    return diagnosis
    
  } catch (error) {
    console.error('❌ [Quick Diagnosis] エラー:', error)
    return createQuickFallbackDiagnosis(request)
  }
}

/**
 * Haiku用軽量プロンプト
 */
function buildQuickDiagnosisPrompt(answers: string, questionCount: number): string {
  return `あなたは経験豊富なキャリアカウンセラーです。以下の回答から即座に基本診断を行ってください。

【回答データ】
${answers}

【即時診断要件】
- 1-2秒で判断できる明確な診断
- 簡潔で分かりやすい表現
- 即座に実行できる行動提案

【回答形式】以下のJSONで簡潔に回答:
{
  "result_type": "転職推奨型|転職検討型|現職改善型|様子見型|要注意型",
  "confidence_level": "low|medium|high", 
  "urgency_level": "low|medium|high",
  "summary": "診断結果の要約（100字以内）",
  "immediate_actions": ["今日できること1", "今日できること2", "今日できること3"],
  "estimated_detail_time": 15
}`
}

/**
 * Haiku診断結果のパース
 */
function parseQuickDiagnosisResponse(response: string, request: StagedDiagnosisRequest): QuickDiagnosisResult {
  try {
    let jsonText = response.trim()
    
    if (jsonText.includes('```json')) {
      const start = jsonText.indexOf('```json') + 7
      const end = jsonText.lastIndexOf('```')
      jsonText = jsonText.substring(start, end).trim()
    }
    
    const parsed = JSON.parse(jsonText)
    
    return {
      result_type: parsed.result_type || '現職改善型',
      confidence_level: parsed.confidence_level || 'medium',
      urgency_level: parsed.urgency_level || 'medium',
      summary: parsed.summary || '基本的な診断結果をお伝えします',
      immediate_actions: parsed.immediate_actions || ['現状の整理', '目標の明確化', '次の行動計画'],
      estimated_detail_time: parsed.estimated_detail_time || 15,
      phase: 'quick'
    }
    
  } catch (error) {
    console.error('Quick diagnosis parse error:', error)
    return createQuickFallbackDiagnosis(request)
  }
}

// ============================================
// Phase 2: Sonnet詳細パーソナル診断
// ============================================

export async function executeDetailedPersonalDiagnosis(request: StagedDiagnosisRequest): Promise<DetailedPersonalDiagnosisResult> {
  try {
    const answers = prepareAnswersForDetailedAnalysis(request)
    
    // 感情共感分析の実行
    const empathyAdvisor = new EmpatheticAdvisor()
    const answersMap = {
      q1: request.q1_text || '',
      q2: request.q2_text || '',
      q3: request.q3_text || '',
      q4: request.q4_text || '',
      q5: request.q5_text || '',
      q6: request.q6_text || '',
      q7: request.q7_text || '',
      q8: request.q8_text || '',
      q9: request.q9_text || '',
      q10: request.q10_text || ''
    }
    
    const emotionalState = empathyAdvisor.analyzeEmotionalState(answersMap)
    const empathyMessage = empathyAdvisor.generateEmpatheticMessage(emotionalState, answersMap)
    
    const prompt = buildDetailedPersonalPrompt(answers, request.answeredQuestions, empathyMessage)
    
    console.log('🧠 [Detailed Personal Diagnosis] Sonnet分析開始 (感情共感強化版)')
    const startTime = Date.now()
    
    const result = await callClaudeAPI(prompt, 'sonnet')
    const diagnosis = parseDetailedPersonalResponse(result, request, empathyMessage)
    
    const endTime = Date.now()
    console.log(`🎯 [Detailed Personal Diagnosis] 完了 (${endTime - startTime}ms)`)
    
    return diagnosis
    
  } catch (error) {
    console.error('❌ [Detailed Personal Diagnosis] エラー:', error)
    return createDetailedFallbackDiagnosis(request)
  }
}

/**
 * Sonnet用詳細パーソナルプロンプト（感情共感強化版）
 */
function buildDetailedPersonalPrompt(answers: string, questionCount: number, empathyMessage?: any): string {
  return `あなたは温かく共感的なAIキャリアカウンセラーとして、この方の心に寄り添いながら、深く個別化されたパーソナル診断を実行してください。

【最重要】感情ファーストアプローチ
1. まず、この方の感情に共感し、受け入れることから始める
2. 「あなたの気持ち、よく分かります」という姿勢で一貫する
3. 強みを見つけ、価値を認め、希望を示す
4. 具体的で実行しやすいマイクロアクション（5-15分）を提案
5. 「あなたの場合は...」「あなたにとって...」の個人視点を徹底

【感情読み取り重要ポイント】
- 言葉の選び方から性格・価値観を読み取る
- 表現の強弱から感情の深度を測る  
- 文脈から隠れた願望や恐れを察知
- その人だけの物語として理解する

【回答データ】
${answers}

【パーソナライズ分析要件】
1. この方の言葉の選び方、表現から性格・価値観を読み取る
2. この方の感情パターンと反応の傾向を分析
3. この方の状況に最適化された具体的な行動プランを設計
4. この方の強みと課題を個別に特定
5. この方の人生観・働き方観に基づいたアドバイス

【回答形式】以下のJSONで、感情共感を最重視し、「あなた」視点で完全にパーソナライズして回答:

{
  "result_type": "診断タイプ",
  "confidence_level": "high", 
  "urgency_level": "判定結果",
  "personal_summary": "「あなたの○○という気持ち、よく分かります」から始まり、あなたの感情に共感し、強みを認め、希望を示す温かいメッセージ（250-300字）",
  
  "emotional_connection": {
    "recognition": "あなたが感じている○○という気持ち、痛いほどよく分かります",
    "validation": "そう感じるのは当然で、あなたが○○だからこそです。あなたは何も悪くありません",
    "hope_message": "でも大丈夫。あなたには必ず道があります。一緒に見つけていきましょう"
  },
  "personal_insights": {
    "your_situation_analysis": "あなたの回答から見える、あなた独特の状況と背景",
    "emotional_pattern": "あなたの感情の動きパターンと特徴", 
    "stress_response": "あなたがストレスにどう反応するかの傾向",
    "motivation_drivers": ["あなたのやる気の源1", "源2", "源3"],
    "career_strengths": ["あなたの強み1", "強み2", "強み3"],
    "growth_areas": ["あなたの成長領域1", "領域2"]
  },
  "personalized_action_plan": {
    "this_week": [
      {
        "action": "あなたが今週できる具体的行動",
        "why_for_you": "なぜあなたにこれが必要か",
        "how_to_start": "あなたの性格に合った始め方",
        "expected_feeling": "あなたが感じるであろう変化"
      }
    ],
    "this_month": [
      {
        "goal": "あなたの1ヶ月目標", 
        "your_approach": "あなたに適したアプローチ方法",
        "success_indicators": ["あなたの成功指標1", "指標2"],
        "potential_challenges": "あなたが直面しそうな具体的課題",
        "support_needed": ["あなたに必要なサポート1", "サポート2"]
      }
    ],
    "next_3_months": [
      {
        "vision": "あなたの3ヶ月後のビジョン",
        "milestone_path": ["あなたのマイルストーン1", "マイルストーン2"],
        "decision_points": ["あなたの判断ポイント1", "ポイント2"],
        "backup_plans": ["あなたの代替案1", "代替案2"]
      }
    ]
  },
  "personalized_services": [
    {
      "service_category": "推奨サービス分野",
      "why_recommended_for_you": "あなたの状況・性格に基づく推奨理由",
      "timing_for_you": "あなたにとっての最適なタイミング",
      "expected_benefit_for_you": "あなたが得られる具体的効果",
      "how_to_choose": "あなたが選ぶ際のポイント"
    }
  ],
  "your_future_scenarios": {
    "stay_current_path": {
      "probability_for_you": "あなたの場合の実現可能性",
      "what_happens_to_you": ["あなたに起こること1", "起こること2"],
      "your_risks": ["あなたのリスク1", "リスク2"],
      "your_success_keys": ["あなたの成功鍵1", "成功鍵2"]
    },
    "change_path": {
      "probability_for_you": "あなたの場合の実現可能性", 
      "what_happens_to_you": ["あなたに起こること1", "起こること2"],
      "your_risks": ["あなたのリスク1", "リスク2"],
      "your_success_keys": ["あなたの成功鍵1", "成功鍵2"]
    }
  }
}`
}

/**
 * 詳細パーソナル診断結果のパース（改善版）
 */
function parseDetailedPersonalResponse(response: string, request: StagedDiagnosisRequest, empathyMessage?: any): DetailedPersonalDiagnosisResult {
  try {
    // 堅牢なJSON解析を使用
    const { RobustJsonParser, DetailedDiagnosisResultBuilder } = require('./improved-json-parser')
    
    console.log('🔍 [Detailed Parser] Starting robust JSON parsing...')
    const parseResult = RobustJsonParser.parseClaudeResponse(response)
    
    console.log(`📊 [Detailed Parser] Parse result: ${parseResult.success ? 'SUCCESS' : 'FAILED'} (${parseResult.method}, ${parseResult.confidence})`)
    
    // 結果を構築
    const result = DetailedDiagnosisResultBuilder.buildFromParsedData(parseResult, request, empathyMessage)
    
    console.log(`✅ [Detailed Parser] Built diagnosis result: ${result.result_type} (confidence: ${result.confidence_level})`)
    return result
    
  } catch (error) {
    console.error('❌ [Detailed Parser] Critical error:', error.message)
    
    // 最終フォールバック - 直接作成
    return createDetailedFallbackDiagnosis(request)
  }
}

// ============================================
// 共通ユーティリティ
// ============================================

/**
 * Claude API呼び出し（モデル別）
 */
async function callClaudeAPI(prompt: string, model: 'haiku' | 'sonnet'): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  
  const modelName = model === 'haiku' ? 'claude-3-haiku-20240307' : 'claude-3-5-sonnet-20241022'
  const maxTokens = model === 'haiku' ? 300 : 800
  const timeout = model === 'haiku' ? 10000 : 30000  // タイムアウトを延長: Haiku 10秒、Sonnet 30秒
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: maxTokens,
        temperature: model === 'haiku' ? 0 : 0.1,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.content[0].text
    
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

/**
 * 回答データ準備（共通）
 */
function prepareAnswersForQuickAnalysis(request: StagedDiagnosisRequest): string {
  return prepareAnswersForDetailedAnalysis(request)
}

function prepareAnswersForDetailedAnalysis(request: StagedDiagnosisRequest): string {
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
 * フォールバック診断作成
 */
function createQuickFallbackDiagnosis(request: StagedDiagnosisRequest): QuickDiagnosisResult {
  return {
    result_type: '現職改善型',
    confidence_level: 'low',
    urgency_level: 'medium',
    summary: 'システムエラーのため基本的な方向性をお伝えします。より詳細な分析もお試しください。',
    immediate_actions: [
      '現在の状況を整理してみる',
      '信頼できる人に相談する', 
      '小さな改善から始める'
    ],
    estimated_detail_time: 15,
    phase: 'quick'
  }
}

function createDetailedFallbackDiagnosis(request: StagedDiagnosisRequest): DetailedPersonalDiagnosisResult {
  return {
    result_type: '現職改善型',
    confidence_level: 'low',
    urgency_level: 'medium',
    emotional_connection: {
      recognition: 'システムの制限により十分な分析ができませんでしたが、あなたの状況はとても重要です',
      validation: 'どのような状況でも、あなたの感情や悩みは正当なものです',
      hope_message: '専門家との相談を通じて、きっと良い方向が見つかります'
    },
    personal_summary: 'システムエラーのため詳細分析ができませんでしたが、専門家相談をお勧めします。',
    personal_insights: {
      your_situation_analysis: 'あなたの状況をより詳しく分析するため、専門家との相談をお勧めします。',
      emotional_pattern: 'あなたの感情パターンについて、さらなる対話が必要です。',
      stress_response: 'あなたのストレス対処法を一緒に見つけていきましょう。',
      motivation_drivers: ['詳細分析が必要'],
      career_strengths: ['個別相談で明確化'],
      growth_areas: ['専門家と相談']
    },
    personalized_action_plan: {
      this_week: [{
        action: '専門家への相談を検討する',
        why_for_you: 'より詳細で個別化された分析のため',
        how_to_start: 'キャリアカウンセラーを探してみる',
        expected_feeling: '方向性が明確になる安心感'
      }],
      this_month: [{
        goal: '専門的なキャリア相談を受ける',
        your_approach: 'あなたに合った相談方法を選ぶ',
        success_indicators: ['具体的行動計画の取得'],
        potential_challenges: '相談先選びの迷い',
        support_needed: ['時間確保', '相談費用']
      }],
      next_3_months: [{
        vision: '明確なキャリア戦略の策定',
        milestone_path: ['現状分析完了', '目標設定', '行動開始'],
        decision_points: ['相談結果の評価', '方向性の決定'],
        backup_plans: ['複数の選択肢検討', '段階的アプローチ']
      }]
    },
    personalized_services: [{
      service_category: 'career_counseling',
      why_recommended_for_you: 'あなたの状況に最適化された分析のため',
      timing_for_you: '早期の相談が効果的',
      expected_benefit_for_you: '個別化された具体的アドバイス',
      how_to_choose: 'あなたの価値観に合う専門家を選ぶ'
    }],
    your_future_scenarios: {
      stay_current_path: {
        probability_for_you: '詳細分析により判定',
        what_happens_to_you: ['専門相談による明確化が必要'],
        your_risks: ['不明確な状況の継続'],
        your_success_keys: ['適切な相談先の選択']
      },
      change_path: {
        probability_for_you: '個別相談により判定',
        what_happens_to_you: ['専門的サポートによる方向性確立'],
        your_risks: ['準備不足による失敗'],
        your_success_keys: ['十分な準備と専門的助言']
      }
    },
    diagnosed_at: getJSTTimestamp(),
    phase: 'detailed',
    answered_questions: request.answeredQuestions
  }
}