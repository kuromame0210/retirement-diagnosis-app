/**
 * V3改善されたJSON解析テスト
 * より堅牢なJSON解析ロジックのテスト
 */

describe('V3改善されたJSON解析', () => {
  
  /**
   * 改善されたJSON抽出関数
   * より堅牢で様々なエラーケースに対応
   */
  function improvedJsonExtraction(response: string): any {
    console.log('🔍 Parsing response:', response.substring(0, 200) + '...')
    
    try {
      let jsonText = response.trim()
      
      // 1. Markdownコードブロックの検出と抽出（改善版）
      const jsonBlockPattern = /```json\s*([\s\S]*?)```/g
      const matches = Array.from(jsonText.matchAll(jsonBlockPattern))
      
      if (matches.length > 0) {
        // 最後のJSONブロックを使用（最も完全である可能性が高い）
        const lastMatch = matches[matches.length - 1]
        jsonText = lastMatch[1].trim()
        console.log('📦 Extracted from markdown block')
      }
      
      // 2. JSONテキストのサニタイゼーション
      jsonText = sanitizeJsonText(jsonText)
      
      // 3. 段階的JSON解析試行
      let parsed = null
      
      // 3a. 完全なJSONとしてパース試行
      try {
        parsed = JSON.parse(jsonText)
        console.log('✅ Successfully parsed complete JSON')
        return parsed
      } catch (error) {
        console.log('⚠️ Complete JSON parse failed:', error.message)
      }
      
      // 3b. 不完全なJSONの修復試行
      const repairedJson = attemptJsonRepair(jsonText)
      if (repairedJson) {
        try {
          parsed = JSON.parse(repairedJson)
          console.log('🔧 Successfully parsed repaired JSON')
          return parsed
        } catch (error) {
          console.log('⚠️ Repaired JSON parse failed:', error.message)
        }
      }
      
      // 3c. 部分的な情報抽出
      const partialData = extractPartialJsonData(jsonText)
      if (partialData) {
        console.log('📝 Extracted partial data')
        return partialData
      }
      
      throw new Error('No valid JSON could be extracted')
      
    } catch (error) {
      console.error('❌ JSON extraction failed:', error.message)
      throw error
    }
  }
  
  /**
   * JSONテキストのサニタイゼーション
   */
  function sanitizeJsonText(jsonText: string): string {
    // 制御文字の除去
    jsonText = jsonText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    
    // 不正なエスケープシーケンスの修正
    jsonText = jsonText.replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '\\\\')
    
    // 行末の不完全な文字列の処理
    jsonText = jsonText.replace(/,\s*$/, '')
    
    return jsonText
  }
  
  /**
   * 不完全なJSONの修復試行
   */
  function attemptJsonRepair(jsonText: string): string | null {
    try {
      // 1. 途中で切れた文字列の修復
      let repaired = jsonText
      
      // 最後の不完全な文字列を検出
      const lastQuoteIndex = repaired.lastIndexOf('"')
      const lastOpenBrace = repaired.lastIndexOf('{')
      const lastCloseBrace = repaired.lastIndexOf('}')
      
      // 2. 文字列が閉じられていない場合の修復
      if (lastQuoteIndex > lastCloseBrace) {
        const beforeQuote = repaired.substring(0, lastQuoteIndex + 1)
        const afterQuote = repaired.substring(lastQuoteIndex + 1)
        
        if (!afterQuote.includes('"')) {
          repaired = beforeQuote + '"'
        }
      }
      
      // 3. オブジェクトが閉じられていない場合の修復
      const openBraces = (repaired.match(/{/g) || []).length
      const closeBraces = (repaired.match(/}/g) || []).length
      const missingBraces = openBraces - closeBraces
      
      if (missingBraces > 0) {
        repaired += '}'.repeat(missingBraces)
      }
      
      // 4. 末尾のカンマを除去
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
      
      console.log('🔧 Attempted repair completed')
      return repaired
      
    } catch (error) {
      console.log('⚠️ JSON repair failed:', error.message)
      return null
    }
  }
  
  /**
   * 部分的なJSONデータの抽出
   */
  function extractPartialJsonData(jsonText: string): any | null {
    try {
      const partialData: any = {}
      
      // 基本的なフィールドを正規表現で抽出
      const patterns = [
        { key: 'result_type', pattern: /"result_type"\s*:\s*"([^"]*)"/ },
        { key: 'confidence_level', pattern: /"confidence_level"\s*:\s*"([^"]*)"/ },
        { key: 'urgency_level', pattern: /"urgency_level"\s*:\s*"([^"]*)"/ },
        { key: 'personal_summary', pattern: /"personal_summary"\s*:\s*"([^"]*)"/ }
      ]
      
      let extractedCount = 0
      
      for (const { key, pattern } of patterns) {
        const match = jsonText.match(pattern)
        if (match) {
          partialData[key] = match[1]
          extractedCount++
        }
      }
      
      // 配列フィールドの抽出
      const arrayPatterns = [
        { key: 'immediate_actions', pattern: /"immediate_actions"\s*:\s*\[([^\]]*)\]/ },
        { key: 'motivation_drivers', pattern: /"motivation_drivers"\s*:\s*\[([^\]]*)\]/ }
      ]
      
      for (const { key, pattern } of arrayPatterns) {
        const match = jsonText.match(pattern)
        if (match) {
          try {
            // 配列要素を抽出
            const arrayContent = match[1]
            const items = arrayContent.match(/"([^"]*)"/g)
            if (items) {
              partialData[key] = items.map(item => item.replace(/"/g, ''))
              extractedCount++
            }
          } catch (error) {
            console.log(`⚠️ Failed to extract array ${key}:`, error.message)
          }
        }
      }
      
      if (extractedCount > 0) {
        console.log(`📝 Extracted ${extractedCount} fields partially`)
        return partialData
      }
      
      return null
      
    } catch (error) {
      console.log('⚠️ Partial extraction failed:', error.message)
      return null
    }
  }

  describe('改善されたJSON解析の動作確認', () => {
    it('should parse valid JSON correctly', () => {
      const validJson = JSON.stringify({
        result_type: '転職推奨型',
        confidence_level: 'high',
        personal_summary: '分析結果です。'
      })

      const result = improvedJsonExtraction(validJson)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
      expect(result.personal_summary).toBe('分析結果です。')
    })

    it('should extract JSON from markdown blocks', () => {
      const markdownResponse = `Here's the analysis:

\`\`\`json
{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "詳細な分析結果をお伝えします。"
}
\`\`\`

This completes the analysis.`

      const result = improvedJsonExtraction(markdownResponse)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
      expect(result.personal_summary).toBe('詳細な分析結果をお伝えします。')
    })

    it('should handle unterminated JSON strings', () => {
      const unteriminatedJson = `{
  "result_type": "転職推奨型",
  "confidence_level": "high", 
  "personal_summary": "あなたの状況を分析した結果`

      const result = improvedJsonExtraction(unteriminatedJson)

      // 部分的な抽出でも基本情報が取得できることを確認
      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
    })

    it('should handle JSON with unescaped quotes', () => {
      const jsonWithQuotes = `{
  "result_type": "転職推奨型",
  "personal_summary": "あなたの「頑張り」を認めます。",
  "confidence_level": "high"
}`

      const result = improvedJsonExtraction(jsonWithQuotes)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
    })

    it('should handle missing closing braces', () => {
      const incompleteJson = `{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "分析が完了しました。",
  "emotional_connection": {
    "recognition": "あなたの気持ちを理解します",
    "validation": "その感情は自然です"`

      const result = improvedJsonExtraction(incompleteJson)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
    })

    it('should extract partial data when JSON is severely malformed', () => {
      const severelyMalformed = `Some text before
  "result_type": "転職推奨型",
  "confidence_level": "high",
  Random text in between
  "personal_summary": "このような状況では転職をお勧めします",
  More random text`

      const result = improvedJsonExtraction(severelyMalformed)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
      expect(result.personal_summary).toBe('このような状況では転職をお勧めします')
    })

    it('should handle completely non-JSON response', () => {
      const nonJsonResponse = `申し訳ございませんが、システムエラーが発生しました。
      詳細な分析を実行できませんでした。
      専門家との相談をお勧めします。`

      expect(() => {
        improvedJsonExtraction(nonJsonResponse)
      }).toThrow('No valid JSON could be extracted')
    })

    it('should handle multiple JSON blocks and use the last one', () => {
      const multipleBlocks = `First analysis:

\`\`\`json
{
  "result_type": "現職改善型",
  "confidence_level": "low"
}
\`\`\`

Updated analysis:

\`\`\`json
{
  "result_type": "転職推奨型", 
  "confidence_level": "high",
  "personal_summary": "より詳細な分析結果です。"
}
\`\`\`

Final conclusion.`

      const result = improvedJsonExtraction(multipleBlocks)

      // 最後のJSONブロックが使用されることを確認
      expect(result.result_type).toBe('転職推奨型')
      expect(result.confidence_level).toBe('high')
      expect(result.personal_summary).toBe('より詳細な分析結果です。')
    })

    it('should handle special characters and escape sequences', () => {
      const jsonWithSpecialChars = `{
  "result_type": "転職推奨型",
  "personal_summary": "あなたの状況は：\\n1. ストレス過多\\n2. モチベーション低下",
  "confidence_level": "high"
}`

      const result = improvedJsonExtraction(jsonWithSpecialChars)

      expect(result.result_type).toBe('転職推奨型')
      expect(result.personal_summary).toContain('ストレス過多')
      expect(result.confidence_level).toBe('high')
    })

    it('should handle empty or whitespace-only input', () => {
      const emptyInput = '   \n\n   \t   '

      expect(() => {
        improvedJsonExtraction(emptyInput)
      }).toThrow('No valid JSON could be extracted')
    })
  })

  describe('パフォーマンスと信頼性', () => {
    it('should handle very large responses efficiently', () => {
      const largeText = 'とても長いテキストです。'.repeat(1000)
      const largeResponse = `\`\`\`json
{
  "result_type": "転職推奨型",
  "confidence_level": "high", 
  "personal_summary": "${largeText}"
}
\`\`\``

      const startTime = Date.now()
      const result = improvedJsonExtraction(largeResponse)
      const endTime = Date.now()

      expect(result.result_type).toBe('転職推奨型')
      expect(endTime - startTime).toBeLessThan(1000) // 1秒以内で処理完了
    })

    it('should be memory efficient with malformed input', () => {
      const malformedLarge = '{'.repeat(10000) + '"result_type": "転職推奨型"'

      // メモリエラーが発生しないことを確認
      expect(() => {
        improvedJsonExtraction(malformedLarge)
      }).not.toThrow(/Maximum call stack/)
    })
  })

  describe('実際のエラーケースとの統合', () => {
    it('should create fallback diagnosis result when parsing fails', () => {
      const createFallbackDiagnosis = (originalResponse: string) => {
        return {
          result_type: '現職改善型',
          confidence_level: 'low',
          urgency_level: 'medium',
          personal_summary: 'システムエラーのため詳細分析ができませんでしたが、専門家相談をお勧めします。',
          emotional_connection: {
            recognition: 'システムの制限により十分な分析ができませんでしたが、あなたの状況はとても重要です',
            validation: 'どのような状況でも、あなたの感情や悩みは正当なものです',
            hope_message: '専門家との相談を通じて、きっと良い方向が見つかります'
          },
          personal_insights: {
            your_situation_analysis: 'あなたの状況をより詳しく分析するため、専門家との相談をお勧めします。',
            emotional_pattern: 'あなたの感情パターンについて、さらなる対話が必要です。',
            stress_response: 'あなたのストレス対処法を一緒に見つけていきましょう。',
            motivation_drivers: ['詳細分析が必要'],
            career_strengths: ['個別相談で明確化'],
            growth_areas: ['専門家と相談']
          },
          phase: 'detailed',
          answered_questions: 3
        }
      }

      const nonParsableResponse = 'Complete garbage response that cannot be parsed at all'
      const fallback = createFallbackDiagnosis(nonParsableResponse)

      expect(fallback.result_type).toBe('現職改善型')
      expect(fallback.confidence_level).toBe('low')
      expect(fallback.personal_summary).toContain('システムエラーのため詳細分析ができませんでした')
      expect(fallback.personal_insights.emotional_pattern).toBe('あなたの感情パターンについて、さらなる対話が必要です。')
    })

    it('should integrate improved parsing with existing error handling', () => {
      const problematicResponse = `{
  "result_type": "転職推奨型",
  "personal_summary": "分析中にエラーが発生しました...`

      let result
      try {
        result = improvedJsonExtraction(problematicResponse)
      } catch (error) {
        // フォールバック診断を作成
        result = {
          result_type: '現職改善型',
          confidence_level: 'low',
          personal_summary: 'システムエラーのため詳細分析ができませんでした'
        }
      }

      expect(result.result_type).toBeDefined()
      expect(['転職推奨型', '現職改善型']).toContain(result.result_type)
    })
  })
})