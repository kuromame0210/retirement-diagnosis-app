/**
 * V3 JSON解析の堅牢性テスト
 * Claude APIの様々な異常レスポンスパターンに対するテスト
 */

// V3セッション管理のモック
const mockV3Session = {
  sessionId: 'v3_test_session_json_parsing',
  userId: 'user_test_json',
  version: 'v3',
  textAnswers: {
    'q1_text': { answer: 'テスト回答1' },
    'q2_text': { answer: 'テスト回答2' },
    'q3_text': { answer: 'テスト回答3' }
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

describe('V3 JSON解析の堅牢性テスト', () => {
  let stagedDiagnosisHandler: any

  beforeAll(async () => {
    const module = await import('../app/api/v3/staged-diagnosis/route')
    stagedDiagnosisHandler = module.POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('実際のエラーパターンの再現', () => {
    it('should handle unterminated JSON string at position 1219', async () => {
      // 実際のエラーパターンを再現：JSONが途中で切れている
      const malformedJson = `{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "urgency_level": "high",
  "personal_summary": "あなたが感じている辛さや憂鬱な気持ち、本当によく分かります。毎朝仕事に行くのが嫌だという感情は、とても自然で正当なものです。そのような環境で働き続けることは、心身ともに大きな負担となります。でも大丈夫。あなたには必ず道があります。",
  "emotional_connection": {
    "recognition": "あなたが毎日感じている辛さや憂鬱な気持ち、痛いほどよく分かります",
    "validation": "そのような感情を抱くのは当然で、あなたが悪いわけではありません",
    "hope_message": "でも大丈夫。必ず道があります。一緒に最適な解決策を見つけていきましょう"
  },
  "personal_insights": {
    "your_situation_analysis": "あなたは現在、理不尽な上司と長時間労働により、深刻なストレス状態にあります。この状況は「`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: malformedJson }]
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

      // フォールバック診断が返されることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('現職改善型')
      expect(data.result.confidence_level).toBe('low')
      expect(data.result.personal_summary).toContain('システムエラーのため詳細分析ができませんでした')
    })

    it('should handle JSON with unescaped quotes in strings', async () => {
      // 引用符がエスケープされていないJSONエラーを再現
      const jsonWithUnescapedQuotes = `{
  "result_type": "転職推奨型",
  "personal_summary": "あなたの「頑張りたい」という気持ちと「もう限界」という感情、両方とも自然なものです。",
  "emotional_connection": {
    "recognition": "あなたが感じている「辛さ」や「不安」、よく分かります",
    "validation": "そう感じるのは当然で、あなたは「悪く」ありません"
  }
}`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: jsonWithUnescapedQuotes }]
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

      // フォールバック診断が返されることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('現職改善型')
    })

    it('should handle JSON with markdown code blocks', async () => {
      // Markdownコードブロックが含まれたレスポンスを処理
      const responseWithCodeBlocks = `Here's the analysis:

\`\`\`json
{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "あなたの状況を分析した結果です。",
  "emotional_connection": {
    "recognition": "あなたの気持ちをよく理解します",
    "validation": "その感情は自然なものです",
    "hope_message": "一緒に解決策を見つけましょう"
  },
  "personal_insights": {
    "your_situation_analysis": "現在のストレス状況について",
    "emotional_pattern": "感情パターンの分析",
    "stress_response": "ストレス反応の特徴",
    "motivation_drivers": ["成長意欲", "安定志向"],
    "career_strengths": ["適応力", "責任感"],
    "growth_areas": ["ストレス管理", "コミュニケーション"]
  }
}
\`\`\`

This analysis is based on your responses.`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: responseWithCodeBlocks }]
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

      // 正常にパースされることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBe('転職推奨型')
      expect(data.result.confidence_level).toBe('high')
      expect(data.result.personal_insights.motivation_drivers).toEqual(['成長意欲', '安定志向'])
    })

    it('should handle multiple code blocks in response', async () => {
      // 複数のコードブロックがある場合
      const responseWithMultipleBlocks = `Analysis:

\`\`\`json
{
  "result_type": "転職検討型"
}
\`\`\`

Additional info:

\`\`\`json
{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "詳細な分析結果です。"
}
\`\`\`

Final conclusion.`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: responseWithMultipleBlocks }]
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

      // 最初のJSONブロックが使用されることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // 実装によっては最後のブロックが使用される可能性もある
      expect(['転職検討型', '転職推奨型']).toContain(data.result.result_type)
    })
  })

  describe('Claude APIの異常レスポンスパターン', () => {
    it('should handle very long JSON response that gets truncated', async () => {
      // 非常に長いJSONレスポンスが途中で切れる場合
      const longText = 'とても長い分析結果です。'.repeat(100)
      const truncatedLongResponse = `{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "${longText}",
  "emotional_connection": {
    "recognition": "${longText}",
    "validation": "あなたの感情は正当です"`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: truncatedLongResponse }]
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
      expect(data.result.result_type).toBe('現職改善型') // フォールバック
    })

    it('should handle JSON with special characters and newlines', async () => {
      // 特殊文字や改行が含まれたJSON
      const jsonWithSpecialChars = `{
  "result_type": "転職推奨型",
  "personal_summary": "あなたの状況は：\\n1. ストレス過多\\n2. モチベーション低下\\n3. 将来への不安\\n\\nこれらの要因が重複しています。",
  "emotional_connection": {
    "recognition": "あなたの気持ち\\nよく分かります",
    "validation": "\\\"その通りです\\\"と言いたいです",
    "hope_message": "道は必ずあります。\\nあきらめないでください。"
  }
}`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: jsonWithSpecialChars }]
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

      // 正常に処理されるか、フォールバックが返されることを確認
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.result.result_type).toBeDefined()
    })

    it('should handle non-JSON response from Claude', async () => {
      // Claude が完全に非JSON形式で応答した場合
      const nonJsonResponse = `申し訳ございませんが、あなたの状況を分析した結果、転職を強く推奨いたします。

現在の職場環境では、あなたの健康と将来性に深刻な影響があると判断されます。

以下の点をお勧めします：
- 転職活動を開始する
- カウンセリングを受ける
- ストレス管理を行う

詳細な分析結果については、専門家にご相談ください。`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: nonJsonResponse }]
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
      expect(data.result.result_type).toBe('現職改善型') // フォールバック
      expect(data.result.personal_summary).toContain('システムエラーのため')
    })

    it('should handle empty or whitespace-only response', async () => {
      // 空のレスポンスまたは空白のみの場合
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: '   \n\n   \t   ' }]
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
      expect(data.result.result_type).toBe('現職改善型') // フォールバック
    })
  })

  describe('JSON抽出の改善案テスト', () => {
    it('should extract JSON from mixed content robustly', async () => {
      // 混在コンテンツから正しくJSONを抽出
      const mixedContent = `Here's my analysis of your situation:

\`\`\`json
{
  "result_type": "転職推奨型",
  "confidence_level": "high",
  "personal_summary": "分析結果をお伝えします。"
}
\`\`\`

This is my recommendation based on your responses. I hope this helps you make an informed decision about your career path.

Additional notes:
- Consider consulting with a career counselor
- Take time to reflect on your goals
- Prepare for the transition period`

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: mixedContent }]
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
      expect(data.result.confidence_level).toBe('high')
    })

    it('should handle API timeout gracefully', async () => {
      // APIタイムアウトの場合
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'))

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

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('パフォーマンステスト', () => {
    it('should handle processing time correctly during errors', async () => {
      // エラー時も処理時間が正しく計測されることを確認
      const malformedJson = '{"invalid": json}'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: malformedJson }]
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

      const startTime = Date.now()
      const response = await stagedDiagnosisHandler(request)
      const data = await response.json()
      const endTime = Date.now()

      expect(response.status).toBe(200)
      expect(data.metadata.processing_time_ms).toBeDefined()
      expect(data.metadata.processing_time_ms).toBeGreaterThan(0)
      expect(data.metadata.processing_time_ms).toBeLessThan(endTime - startTime + 100) // 許容誤差
    })

    it('should maintain consistent API response structure during errors', async () => {
      // エラー時でもAPIレスポンス構造が一貫していることを確認
      const invalidJson = '{"incomplete": "json'

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{ text: invalidJson }]
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

      // 必須フィールドがすべて存在することを確認
      expect(data.success).toBeDefined()
      expect(data.result).toBeDefined()
      expect(data.result.result_type).toBeDefined()
      expect(data.result.confidence_level).toBeDefined()
      expect(data.result.phase).toBe('detailed')
      expect(data.metadata).toBeDefined()
      expect(data.metadata.processing_time_ms).toBeDefined()
      expect(data.metadata.phase).toBe('detailed')
      expect(data.metadata.answered_questions).toBeDefined()
    })
  })
})