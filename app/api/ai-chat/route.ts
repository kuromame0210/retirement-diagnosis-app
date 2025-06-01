import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const {
      chatHistory,
      textAnalysis,
      basicAnswers,
      questionCount,
      existingQuestions = [] // ✅ 追加：既存質問の配列
    } = await request.json()

    // 入力値の検証
    if (!basicAnswers || typeof questionCount !== "number") {
      return NextResponse.json({ error: "必要なパラメータが不足しています" }, { status: 400 })
    }

    if (questionCount < 1 || questionCount > 5) {
      return NextResponse.json({ error: "質問番号が無効です" }, { status: 400 })
    }

    let prompt: string

    if (questionCount === 1) {
      // 第1回目の質問
      prompt = `退職診断のAI問答セッションです。以下の情報を元に、最初の質問を生成してください：

【基本診断】${JSON.stringify(basicAnswers)}
【テキスト分析】${JSON.stringify(textAnalysis)}

重要：回答は以下のJSON形式のみで出力してください。JSON以外の文章や説明は一切追加しないでください：
{
  "question": "質問内容",
  "intent": "この質問の目的",
  "expectedInsights": ["期待される洞察1", "洞察2"]
}`
    } else {
      // ✅ 修正：既存質問の重複防止を追加
      const existingQuestionsText = existingQuestions.length > 0
        ? `\n【重要：以下の質問は既に使用済みです。絶対に重複しないでください】\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`
        : ''

      // 第2-5回目の質問
      prompt = `継続中のAI問答セッションです。

【これまでの会話履歴】
${chatHistory.map((chat: any) => `Q: ${chat.question}\nA: ${chat.answer}`).join("\n\n")}
${existingQuestionsText}
【分析すべき残りのトピック】
${textAnalysis?.questionTopics || []}

前回の回答「${chatHistory[chatHistory.length - 1]?.answer}」を踏まえ、次の質問を生成してください。

重要な指示：
- 既に使用済みの質問とは完全に異なる内容にしてください
- 新しい角度や側面から質問を作成してください
- 同じ意味でも表現を変えただけの質問は避けてください
- 回答は以下のJSON形式のみで出力してください
- JSON以外の説明文や理由は一切書かないでください

{
  "question": "次の質問（既存質問と重複しない新しい質問）",
  "intent": "質問の目的", 
  "isLastQuestion": ${questionCount >= 5}
}`
    }

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    })

    // JSON解析の改善
    try {
      let responseText = message.content[0].text.trim()
      console.log("Raw AI response:", responseText)

      // ✅ JSON部分のみを抽出する処理を追加
      const jsonStart = responseText.indexOf('{')
      const jsonEnd = responseText.lastIndexOf('}')

      if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
        console.error("JSON形式が見つかりません:", responseText)
        throw new Error("有効なJSONが見つかりませんでした")
      }

      const jsonText = responseText.substring(jsonStart, jsonEnd + 1)
      console.log("抽出されたJSON:", jsonText)

      const result = JSON.parse(jsonText)

      // 必要なフィールドの存在確認
      if (!result.question || typeof result.question !== "string") {
        throw new Error("質問が正しく生成されませんでした")
      }

      // ✅ 追加：サーバー側での重複チェック
      if (existingQuestions.includes(result.question)) {
        console.warn("重複質問を検出:", result.question)
        throw new Error("重複した質問が生成されました。再試行してください。")
      }

      // ✅ 追加：類似質問の簡易チェック（オプション）
      const isDuplicate = existingQuestions.some(existing => {
        const similarity = calculateSimilarity(existing.toLowerCase(), result.question.toLowerCase())
        return similarity > 0.8 // 80%以上類似していたら重複とみなす
      })

      if (isDuplicate) {
        console.warn("類似質問を検出:", result.question)
        throw new Error("類似した質問が生成されました。再試行してください。")
      }

      return NextResponse.json(result)
    } catch (parseError) {
      console.error("JSON parse error:", parseError)
      console.error("Raw response:", message.content[0].text)

      // ✅ より詳細なエラー情報を追加
      if (parseError instanceof SyntaxError) {
        console.error("JSON構文エラー。AIが追加の説明文を出力した可能性があります。")
      }

      return NextResponse.json({ error: "AI応答の解析に失敗しました" }, { status: 500 })
    }
  } catch (error) {
    console.error("AI chat error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "AI問答中にエラーが発生しました",
      },
      { status: 500 },
    )
  }
}

// ✅ 追加：簡易類似度計算関数
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const editDistance = levenshteinDistance(longer, shorter)
  return (longer.length - editDistance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
