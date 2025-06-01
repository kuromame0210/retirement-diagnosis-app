import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { basicAnswers, textInput, chatHistory, previousAnalysis } = await request.json()

    const prompt = `全ての診断情報を統合し、最終診断結果を生成してください：

【基本診断回答】
${JSON.stringify(basicAnswers)}

【テキスト入力】
${textInput}

【AI問答履歴】
${chatHistory?.map((chat: any) => `Q: ${chat.question}\nA: ${chat.answer}`).join("\n\n") || ""}

【これまでの分析結果】
${JSON.stringify(previousAnalysis)}

以下の構造で詳細な最終診断を生成：
{
  "finalType": "診断タイプ",
  "currentSituation": "現状分析（詳細）",
  "recommendedActions": [
    {"priority": 1, "action": "具体的なアクション", "timeline": "時期"},
    {"priority": 2, "action": "アクション2", "timeline": "時期"}
  ],
  "serviceRecommendations": [
    {"category": "転職支援/医療相談/スキルアップ等", "services": ["具体的サービス名"], "reason": "推奨理由"}
  ],
  "longTermStrategy": "長期戦略（該当する場合）",
  "urgencyLevel": "high/medium/low"
}`

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    })

    const result = JSON.parse(message.content[0].text)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Final analysis error:", error)
    return NextResponse.json({ error: "最終分析中にエラーが発生しました" }, { status: 500 })
  }
}
