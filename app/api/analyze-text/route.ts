import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { basicResult, textInput } = await request.json()

    const prompt = `基本診断結果とユーザーのテキスト入力を分析してください：

【基本診断結果】
${JSON.stringify(basicResult)}

【ユーザーのテキスト入力】
${textInput}

以下を分析してJSON形式で回答：
{
  "emotionalState": "感情状態の分析",
  "keyIssues": ["主要な問題点1", "問題点2", "問題点3"],
  "contradictions": ["矛盾点があれば"],
  "questionTopics": ["深掘りすべきトピック1", "トピック2", "トピック3"],
  "riskLevel": "high/medium/low"
}`

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })

    const result = JSON.parse(message.content[0].text)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Text analysis error:", error)
    return NextResponse.json({ error: "テキスト分析中にエラーが発生しました" }, { status: 500 })
  }
}
