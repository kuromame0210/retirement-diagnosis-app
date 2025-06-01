import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json()

    const prompt = `以下の5問診断結果を分析し、簡易診断結果を生成してください：

Q1: 今の仕事について正直どう思いますか？ → ${answers.q1}
Q2: その気持ちになったのはいつ頃から？ → ${answers.q2}
Q3: 仕事のことが頭から離れない頻度は？ → ${answers.q3}
Q4: 一番のストレス要因は？ → ${answers.q4}
Q5: 辞めるとしたら一番の不安は？ → ${answers.q5}

以下のJSON形式で回答してください：
{
  "type": "疲労限界型/現状維持迷い型/成長志向型",
  "urgency": "high/medium/low", 
  "summary": "現在の状況の要約（2-3行）",
  "advice": "基本的なアドバイス（3-4行）",
  "needsDetailedAnalysis": true/false
}`

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })

    const result = JSON.parse(message.content[0].text)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Basic analysis error:", error)
    return NextResponse.json({ error: "分析中にエラーが発生しました" }, { status: 500 })
  }
}
