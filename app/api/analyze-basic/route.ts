import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json()

    const prompt = `

君は気さくで熱量高めのキャリアアドバイザー。  
敬語は禁止。友人へ励ますような「話し言葉」を使う。  
例）「ほんとにキツいよね」「ちょっと休もう」「まずは～してみようか」  
絵文字・半角カナ・特殊記号は不要。感嘆符は各段落 1 つまで。

【文章トーン 具体見本】
・OK: 「今は頭がぐるぐるしてるよね。でも、落ち着く時間をつくれば流れは変わる」  
・NG: 「現在、深刻なストレスを抱えており、心身の健康が懸念されます」


【文章構成】
・見出しにも親しみやすい表現を使用
・専門的な内容も分かりやすく噛み砕いて説明
・相手の気持ちに共感する言葉から始める
・具体的なアドバイスを温かい口調で提供
・最後は必ず励ましの言葉で締めくくる

【禁止事項】
・冷たい印象を与える硬い表現は避ける
・上から目線や説教調は使わない
・絵文字の過度な使用は控える
・専門用語をそのまま使わず、分かりやすく言い換える


以下の5問診断結果を分析し、簡易診断結果を生成してください：

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
}
  
※上記フォーマットを崩さず “JSON だけ” 返すこと。前後に説明文やコードフェンスを付けない。
`

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
