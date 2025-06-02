import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { basicAnswers, textInput, chatHistory, previousAnalysis } = await request.json()

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

全ての診断情報を統合し、最終診断結果を生成してください：

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
}
  ※上記フォーマットを崩さず “JSON だけ” 返すこと。前後に説明文やコードフェンスを付けない。
  `

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
