import Anthropic from "@anthropic-ai/sdk"
import { type NextRequest, NextResponse } from "next/server"
import { recommendV2Services } from "@/lib/v2/serviceRecommendation"

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

console.log("Anthropic API key configured:", !!process.env.ANTHROPIC_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { basicAnswers, textInput, chatHistory, previousAnalysis, answers, version, analysisType } = body

    // v2診断の場合
    if (version === "v2" && answers) {
      console.log("V2 AI分析開始 - 新しい質問構造対応")
      console.log("受信したV2回答データ:", JSON.stringify(answers, null, 2))
      
      // サービス推奨システムを使用してパーソナライズされた推奨を生成
      let smartRecommendations = []
      try {
        smartRecommendations = recommendV2Services(answers)
        console.log("Smart service recommendations:", smartRecommendations)
      } catch (recommendError) {
        console.error("サービス推奨エラー:", recommendError)
        smartRecommendations = []
      }
      
      const v2Prompt = `
あなたは親しみやすく経験豊富なキャリアアドバイザーです。友人に話すような温かい口調で、実践的なアドバイスを提供してください。

【新しいパーソナル質問の回答データ】
- 月曜日の朝の感情: ${answers.satisfaction}
- 夜寝る前の思考: ${answers.night_thoughts}
- 「もう無理かも」と思った瞬間: ${answers.breaking_point?.join(", ")}
- 年代: ${answers.demographics?.age}
- 職種: ${answers.demographics?.job}
- お金の現実: ${answers.money_reality}
- 転職への本音: ${answers.escape_plan}
- 5年後の理想の働き方: ${answers.ideal_future}
- スキル・市場価値への自信: ${answers.skill_confidence}
- 職場の人間関係: ${answers.relationship_reality}
- 転職活動への覚悟: ${answers.action_readiness}
- 詳細な状況: ${answers.freeText || "記載なし"}

【事前生成されたスマートサービス推奨】
${smartRecommendations.map((service, index) => 
  `${index + 1}. ${service.name} (${service.category}) - ${service.reason}`
).join("\n")}

以下のJSON形式で回答してください（JSONのみ、説明不要）：
{
  "type": "診断タイプ名",
  "urgency": "high/medium/low",
  "summary": "現在の状況を親しみやすい口調で200文字程度で説明",
  "advice": "温かい口調での基本アドバイス150文字程度",
  "actionPlan": [
    "具体的なアクション1",
    "具体的なアクション2",
    "具体的なアクション3"
  ],
  "serviceRecommendations": ${JSON.stringify(smartRecommendations)}
}

※上記のスマートサービス推奨は回答者の状況に最適化されています。
serviceRecommendationsフィールドは上記JSONをそのまま使用してください。
`

      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{ role: "user", content: v2Prompt }],
      })

      let result
      try {
        const rawText = message.content[0].text
        console.log("V2 AI raw response:", rawText)
        result = JSON.parse(rawText)
        console.log("V2 AI分析結果:", result)
      } catch (parseError) {
        console.error("V2 AI JSON解析エラー:", parseError)
        console.error("Raw response:", message.content[0].text)
        
        // フォールバック: スマート推奨を使用した基本的な結果を生成
        result = {
          type: "検討型",
          urgency: "medium",
          summary: "転職を検討している状況ですね。詳細な分析を行うため、基本的な結果をお伝えします。",
          advice: "現在の状況を整理して、次のステップを考えてみましょう。",
          actionPlan: [
            "自分の強みを整理する",
            "転職市場を調べる",
            "履歴書を準備する"
          ],
          serviceRecommendations: smartRecommendations.length > 0 ? smartRecommendations : []
        }
      }
      
      return NextResponse.json({ result })
    }

    // 従来のv1診断の場合（既に分割代入済みの変数を使用）

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
    return NextResponse.json({ result })
  } catch (error) {
    console.error("Final analysis error:", error)
    console.error("Error type:", typeof error)
    console.error("Error message:", error instanceof Error ? error.message : String(error))
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace")
    
    // エラー時のフォールバック結果
    const fallbackResult = {
      type: "診断エラー",
      urgency: "medium",
      summary: "申し訳ございません。分析中にエラーが発生しました。基本的なアドバイスをお伝えします。",
      advice: "転職を検討される際は、まず現在の状況を整理することから始めましょう。",
      actionPlan: [
        "自分のキャリアの棚卸しをする",
        "転職の理由を明確にする",
        "転職エージェントに相談する"
      ],
      serviceRecommendations: [
        {
          rank: 1,
          name: "リクルートエージェント", 
          category: "総合転職エージェント",
          description: "業界最大級の求人数と実績",
          reason: "まずは相談から始められます",
          priority: "high"
        }
      ]
    }
    
    return NextResponse.json({ result: fallbackResult })
  }
}
