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
    emotional_state: string        // 感情状態
    stress_factors: string[]       // ストレス要因
    motivation_level: string       // モチベーション状態
    career_concerns: string[]      // キャリア不安
    work_environment: string       // 職場環境
    future_outlook: string         // 将来への見通し
  }
  
  // アクションプラン
  action_plan: {
    immediate_actions: string[]    // 即座に取るべき行動
    short_term_goals: string[]     // 短期目標（1-3ヶ月）
    long_term_goals: string[]      // 長期目標（6ヶ月-1年）
  }
  
  // サービス推奨
  service_recommendations: Array<{
    category: 'transfer_agent' | 'skill_up' | 'career_counseling' | 'stress_management'
    priority: 'high' | 'medium' | 'low'
    reason: string
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
 * Claude AI分析プロンプトの構築（超高速版）
 */
function buildDiagnosisPrompt(answers: string, diagnosisType: 'partial' | 'final', answeredQuestions: number): string {
  const basePrompt = `退職診断を実行してください。

${answers}

タイプ選択: 転職推奨型/転職検討型/現職改善型/様子見型/要注意型

JSON回答:
{
  "result_type": "タイプ",
  "confidence_level": "medium",
  "urgency_level": "medium", 
  "summary": "100字以内の要約とアドバイス",
  "detailed_analysis": {
    "emotional_state": "感情状態",
    "stress_factors": ["要因1"],
    "motivation_level": "モチベーション", 
    "career_concerns": ["不安1"],
    "work_environment": "職場環境",
    "future_outlook": "将来見通し"
  },
  "action_plan": {
    "immediate_actions": ["行動1"],
    "short_term_goals": ["目標1"], 
    "long_term_goals": ["目標1"]
  },
  "service_recommendations": [
    {"category": "transfer_agent", "priority": "high", "reason": "理由"}
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
        future_outlook: parsed.detailed_analysis?.future_outlook || '分析中'
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
 * フォールバック診断結果の作成
 */
function createFallbackDiagnosis(request: V3DiagnosisRequest): V3DiagnosisResult {
  return {
    result_type: '現職改善型',
    confidence_level: 'low',
    urgency_level: 'medium',
    summary: 'システムエラーのため詳細な分析ができませんでした。回答内容を確認し、必要に応じて専門家にご相談ください。',
    detailed_analysis: {
      emotional_state: '分析できませんでした',
      stress_factors: ['システムエラー'],
      motivation_level: '分析できませんでした',
      career_concerns: ['詳細分析が必要'],
      work_environment: '分析できませんでした',
      future_outlook: '個別相談を推奨'
    },
    action_plan: {
      immediate_actions: ['専門家への相談を検討'],
      short_term_goals: ['状況の整理'],
      long_term_goals: ['キャリアプランの見直し']
    },
    service_recommendations: [
      {
        category: 'career_counseling',
        priority: 'high',
        reason: 'システムエラーのため個別相談を推奨'
      }
    ],
    diagnosed_at: getJSTTimestamp(),
    diagnosis_version: 'v3.1-fallback',
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