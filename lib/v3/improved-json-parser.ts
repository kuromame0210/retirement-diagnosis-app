/**
 * 堅牢なJSON解析ライブラリ
 * Claude APIレスポンスの様々なエラーケースに対応
 */

import { getJSTTimestamp } from '@/lib/utils/timestamp'
import type { DetailedPersonalDiagnosisResult, StagedDiagnosisRequest } from './staged-diagnosis'

export interface JsonParsingResult {
  success: boolean
  data?: any
  error?: string
  method: 'complete' | 'repaired' | 'partial' | 'fallback'
  confidence: 'high' | 'medium' | 'low'
}

/**
 * 堅牢なJSON解析エンジン
 */
export class RobustJsonParser {
  
  /**
   * メインの解析メソッド
   */
  static parseClaudeResponse(response: string): JsonParsingResult {
    console.log('🔍 [RobustJsonParser] Starting analysis...')
    
    if (!response || response.trim().length === 0) {
      console.log('❌ [RobustJsonParser] Empty response')
      return {
        success: false,
        error: 'Empty response',
        method: 'fallback',
        confidence: 'low'
      }
    }

    let jsonText = response.trim()
    
    // Step 1: Markdownコードブロックの抽出
    const extractedJson = this.extractFromMarkdown(jsonText)
    if (extractedJson) {
      jsonText = extractedJson
      console.log('📦 [RobustJsonParser] Extracted from markdown block')
    }

    // Step 2: 完全なJSONとしての解析試行
    const completeResult = this.tryCompleteJsonParse(jsonText)
    if (completeResult.success) {
      return completeResult
    }

    // Step 3: JSON修復試行
    const repairedResult = this.tryRepairedJsonParse(jsonText)
    if (repairedResult.success) {
      return repairedResult
    }

    // Step 4: 部分的データ抽出
    const partialResult = this.tryPartialExtraction(jsonText)
    if (partialResult.success) {
      return partialResult
    }

    // Step 5: 完全フォールバック
    console.log('❌ [RobustJsonParser] All parsing methods failed')
    return {
      success: false,
      error: 'All parsing methods failed',
      method: 'fallback',
      confidence: 'low'
    }
  }

  /**
   * MarkdownコードブロックからのJSON抽出
   */
  private static extractFromMarkdown(text: string): string | null {
    const jsonBlockPattern = /```json\s*([\s\S]*?)```/g
    const matches = Array.from(text.matchAll(jsonBlockPattern))
    
    if (matches.length > 0) {
      // 最後のJSONブロックを使用（最も完全である可能性が高い）
      const lastMatch = matches[matches.length - 1]
      return lastMatch[1].trim()
    }
    
    return null
  }

  /**
   * 完全なJSONとしての解析試行
   */
  private static tryCompleteJsonParse(jsonText: string): JsonParsingResult {
    try {
      const sanitized = this.sanitizeJsonText(jsonText)
      const parsed = JSON.parse(sanitized)
      
      console.log('✅ [RobustJsonParser] Complete JSON parse successful')
      return {
        success: true,
        data: parsed,
        method: 'complete',
        confidence: 'high'
      }
    } catch (error) {
      console.log('⚠️ [RobustJsonParser] Complete parse failed:', error.message)
      return {
        success: false,
        error: error.message,
        method: 'complete',
        confidence: 'low'
      }
    }
  }

  /**
   * JSON修復試行
   */
  private static tryRepairedJsonParse(jsonText: string): JsonParsingResult {
    try {
      const repaired = this.repairJson(jsonText)
      if (repaired) {
        const parsed = JSON.parse(repaired)
        
        console.log('🔧 [RobustJsonParser] Repaired JSON parse successful')
        return {
          success: true,
          data: parsed,
          method: 'repaired',
          confidence: 'medium'
        }
      }
    } catch (error) {
      console.log('⚠️ [RobustJsonParser] Repaired parse failed:', error.message)
    }

    return {
      success: false,
      error: 'JSON repair failed',
      method: 'repaired',
      confidence: 'low'
    }
  }

  /**
   * 部分的データ抽出
   */
  private static tryPartialExtraction(jsonText: string): JsonParsingResult {
    try {
      const partialData = this.extractPartialData(jsonText)
      
      if (partialData && Object.keys(partialData).length > 0) {
        console.log(`📝 [RobustJsonParser] Partial extraction successful (${Object.keys(partialData).length} fields)`)
        return {
          success: true,
          data: partialData,
          method: 'partial',
          confidence: 'low'
        }
      }
    } catch (error) {
      console.log('⚠️ [RobustJsonParser] Partial extraction failed:', error.message)
    }

    return {
      success: false,
      error: 'Partial extraction failed',
      method: 'partial',
      confidence: 'low'
    }
  }

  /**
   * JSONテキストのサニタイゼーション
   */
  private static sanitizeJsonText(jsonText: string): string {
    // 制御文字の除去
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // 不正なエスケープシーケンスの修正
    jsonText = jsonText.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
    
    // 行末の不完全な文字列の処理
    jsonText = jsonText.replace(/,\s*$/, '')
    
    return jsonText
  }

  /**
   * JSON修復
   */
  private static repairJson(jsonText: string): string | null {
    try {
      let repaired = this.sanitizeJsonText(jsonText)
      
      // 1. 途中で切れた文字列の修復
      const lastQuoteIndex = repaired.lastIndexOf('"')
      const lastCloseBrace = repaired.lastIndexOf('}')
      
      if (lastQuoteIndex > lastCloseBrace) {
        const beforeQuote = repaired.substring(0, lastQuoteIndex + 1)
        const afterQuote = repaired.substring(lastQuoteIndex + 1)
        
        // 文字列が閉じられていない場合
        if (!afterQuote.includes('"')) {
          repaired = beforeQuote + '"'
        }
      }
      
      // 2. 不足している閉じ括弧を追加
      const openBraces = (repaired.match(/{/g) || []).length
      const closeBraces = (repaired.match(/}/g) || []).length
      const missingBraces = openBraces - closeBraces
      
      if (missingBraces > 0) {
        repaired += '}'.repeat(missingBraces)
      }
      
      // 3. 末尾のカンマを除去
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
      
      // 4. 不完全な配列を修復
      const openBrackets = (repaired.match(/\[/g) || []).length
      const closeBrackets = (repaired.match(/\]/g) || []).length
      const missingBrackets = openBrackets - closeBrackets
      
      if (missingBrackets > 0) {
        repaired += ']'.repeat(missingBrackets)
      }
      
      // 5. 配列の末尾の修復（カンマで終わっている場合）
      repaired = repaired.replace(/,(\s*\])/g, '$1')
      
      // 6. オブジェクトの不完全なプロパティを修復
      repaired = repaired.replace(/,(\s*[}\]])/, '$1')
      
      // 7. より積極的な修復: 不完全な行を削除
      const lines = repaired.split('\n')
      const repairedLines = []
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        // 明らかに不完全な行をスキップ
        if (line.endsWith('": "') || line.endsWith(': [') || line.endsWith(': {')) {
          console.log(`🔧 [JSON Repair] Skipping incomplete line: ${line.substring(0, 50)}...`)
          continue
        }
        repairedLines.push(lines[i])
      }
      
      repaired = repairedLines.join('\n')
      
      return repaired
    } catch (error) {
      console.log('⚠️ [JSON Repair] Failed:', error.message)
      return null
    }
  }

  /**
   * 部分的データ抽出
   */
  private static extractPartialData(jsonText: string): any | null {
    try {
      const partialData: any = {}
      
      // 基本フィールドの抽出パターン（より柔軟な正規表現）
      const fieldPatterns = [
        { key: 'result_type', pattern: /"result_type"\s*:\s*"([^"]*?)"/ },
        { key: 'confidence_level', pattern: /"confidence_level"\s*:\s*"([^"]*?)"/ },
        { key: 'urgency_level', pattern: /"urgency_level"\s*:\s*"([^"]*?)"/ },
        { key: 'personal_summary', pattern: /"personal_summary"\s*:\s*"([\s\S]*?)"/s }
      ]
      
      let extractedCount = 0
      
      for (const { key, pattern } of fieldPatterns) {
        const match = jsonText.match(pattern)
        if (match) {
          partialData[key] = match[1]
          extractedCount++
        }
      }

      // ネストされたオブジェクトの抽出
      const emotionalConnectionMatch = jsonText.match(/"emotional_connection"\s*:\s*{([^}]*)}/s)
      if (emotionalConnectionMatch) {
        const emotionalContent = emotionalConnectionMatch[1]
        const emotional: any = {}
        
        const recognitionMatch = emotionalContent.match(/"recognition"\s*:\s*"([^"]*)"/)
        if (recognitionMatch) emotional.recognition = recognitionMatch[1]
        
        const validationMatch = emotionalContent.match(/"validation"\s*:\s*"([^"]*)"/)
        if (validationMatch) emotional.validation = validationMatch[1]
        
        const hopeMatch = emotionalContent.match(/"hope_message"\s*:\s*"([^"]*)"/)
        if (hopeMatch) emotional.hope_message = hopeMatch[1]
        
        if (Object.keys(emotional).length > 0) {
          partialData.emotional_connection = emotional
          extractedCount++
        }
      }

      // 配列フィールドの抽出（より柔軟な正規表現）
      const arrayPatterns = [
        { key: 'immediate_actions', pattern: /"immediate_actions"\s*:\s*\[([\s\S]*?)\]/s },
        { key: 'motivation_drivers', pattern: /"motivation_drivers"\s*:\s*\[([\s\S]*?)\]/s },
        { key: 'career_strengths', pattern: /"career_strengths"\s*:\s*\[([\s\S]*?)\]/s },
        { key: 'growth_areas', pattern: /"growth_areas"\s*:\s*\[([\s\S]*?)\]/s }
      ]
      
      for (const { key, pattern } of arrayPatterns) {
        const match = jsonText.match(pattern)
        if (match) {
          try {
            const arrayContent = match[1].trim()
            // より柔軟な配列アイテム抽出
            const items = arrayContent.match(/"([^"]*?)"/g)
            if (items && items.length > 0) {
              partialData[key] = items.map(item => item.replace(/"/g, '').trim())
              extractedCount++
              console.log(`📝 [Partial Extract] Found ${key}: ${items.length} items`)
            } else {
              // 単純な文字列分割を試行
              const simpleItems = arrayContent.split(',').map(item => 
                item.trim().replace(/^["']|["']$/g, '')
              ).filter(item => item.length > 0)
              
              if (simpleItems.length > 0) {
                partialData[key] = simpleItems
                extractedCount++
                console.log(`📝 [Partial Extract] Found ${key} via split: ${simpleItems.length} items`)
              }
            }
          } catch (error) {
            console.log(`⚠️ Failed to extract array ${key}:`, error.message)
          }
        }
      }
      
      return extractedCount > 0 ? partialData : null
    } catch (error) {
      console.log('⚠️ [Partial Extract] Failed:', error.message)
      return null
    }
  }
}

/**
 * 詳細診断結果ビルダー
 */
export class DetailedDiagnosisResultBuilder {
  
  static buildFromParsedData(
    parseResult: JsonParsingResult,
    request: StagedDiagnosisRequest,
    empathyMessage?: any
  ): DetailedPersonalDiagnosisResult {
    
    if (!parseResult.success || !parseResult.data) {
      console.log('🔧 [ResultBuilder] Using fallback diagnosis')
      return this.createFallbackDiagnosis(request, empathyMessage)
    }

    const parsed = parseResult.data
    console.log(`✅ [ResultBuilder] Building result from ${parseResult.method} parsing (${parseResult.confidence} confidence)`)
    
    return {
      result_type: parsed.result_type || '現職改善型',
      confidence_level: parsed.confidence_level || (parseResult.confidence === 'high' ? 'high' : 'medium'),
      urgency_level: parsed.urgency_level || 'medium',
      
      emotional_connection: empathyMessage || parsed.emotional_connection || {
        recognition: 'あなたの状況を深く理解し、共感いたします',
        validation: 'あなたの感情や悩みは、とても自然で正当なものです',
        hope_message: '一緒に最適な解決策を見つけていきましょう'
      },
      
      personal_summary: parsed.personal_summary || this.generatePersonalSummary(parseResult, request),
      
      personal_insights: {
        your_situation_analysis: parsed.personal_insights?.your_situation_analysis || 'あなたは現在のお仕事に何らかの課題や不満を感じており、より良い働き方を模索している段階にあります',
        emotional_pattern: parsed.personal_insights?.emotional_pattern || 'あなたは真面目で責任感が強く、現状に対して建設的な解決策を求める傾向があります',
        stress_response: parsed.personal_insights?.stress_response || 'ストレスを感じた際は一人で抱え込みがちですが、適切な相談により大幅に改善できる可能性があります',
        motivation_drivers: parsed.personal_insights?.motivation_drivers || ['働きがいのある環境', '適正な評価と報酬', 'ワークライフバランス'],
        career_strengths: parsed.personal_insights?.career_strengths || ['問題解決への積極性', '継続的な学習姿勢', '職務への責任感'],
        growth_areas: parsed.personal_insights?.growth_areas || ['自己主張スキル', 'ストレス管理', 'キャリア戦略立案']
      },
      
      personalized_action_plan: this.buildActionPlan(parsed.personalized_action_plan, parseResult.confidence),
      
      personalized_services: parsed.personalized_services || [
        {
          service_category: 'career_counseling',
          why_recommended_for_you: 'あなたの具体的な状況に合わせた個別アドバイスで、迷いを解消できます',
          timing_for_you: '現在のお気持ちが整理されている今がベストタイミングです',
          expected_benefit_for_you: '3-6ヶ月で明確なキャリア戦略と実行計画を策定できます',
          how_to_choose: '初回無料相談があり、あなたの業界経験が豊富なカウンセラーを選んでください'
        },
        {
          service_category: 'skills_assessment',
          why_recommended_for_you: 'あなたの強みを客観的に把握することで、自信を持って次のステップに進めます',
          timing_for_you: 'キャリア検討の初期段階である今こそ重要です',
          expected_benefit_for_you: '市場価値の明確化と具体的なスキルアップ方針が得られます',
          how_to_choose: 'オンラインで手軽に受けられる診断ツールから始めることをお勧めします'
        },
        {
          service_category: 'stress_management',
          why_recommended_for_you: '現在感じているストレスを軽減し、冷静な判断力を回復できます',
          timing_for_you: 'ストレスが蓄積する前の予防的対策として今すぐ始めましょう',
          expected_benefit_for_you: '1-2週間で気持ちの軽さと集中力の向上を実感できます',
          how_to_choose: 'アプリやオンライン講座など、日常に取り入れやすい方法を選んでください'
        }
      ],
      
      your_future_scenarios: {
        stay_current_path: {
          probability_for_you: parsed.your_future_scenarios?.stay_current_path?.probability_for_you || '継続的な分析により判定',
          what_happens_to_you: parsed.your_future_scenarios?.stay_current_path?.what_happens_to_you || ['現状維持による安定', '徐々な改善の可能性'],
          your_risks: parsed.your_future_scenarios?.stay_current_path?.your_risks || ['変化の機会逸失', '慣性による停滞'],
          your_success_keys: parsed.your_future_scenarios?.stay_current_path?.your_success_keys || ['積極的な改善行動', '継続的な自己投資']
        },
        change_path: {
          probability_for_you: parsed.your_future_scenarios?.change_path?.probability_for_you || '準備と計画により実現可能',
          what_happens_to_you: parsed.your_future_scenarios?.change_path?.what_happens_to_you || ['新たな環境での成長', '理想に近づく体験'],
          your_risks: parsed.your_future_scenarios?.change_path?.your_risks || ['環境変化への適応', '初期の不安定性'],
          your_success_keys: parsed.your_future_scenarios?.change_path?.your_success_keys || ['十分な準備', '適切なタイミング', '継続的な努力']
        }
      },
      
      diagnosed_at: getJSTTimestamp(),
      phase: 'detailed',
      answered_questions: request.answeredQuestions || 0
    }
  }

  private static generatePersonalSummary(parseResult: JsonParsingResult, request: StagedDiagnosisRequest): string {
    const confidence = parseResult.confidence
    const method = parseResult.method
    
    if (confidence === 'high') {
      return 'あなたの回答を詳細に分析した結果、具体的で実行可能なアドバイスをご提供いたします。'
    } else if (confidence === 'medium') {
      return 'あなたの状況を分析し、現在の情報に基づいて最適なガイダンスをお伝えします。'
    } else {
      return 'システムの制約により部分的な分析となりましたが、あなたの状況に応じた基本的なアドバイスをご提供いたします。'
    }
  }

  private static buildActionPlan(parsedPlan: any, confidence: 'high' | 'medium' | 'low'): any {
    const defaultPlan = {
      this_week: [{
        action: 'キャリアの現状整理と優先順位づけ',
        why_for_you: '今の悩みを明確化し、解決すべきポイントを特定するため',
        how_to_start: '紙に「今の不満」「理想の働き方」「必要なスキル」を書き出してみる（20分）',
        expected_feeling: '漠然とした不安がクリアなアクションアイテムに変わるすっきり感'
      }],
      this_month: [{
        goal: '具体的なキャリア戦略の策定',
        your_approach: '情報収集と相談を組み合わせ、無理のないペースで進める',
        success_indicators: ['具体的なロードマップの作成', '不安の軽減と方向性の明確化', '小さな行動変化の開始'],
        potential_challenges: '情報が多すぎて決められない状態',
        support_needed: ['信頼できる相談相手', 'キャリア情報の収集時間']
      }],
      next_3_months: [{
        vision: '明確な方向性と実行可能なアクションプランの確立',
        milestone_path: ['キャリアゴールの確定', '必要スキルの特定と取得開始', '具体的行動の実行開始'],
        decision_points: ['現職継続 vs 転職の最終判断', 'スキルアップ方法の選択', 'タイムラインの調整'],
        backup_plans: ['複数の選択肢の保持', '段階的アプローチの準備', 'リスク管理と緊急時プラン']
      }]
    }

    return parsedPlan || defaultPlan
  }

  private static createFallbackDiagnosis(request: StagedDiagnosisRequest, empathyMessage?: any): DetailedPersonalDiagnosisResult {
    return {
      result_type: '現職改善型',
      confidence_level: 'low',
      urgency_level: 'medium',
      
      emotional_connection: empathyMessage || {
        recognition: 'システムの制限により完全な分析ができませんでしたが、あなたの状況とお気持ちの重要性を理解しています',
        validation: 'どのような状況でも、あなたの感情や悩みは正当で価値あるものです',
        hope_message: '専門家との相談を通じて、きっと良い方向性が見つかります'
      },
      
      personal_summary: 'システムの制約により部分的な分析となりましたが、あなたのキャリアに関する悩みは十分解決可能です。現在のお気持ちや状況を整理し、具体的なアクションプランを立てることから始めてみましょう。このタイミングで行動を起こすことで、きっと想像以上の成果が得られるはずです。',
      
      personal_insights: {
        your_situation_analysis: 'あなたの状況をより詳しく理解するため、専門家との個別相談が効果的です',
        emotional_pattern: 'あなたの感情パターンについて、さらなる対話を通じて理解を深めていきましょう',
        stress_response: 'あなたに最適なストレス対処法を、専門家と一緒に見つけていきましょう',
        motivation_drivers: ['詳細な対話による分析が必要'],
        career_strengths: ['個別相談での発見が期待できます'],
        growth_areas: ['専門家との協働で明確化']
      },
      
      personalized_action_plan: {
        this_week: [{
          action: '信頼できる専門家や相談窓口を探す',
          why_for_you: 'より詳細で個人に最適化された分析とアドバイスを得るため',
          how_to_start: 'キャリアカウンセラーや心理カウンセラーを検索してみる',
          expected_feeling: '具体的な解決策への道筋が見えてくる安心感'
        }],
        this_month: [{
          goal: '専門的なキャリア相談を受ける',
          your_approach: 'あなたに合った相談方法（対面・オンライン等）を選択',
          success_indicators: ['具体的な行動計画の策定', '気持ちの整理'],
          potential_challenges: '相談先の選択、時間と費用の確保',
          support_needed: ['適切な相談先の情報', '相談に向けた準備']
        }],
        next_3_months: [{
          vision: '明確なキャリア戦略と実行計画の確立',
          milestone_path: ['専門相談実施', '詳細分析完了', '具体的行動開始'],
          decision_points: ['相談結果の評価', '行動計画の決定'],
          backup_plans: ['複数の専門家意見の比較', '段階的なアプローチの採用']
        }]
      },
      
      personalized_services: [{
        service_category: 'career_counseling',
        why_recommended_for_you: 'あなたの状況に特化した深い分析とパーソナライズされたアドバイスを提供',
        timing_for_you: '現在が相談に最適なタイミングです',
        expected_benefit_for_you: '具体的で実行可能な個別キャリア戦略の策定',
        how_to_choose: 'あなたの価値観と相性の良い、経験豊富な専門家を選択'
      }],
      
      your_future_scenarios: {
        stay_current_path: {
          probability_for_you: '詳細な専門分析により判定',
          what_happens_to_you: ['専門相談による状況の明確化'],
          your_risks: ['不明確な状況の継続'],
          your_success_keys: ['適切な専門家の選択', '率直な相談']
        },
        change_path: {
          probability_for_you: '個別相談による詳細検討が必要',
          what_happens_to_you: ['専門的サポートによる方向性の確立'],
          your_risks: ['準備不足による判断ミス'],
          your_success_keys: ['十分な準備と専門的助言', '段階的なアプローチ']
        }
      },
      
      diagnosed_at: getJSTTimestamp(),
      phase: 'detailed',
      answered_questions: request.answeredQuestions || 0
    }
  }
}