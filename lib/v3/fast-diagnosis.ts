/**
 * V3高速診断システム
 * 
 * 診断結果を先に表示し、サービス推薦を後から非同期で追加
 */

import { V3DiagnosisRequest, V3DiagnosisResult } from './ai-diagnosis'

/**
 * 超高速診断（5秒以内保証）
 * ルールベース + 軽量AI分析のハイブリッド
 */
export async function executeFastV3Diagnosis(request: V3DiagnosisRequest): Promise<V3DiagnosisResult> {
  try {
    // ルールベース診断（即座に実行）
    const ruleBasedResult = analyzeWithRules(request)
    
    // 軽量AI分析を並行実行（タイムアウト5秒）
    const aiEnhanced = await Promise.race([
      enhanceWithLightAI(request),
      createTimeoutPromise(5000) // 5秒でタイムアウト
    ])
    
    // ルールベース + AI分析の統合
    return aiEnhanced || ruleBasedResult
    
  } catch (error) {
    console.error('❌ [Fast Diagnosis] Error:', error)
    // フォールバック: ルールベースのみ
    return analyzeWithRules(request)
  }
}

/**
 * ルールベース診断（即座に実行）
 */
function analyzeWithRules(request: V3DiagnosisRequest): V3DiagnosisResult {
  const answers = Object.values(request).filter(v => typeof v === 'string' && v.length > 0)
  const answeredCount = answers.length
  
  // キーワード分析
  const allText = answers.join(' ').toLowerCase()
  
  // ストレス指標（より包括的に）
  const stressKeywords = [
    'ストレス', '辛い', '疲れ', 'つらい', 'きつい', '限界', 'パワハラ', 'ブラック',
    '上司', '不合理', '理不尽', '抵抗感', '嫌', 'いや', '出社', '行きたくない',
    '苦痛', '憂鬱', '不安', '心配', 'プレッシャー', '負担', 'しんどい'
  ]
  const stressScore = stressKeywords.filter(k => allText.includes(k)).length
  
  // 転職意欲指標
  const transferKeywords = [
    '転職', '辞めたい', '退職', '会社を変えたい', '新しい職場', '別の会社',
    '仕事を変える', '環境を変える', '逃げたい', '辞める', 'やめたい'
  ]
  const transferScore = transferKeywords.filter(k => allText.includes(k)).length
  
  // 成長意欲指標
  const growthKeywords = ['成長', 'スキル', '学び', 'キャリア', '向上', 'チャレンジ', '挑戦']
  const growthScore = growthKeywords.filter(k => allText.includes(k)).length
  
  // 診断ロジック（より敏感に）
  let resultType = '現職改善型'
  let urgencyLevel: 'low' | 'medium' | 'high' = 'medium'
  
  console.log('🔍 [Fast Diagnosis] スコア分析:', {
    stressScore, transferScore, growthScore, 
    allTextPreview: allText.substring(0, 100) + '...'
  })
  
  // 高ストレス状態の検出を厳しく
  if (stressScore >= 2) {
    resultType = '要注意型'
    urgencyLevel = 'high'
  } else if (transferScore >= 1) {
    resultType = '転職検討型'
    urgencyLevel = 'medium'
  } else if (stressScore >= 1) {
    resultType = '転職推奨型'
    urgencyLevel = 'medium'
  } else if (growthScore >= 2) {
    resultType = '現職改善型'
    urgencyLevel = 'low'
  } else {
    resultType = '様子見型'
    urgencyLevel = 'low'
  }
  
  console.log('🎯 [Fast Diagnosis] 判定結果:', { resultType, urgencyLevel })
  
  // 要約生成
  const summary = generateRuleSummary(resultType, stressScore, transferScore, growthScore)
  
  return {
    result_type: resultType as any,
    confidence_level: answeredCount >= 5 ? 'high' : answeredCount >= 3 ? 'medium' : 'low',
    urgency_level: urgencyLevel,
    summary,
    detailed_analysis: {
      emotional_state: stressScore >= 2 ? 'ストレス状態が高めです' : 'おおむね安定しています',
      stress_factors: stressScore > 0 ? ['職場環境', '業務負荷'] : [],
      motivation_level: growthScore >= 2 ? '前向きな意欲があります' : '標準的なレベルです',
      career_concerns: transferScore > 0 ? ['キャリアの方向性'] : [],
      work_environment: stressScore >= 2 ? '改善が必要な要素があります' : '許容範囲内です',
      future_outlook: transferScore >= 2 ? '変化を求めています' : '現状維持志向です'
    },
    action_plan: {
      immediate_actions: generateImmediateActions(resultType),
      short_term_goals: generateShortTermGoals(resultType),
      long_term_goals: generateLongTermGoals(resultType)
    },
    service_recommendations: [],
    diagnosed_at: new Date().toISOString(),
    diagnosis_version: 'v3.2-fast',
    answered_questions: answeredCount
  }
}

/**
 * 軽量AI分析（5秒タイムアウト）
 */
async function enhanceWithLightAI(request: V3DiagnosisRequest): Promise<V3DiagnosisResult | null> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return null
    
    const answers = Object.values(request).filter(v => typeof v === 'string' && v.length > 0)
    const prompt = `退職診断：${answers.join('。')}

タイプ選択（転職推奨型/転職検討型/現職改善型/様子見型/要注意型）と50字要約を出力：
{"result_type":"タイプ","summary":"要約"}`
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) return null
    
    const data = await response.json()
    const aiResult = JSON.parse(data.content[0].text)
    
    // ルールベース結果にAI結果をマージ
    const ruleResult = analyzeWithRules(request)
    return {
      ...ruleResult,
      result_type: aiResult.result_type,
      summary: aiResult.summary
    }
    
  } catch (error) {
    console.error('⚡ [Light AI] タイムアウトまたはエラー:', error)
    return null
  }
}

/**
 * タイムアウトPromise
 */
function createTimeoutPromise(ms: number): Promise<null> {
  return new Promise(resolve => setTimeout(() => resolve(null), ms))
}

/**
 * ルールベース要約生成
 */
function generateRuleSummary(resultType: string, stressScore: number, transferScore: number, growthScore: number): string {
  const summaries = {
    '転職推奨型': '職場でのストレスが高く、心身への負担が懸念されます。転職エージェントへの相談や退職代行サービスの検討をお勧めします。',
    '転職検討型': '現在の職場環境に課題があり、転職を含めた選択肢を検討する時期です。まずは情報収集から始めてみましょう。',
    '現職改善型': '成長への意欲が見られます。現在の職場でのスキルアップや環境改善に取り組むことで状況が好転する可能性があります。',
    '様子見型': '現状に大きな問題はありませんが、定期的に状況を見直し、必要に応じて行動計画を調整していきましょう。',
    '要注意型': '上司との関係や出社への強い抵抗感など、深刻なストレス状態が見られます。メンタルヘルスのケアを最優先に、専門家や退職代行サービスへの相談を強く推奨します。'
  }
  
  // スコアに基づいてより具体的なアドバイスを追加
  let additionalAdvice = ''
  if (stressScore >= 3) {
    additionalAdvice = ' 特に人間関係や職場環境に関する問題が深刻です。'
  } else if (transferScore >= 2) {
    additionalAdvice = ' 転職への意欲が高いため、計画的に進めることが重要です。'
  }
  
  return (summaries[resultType] || '現在の状況を分析し、適切な対策を検討していきましょう。') + additionalAdvice
}

/**
 * 即座の行動プラン生成
 */
function generateImmediateActions(resultType: string): string[] {
  const actions = {
    '転職推奨型': ['転職エージェントに相談', 'ストレス軽減策の実施'],
    '転職検討型': ['キャリアの棚卸し', '転職市場の情報収集'],
    '現職改善型': ['上司との面談設定', 'スキルアップ計画の作成'],
    '様子見型': ['現状の記録を開始', '定期的な振り返り'],
    '要注意型': ['専門家への相談', '休養の確保']
  }
  
  return actions[resultType] || ['状況の整理']
}

/**
 * 短期目標生成
 */
function generateShortTermGoals(resultType: string): string[] {
  const goals = {
    '転職推奨型': ['転職活動の開始'],
    '転職検討型': ['転職の可能性を検討'],
    '現職改善型': ['職場環境の改善'],
    '様子見型': ['現状維持'],
    '要注意型': ['ストレス管理']
  }
  
  return goals[resultType] || ['状況改善']
}

/**
 * 長期目標生成
 */
function generateLongTermGoals(resultType: string): string[] {
  const goals = {
    '転職推奨型': ['新しい環境での成長'],
    '転職検討型': ['キャリアの選択肢拡大'],
    '現職改善型': ['現職でのキャリア発展'],
    '様子見型': ['長期的なキャリア設計'],
    '要注意型': ['心身の健康回復']
  }
  
  return goals[resultType] || ['長期的成長']
}