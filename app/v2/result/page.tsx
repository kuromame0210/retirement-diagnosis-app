"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRight, AlertTriangle, CheckCircle, Clock, Sparkles, Brain, Target, ExternalLink, Star, DollarSign, MessageCircle } from "lucide-react"
import { V2Answers, validateV2Answers } from "@/lib/v2/questions"
import { recommendV2Services, V2RecommendedService } from "@/lib/v2/serviceRecommendation"
import { trackEvent, createServiceClickEvent } from "@/lib/analytics"

// V2専用のクリック履歴保存関数
const saveV2ClickedService = (id: string, name: string, url: string) => {
  if (typeof window === 'undefined') return
  
  try {
    const v2ClickedServices = sessionStorage.getItem('v2_clicked_services')
    let clickedServices = []
    if (v2ClickedServices) {
      try {
        clickedServices = JSON.parse(v2ClickedServices)
      } catch (e) {
        clickedServices = []
      }
    }
    
    // 重複チェック
    if (!clickedServices.find((s: any) => s.id === id)) {
      clickedServices.push({
        id,
        name,
        url,
        clickedAt: new Date().toISOString()
      })
      sessionStorage.setItem('v2_clicked_services', JSON.stringify(clickedServices))
      console.log('V2クリック履歴保存:', { id, name, url, total: clickedServices.length })
    }
  } catch (e) {
    console.warn('V2クリック履歴保存エラー:', e)
  }
}

interface V2DiagnosisResult {
  type: string
  urgency: "high" | "medium" | "low"
  summary: string
  advice: string
  actionPlan: string[]
  serviceRecommendations: V2RecommendedService[]
}

// ローカル分析関数（AI API失敗時のフォールバック）
const generateLocalV2Analysis = (answers: V2Answers): V2DiagnosisResult => {
  console.log("V2ローカル分析を生成中:", answers)
  
  // 必要な回答が欠けている場合のエラーハンドリング
  if (!answers.satisfaction) {
    console.error("satisfaction が見つかりません:", answers)
    throw new Error("満足度の回答が見つかりません")
  }
  
  console.log("satisfaction値:", answers.satisfaction)
  console.log("money_reality値:", answers.money_reality)
  console.log("breaking_point値:", answers.breaking_point)
  
  let type = "検討型"
  let urgency: "high" | "medium" | "low" = "medium"
  let summary = ""
  let advice = ""
  let actionPlan: string[] = []
  
  // 月曜日の朝の感情による基本分析
  if (answers.satisfaction === "dread") {
    type = "緊急転職型"
    urgency = "high"
    summary = "月曜日の朝に吐き気を感じるレベルは明らかに異常です。あなたの心と身体が「今すぐここから逃げろ」と警告を発しています。これは甘えでも弱さでもありません。生理的な拒絶反応が起きている状況で働き続けることは、うつ病や身体的な病気につながる危険性が高いです。"
  } else if (answers.satisfaction === "heavy") {
    type = "転職検討型"
    urgency = "medium"
    summary = "職場に向かう足取りが重いのは、あなたの本能が「この環境は自分に合わない」と教えてくれているサインです。まだ耐えられる範囲かもしれませんが、このまま放置すると確実に悪化します。今が動くべきタイミングです。"
  } else if (answers.satisfaction === "neutral") {
    type = "様子見型"
    urgency = "low"  
    summary = "現状に特別な不満はないものの、「このままでいいのか？」という漠然とした不安があるのではないでしょうか。安定は得られているが、成長や充実感に欠けている状態です。人生は一度きり。もっと充実した働き方を探す価値があります。"
  } else if (answers.satisfaction === "excited") {
    type = "成長志向型"
    urgency = "low"
    summary = "仕事に対してポジティブな感情を持てているのは素晴らしいことです。しかし、夜に「逃げ出したい」と考えているということは、表面的には満足していても内面では葛藤があるようですね。より本質的な満足を求めて動き出すタイミングかもしれません。"
  } else {
    type = "検討型"
    urgency = "medium"
    summary = "現在の状況について複雑な感情をお持ちのようですね。一概には言えませんが、転職を考える時期に来ているのかもしれません。"
  }
  
  // 夜の思考パターンによる緊急度調整
  if (answers.night_thoughts === "escape_thoughts") {
    urgency = "high"
    summary += "夜に『逃げ出したい』という思考が浮かぶのは、日中に抑圧された本音が表れている状態です。これは心の限界が近づいているサインです。"
  } else if (answers.night_thoughts === "tomorrow_work") {
    if (urgency === "low") urgency = "medium"
    summary += "明日の仕事のことで頭がいっぱいになるのは、ワークライフバランスが完全に崩れている証拠です。"
  }
  
  // 最優先アクションを特定（ここで包括的に判断）
  let criticalActions: string[] = []
  
  // 健康リスクが最優先
  if (answers.breaking_point?.includes("health_warning") || answers.satisfaction === "dread") {
    criticalActions.push("即座に有給を取得し、心身の休息を最優先する")
  }
  
  // パワハラ環境は緊急脱出
  if (answers.breaking_point?.includes("boss_unreasonable") || answers.relationship_reality === "toxic_environment") {
    criticalActions.push("有害な職場環境から90日以内に転職する")
  }
  
  // 経済状況と夜の思考を組み合わせた詳細なアドバイス生成
  if (answers.money_reality === "barely_survive" || answers.money_reality === "no_luxury") {
    if (answers.night_thoughts === "escape_thoughts") {
      advice = "経済的に厳しい中で「逃げ出したい」と考えているあなたの状況は本当に辛いものです。でも諦める必要はありません。転職活動では「年収アップ」を絶対条件にして、生活を立て直しましょう。今の環境では心身ともに消耗するだけです。"
    } else {
      advice = "経済的な制約がある中でも、転職によって状況を改善できる可能性は十分にあります。年収アップを最優先に、計画的に行動していきましょう。"
    }
    if (criticalActions.length < 3) {
      criticalActions.push("年収を最低20%上げる転職先のみに応募する")
    }
  } else if (answers.money_reality === "comfortable" || answers.money_reality === "wealthy") {
    if (answers.night_thoughts === "escape_thoughts") {
      advice = "経済的な余裕があるのに「逃げ出したい」と感じているということは、お金以外の深刻な問題があります。働き方、人間関係、やりがいなど、本質的な満足を追求する時期です。妥協する必要はありません。"
    } else if (answers.night_thoughts === "better_life") {
      advice = "経済的安定があるあなたには、より高い次元での充実を求める権利があります。「もっと良い人生」を実現するため、理想的な働き方を追求していきましょう。"
    } else {
      advice = "経済面での余裕があるあなたには、お金以上に大切なものを追求する権利があります。「やりがい」「成長」「働き方」を妥協せず、理想の環境を求めて動くべきです。"
    }
    if (criticalActions.length < 3) {
      criticalActions.push("企業文化と価値観の適合性を最重要視する")
    }
  } else {
    if (answers.night_thoughts === "tomorrow_work") {
      advice = "明日の仕事のことで頭がいっぱいになってしまう状況は、明らかにワークライフバランスが崩れています。現状維持は実質的な後退です。積極的に変化を起こしていきましょう。"
    } else {
      advice = "現在の状況を冷静に分析すると、変化が必要な時期に来ています。現状維持は実質的な後退です。積極的に行動を起こしましょう。"
    }
  }
  
  // 転職活動の準備状況に基づく具体的アクション
  if (answers.action_readiness === "serious_hunting" || answers.action_readiness === "active_preparation") {
    if (criticalActions.length < 3) {
      criticalActions.push("転職エージェント2社と面談し、市場価値を客観視する")
    }
  } else if (answers.action_readiness === "just_thinking" || answers.action_readiness === "not_ready") {
    if (criticalActions.length < 3) {
      criticalActions.push("30日以内に転職活動を開始する明確な決断をする")
    }
  }
  
  // スキル自信度に基づく戦略
  if (answers.skill_confidence === "very_low" || answers.skill_confidence === "low_confidence") {
    if (criticalActions.length < 3) {
      criticalActions.push("3ヶ月以内に市場価値を高める具体的スキルを身につける")
    }
  } else if (answers.skill_confidence === "high_confidence") {
    if (criticalActions.length < 3) {
      criticalActions.push("現在の年収+30%以上の求人のみに絞って応募する")
    }
  }
  
  // 理想の未来に基づく方向性（最後に追加）
  if (criticalActions.length < 3) {
    if (answers.ideal_future === "freelance_expert") {
      criticalActions.push("6ヶ月以内に副業で収入を得られる体制を構築する")
    } else if (answers.ideal_future === "corporate_leader") {
      criticalActions.push("マネジメント経験を積める環境への転職を決断する")
    } else if (answers.ideal_future === "work_life_balance") {
      criticalActions.push("残業月20時間以下の企業のみを転職候補にする")
    } else {
      criticalActions.push("自分の価値観を明確にし、それに合った転職軸を決める")
    }
  }
  
  // フリーテキストがある場合は、より具体的なアドバイスを追加
  if (answers.freeText && answers.freeText.trim().length > 10) {
    console.log("フリーテキストあり、具体的アドバイスを強化:", answers.freeText)
    
    // フリーテキストの内容に基づいて追加アドバイス
    const freeTextLower = answers.freeText.toLowerCase()
    if (freeTextLower.includes("上司") || freeTextLower.includes("パワハラ") || freeTextLower.includes("理不尽")) {
      if (!criticalActions.some(action => action.includes("人間関係"))) {
        criticalActions.push("人間関係の問題について労働相談窓口に相談する")
      }
    }
    if (freeTextLower.includes("残業") || freeTextLower.includes("長時間") || freeTextLower.includes("休日出勤")) {
      if (!criticalActions.some(action => action.includes("労働時間"))) {
        criticalActions.push("労働時間の改善を求めるか転職活動を本格化する")
      }
    }
    if (freeTextLower.includes("給料") || freeTextLower.includes("年収") || freeTextLower.includes("お金")) {
      if (!criticalActions.some(action => action.includes("年収"))) {
        criticalActions.push("市場価値を調査して適正年収での転職を目指す")
      }
    }
    
    // アドバイスにも個別の状況を反映
    advice += ` あなたが詳しく書いてくださった状況を拝見すると、個別の課題に対しても具体的な対策が必要ですね。一人で抱え込まず、専門家のサポートを受けることをお勧めします。`
  }
  
  // 最終的に3つに絞る
  actionPlan = criticalActions.slice(0, 3)
  
  // サービス推奨（新しいロジック使用）
  let serviceRecommendations: V2RecommendedService[] = []
  try {
    serviceRecommendations = recommendV2Services(answers)
  } catch (error) {
    console.error("サービス推奨エラー:", error)
    // フォールバック: 空の配列
    serviceRecommendations = []
  }
  
  const result = {
    type,
    urgency,
    summary,
    advice,
    actionPlan,
    serviceRecommendations
  }
  
  console.log("ローカル分析完了:", result)
  console.log("生成されたtype:", type)
  console.log("生成されたsummary:", summary)
  
  return result
}

export default function V2ResultPage() {
  const router = useRouter()
  const [answers, setAnswers] = useState<V2Answers | null>(null)
  const [result, setResult] = useState<V2DiagnosisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(0)

  useEffect(() => {
    console.log("=== V2結果ページ - セッションデータ確認 ===")
    
    // React StrictModeでの重複実行を防ぐためのフラグ
    let isEffectActive = true
    
    // セッションストレージから回答を取得
    const v2AnswersStr = sessionStorage.getItem('v2_answers')
    
    if (!v2AnswersStr) {
      console.error("❌ V2回答データが見つかりません")
      if (isEffectActive) {
        setError("診断データが見つかりません。最初からやり直してください。")
        setLoading(false)
      }
      return
    }
    
    try {
      const parsedAnswers = JSON.parse(v2AnswersStr) as V2Answers
      console.log("V2回答データ:", parsedAnswers)
      
      console.log("バリデーションチェック開始:", parsedAnswers)
      
      if (!validateV2Answers(parsedAnswers)) {
        console.error("❌ V2回答データが不完全です")
        console.error("不完全なデータ:", parsedAnswers)
        console.error("必要なフィールド:", Object.keys(parsedAnswers))
        if (isEffectActive) {
          setError("回答データが不完全です。診断をやり直してください。")
          setLoading(false)
        }
        return
      }
      
      console.log("バリデーション成功")
      
      if (isEffectActive) {
        setAnswers(parsedAnswers)
      }
      
      // セッションストレージのキャッシュをクリアしてテスト
      sessionStorage.removeItem('v2_result')
      console.log("V2結果キャッシュをクリアしました")
      
      console.log("キャッシュを無視して新規分析を実行")
      
      // 新規分析を実行
      try {
        if (isEffectActive) {
          analyzeV2Answers(parsedAnswers)
        }
      } catch (analysisError) {
        console.error("分析処理エラー:", analysisError)
        if (isEffectActive) {
          setError("分析処理中にエラーが発生しました。")
          setLoading(false)
        }
      }
      
    } catch (parseError) {
      console.error("❌ V2回答データの解析に失敗:", parseError)
      if (isEffectActive) {
        setError("回答データの解析に失敗しました。診断をやり直してください。")
        setLoading(false)
      }
    }

    // クリーンアップ関数
    return () => {
      isEffectActive = false
    }
  }, [])

  // ローディングメッセージを動的に変更
  useEffect(() => {
    if (!loading) return

    const messages = [
      "あなたの回答を詳しく分析しています",
      "AIがパーソナライズド診断を生成中",
      "最適なサービス5選を選定中",
      "もうすぐ完了します"
    ]

    const interval = setInterval(() => {
      setLoadingMessage((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [loading])

  const analyzeV2Answers = async (answersData: V2Answers) => {
    try {
      console.log("=== V2 AI分析開始 ===")
      console.log("分析対象のanswers:", JSON.stringify(answersData, null, 2))

      // まずローカル分析を生成（即座に表示用）
      console.log("ローカル分析を生成します...")
      const localResult = generateLocalV2Analysis(answersData)
      console.log("ローカル分析結果:", localResult)
      setResult(localResult)
      setLoading(false)

      // データベースに先にローカル結果で保存
      saveV2DiagnosisToDatabase(answersData, localResult)

      // AI分析を裏側で実行
      try {
        console.log("AI分析リクエスト送信中...")
        console.log("送信するデータ:", { answers: answersData, version: "v2", analysisType: "complete" })
        
        const response = await fetch("/api/final-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            answers: answersData,
            version: "v2",
            analysisType: "complete"
          }),
        })

        console.log("AI分析レスポンス:", response.status, response.statusText)

        if (response.ok) {
          const aiResult = await response.json()
          console.log("V2 AI分析成功:", aiResult)
          console.log("AI結果のtype:", aiResult?.result?.type)
          
          // AI結果で更新（エラー結果でない場合のみ）
          if (aiResult && aiResult.result && aiResult.result.type !== "診断エラー") {
            console.log("AI分析結果を適用します")
            setResult(aiResult.result)
            
            // セッションストレージに保存
            sessionStorage.setItem('v2_result', JSON.stringify(aiResult.result))
            
            // データベースに再保存（AI結果で更新）
            saveV2DiagnosisToDatabase(answersData, aiResult.result)
            
            console.log("V2 AI分析完了、結果を更新しました")
          } else {
            console.warn("AI結果がエラー（おそらくAPIキー上限）:", aiResult)
            console.log("高品質なローカル分析結果を維持します:", localResult)
            // ローカル分析結果はそのまま使用（既にsetResultされている）
          }
        } else {
          const errorText = await response.text()
          console.warn("V2 AI分析失敗:", response.status, errorText)
          console.log("ローカル分析結果を維持します")
          
          // API制限の場合の説明を追加
          if (response.status === 401 || response.status === 429) {
            console.log("API制限のため高品質ローカル分析を使用")
          }
        }
      } catch (aiError) {
        console.warn("V2 AI分析でエラー:", aiError)
        console.log("ローカル分析結果を維持します")
      }

    } catch (err) {
      console.error("V2分析エラー:", err)
      setError(err instanceof Error ? err.message : "分析中にエラーが発生しました")
      setLoading(false)
    }
  }

  const saveV2DiagnosisToDatabase = async (answersData: V2Answers, resultData: V2DiagnosisResult) => {
    try {
      console.log("=== V2診断データベース保存開始 ===")
      console.log("保存する回答データ:", answersData)
      console.log("保存する結果データ:", resultData)
      
      // セッションIDを生成または取得（UUID形式で生成）
      let sessionId = sessionStorage.getItem('v2_session_id')
      if (!sessionId) {
        // UUID形式のIDを生成
        sessionId = crypto.randomUUID()
        sessionStorage.setItem('v2_session_id', sessionId)
      }

      // 重複保存を防ぐためのフラグをチェック
      const saveKey = `v2_saved_${sessionId}`
      const alreadySaved = sessionStorage.getItem(saveKey) === 'true'
      
      console.log("重複保存チェック:", { sessionId, saveKey, alreadySaved })
      
      if (alreadySaved) {
        console.log("既に保存済みのセッションです。重複保存をスキップします。")
        return
      }
      
      // 保存開始をマーク（失敗時にクリアされる）
      sessionStorage.setItem(saveKey, 'saving')

      // V2のクリック履歴を取得
      const v2ClickedServices = sessionStorage.getItem('v2_clicked_services')
      let clickedServices = []
      if (v2ClickedServices) {
        try {
          clickedServices = JSON.parse(v2ClickedServices)
          console.log("V2クリック履歴を取得:", clickedServices)
        } catch (e) {
          console.warn("V2クリック履歴の解析に失敗:", e)
        }
      } else {
        console.log("V2クリック履歴が見つかりません")
      }

      const saveData = {
        answers: answersData,
        result: resultData,
        sessionId,
        userAgent: navigator.userAgent,
        prefecture: null, // TODO: 都道府県取得があれば実装
        isInitialSave: false, // 診断完了時の保存
        clickedServices // クリック履歴を追加
      }
      
      console.log("V2診断保存データ:", {
        ...saveData,
        clickedServicesCount: clickedServices.length
      })

      console.log("データベース保存リクエスト:", JSON.stringify(saveData, null, 2))
      console.log("保存時のresult.type:", resultData.type)
      console.log("期待されるfinal_type:", `v2_${resultData.type}`)

      const response = await fetch("/api/save-v2-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      })

      console.log("データベース保存レスポンス:", response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log("✅ V2診断データ保存成功:", result)
        
        // 保存成功フラグを設定
        sessionStorage.setItem(saveKey, 'true')
        
        // 保存成功を追跡
        trackEvent('v2_diagnosis_saved', {
          version: 'v2',
          result_type: resultData.type,
          urgency: resultData.urgency,
          save_id: result.id
        })
      } else {
        const errorText = await response.text()
        console.warn("❌ V2診断データ保存失敗:", response.status, errorText)
        
        // 保存失敗時はフラグをクリア（再試行可能にする）
        sessionStorage.removeItem(saveKey)
      }
    } catch (saveError) {
      console.warn("V2診断データ保存でエラー:", saveError)
      // エラー時もフラグをクリア（再試行可能にする）
      const saveKey = `v2_saved_${sessionId}`
      sessionStorage.removeItem(saveKey)
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "high":
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case "medium":
        return <Clock className="w-5 h-5 text-yellow-500" />
      case "low":
        return <CheckCircle className="w-5 h-5 text-green-500" />
      default:
        return null
    }
  }

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "緊急度：高"
      case "medium":
        return "緊急度：中"
      case "low":
        return "緊急度：低"
      default:
        return ""
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // ローディング状態の表示
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-0 shadow-2xl">
            <CardContent className="py-16 px-8">
              <div className="text-center">
                {/* メインアニメーション */}
                <div className="relative mb-8">
                  {/* 外側の回転リング */}
                  <div className="w-24 h-24 mx-auto relative">
                    <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-transparent border-t-blue-500 rounded-full animate-spin animate-reverse"></div>
                  </div>
                  
                  {/* 中央のアイコン */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>

                {/* タイトル */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    AI分析中
                  </span>
                </h2>
                
                {/* 動的メッセージ */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <p className="text-gray-600 text-lg transition-all duration-500">
                    {["あなたの回答を詳しく分析しています", "AIがパーソナライズド診断を生成中", "最適なサービス5選を選定中", "もうすぐ完了します"][loadingMessage]}
                  </p>
                  <p className="text-gray-500 text-sm">Claude 3.5 Sonnetによる高精度分析</p>
                </div>

                {/* プログレスバー風装飾 */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full animate-pulse" style={{width: '80%'}}></div>
                </div>
                
                <p className="text-xs text-gray-400">
                  ✨ v2 パーソナライズド分析エンジン
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex gap-4 mt-4">
            <Button onClick={() => window.location.reload()}>
              再試行
            </Button>
            <Button variant="outline" onClick={() => router.push('/v2')}>
              最初からやり直す
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 結果が存在しない場合の表示
  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center py-12">
            <p className="text-gray-600">結果を準備中です...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-4xl">
        
        {/* ヘッダー */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 text-green-700 rounded-full text-xs sm:text-sm font-medium mb-4 shadow-lg">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
            AI診断結果
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-2">
            あなたの退職診断結果
          </h1>
          <p className="text-sm sm:text-base text-gray-600 px-4">Claude 3.5 Sonnetによる詳細分析とTOP5サービス推奨</p>
        </div>

        {/* 診断結果カード */}
        <Card className="mb-6 sm:mb-8 shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl">🎯</span>
                {result.type}
              </CardTitle>
              <div className="flex items-center space-x-2">
                {getUrgencyIcon(result.urgency)}
                <span className="text-xs sm:text-sm font-medium">{getUrgencyText(result.urgency)}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                  <Target className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500" />
                  現在の状況分析
                </h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{result.summary}</p>
              </div>
              
              <div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                  <Brain className="w-4 sm:w-5 h-4 sm:h-5 text-green-500" />
                  AIからのアドバイス
                </h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{result.advice}</p>
              </div>
              
              {result.actionPlan.length > 0 && (
                <div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-purple-500" />
                    具体的なアクションプラン
                  </h3>
                  <ul className="space-y-2">
                    {result.actionPlan.map((action, index) => (
                      <li key={index} className="flex items-start gap-2 sm:gap-3">
                        <span className="text-green-500 font-bold mt-1 text-sm sm:text-base">{index + 1}.</span>
                        <span className="text-sm sm:text-base text-gray-700">{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TOP5サービス推奨 */}
        <Card className="mb-6 sm:mb-8 shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl flex items-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">🏆</span>
              あなたにおすすめのTOP5サービス
            </CardTitle>
            <p className="text-sm sm:text-base text-gray-600 mt-2">あなたの状況に最適化されたサービスを優先度順にご提案</p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="space-y-4 sm:space-y-6">
              {result.serviceRecommendations.map((service, index) => {
                const getRankStyle = (index: number) => {
                  switch (index) {
                    case 0:
                      return {
                        cardClass: "relative border-2 border-yellow-400 rounded-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg",
                        rankBadge: "w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg border-4 border-white",
                        rankIcon: "🏆",
                        rankText: "1位"
                      }
                    case 1:
                      return {
                        cardClass: "relative border-2 border-gray-400 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-gray-50 to-blue-50 shadow-md",
                        rankBadge: "w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg border-4 border-white",
                        rankIcon: "🥈",
                        rankText: "2位"
                      }
                    case 2:
                      return {
                        cardClass: "relative border-2 border-orange-400 rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-md",
                        rankBadge: "w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg border-4 border-white",
                        rankIcon: "🥉",
                        rankText: "3位"
                      }
                    default:
                      return {
                        cardClass: "relative border border-blue-200 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 bg-white",
                        rankBadge: "w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-md border-3 border-white",
                        rankIcon: "⭐",
                        rankText: `${index + 1}位`
                      }
                  }
                }
                
                const rankStyle = getRankStyle(index)
                
                return (
                  <div 
                    key={index} 
                    className={`${rankStyle.cardClass} cursor-pointer group`}
                    onClick={() => {
                      console.log('=== V2 CARD CLICK DEBUG ===')
                      console.log('Service object:', service)
                      console.log('Service URL:', service.url)
                      console.log('Service ID:', service.id)
                      console.log('Service name:', service.name)
                      
                      // V2専用のクリック履歴保存
                      saveV2ClickedService(service.id, service.name, service.url)
                      
                      trackEvent('v2_service_card_click', {
                        button_location: 'v2_result_page',
                        service_name: service.name,
                        service_id: service.id,
                        service_rank: index + 1,
                        click_type: 'card_click'
                      })
                      
                      window.open(service.url, '_blank')
                    }}
                  >
                    {/* ランキングバッジ（左上に配置） */}
                    <div className="absolute -top-3 -left-3 z-20">
                      <div className={rankStyle.rankBadge}>
                        <div className="text-center">
                          <div className="text-lg sm:text-xl">{rankStyle.rankIcon}</div>
                          <div className="text-xs font-bold">{rankStyle.rankText}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 sm:p-6 relative pt-8">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 ml-4 sm:ml-12">
                            <div className="flex-1 order-1 sm:order-2 text-center sm:text-left">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <h4 
                                  className={`cursor-pointer transition-all duration-200 ${
                                    index === 0 
                                      ? 'text-3xl sm:text-4xl font-black text-black hover:text-gray-900 drop-shadow-xl' 
                                      : index === 1
                                      ? 'text-2xl sm:text-3xl font-bold text-black hover:text-gray-900 drop-shadow-lg'
                                      : index === 2
                                      ? 'text-xl sm:text-2xl font-bold text-black hover:text-gray-900 drop-shadow-md'
                                      : 'text-lg sm:text-xl font-bold text-gray-800 hover:text-blue-600'
                                  }`}
                                  style={{
                                    textShadow: index === 0 
                                      ? '1px 1px 0px #fbbf24, -1px -1px 0px #fbbf24, 1px -1px 0px #fbbf24, -1px 1px 0px #fbbf24, 2px 2px 0px #f59e0b, 0px 0px 8px #fbbf24'
                                      : index === 1
                                      ? '1px 1px 0px #e5e7eb, -1px -1px 0px #e5e7eb, 1px -1px 0px #e5e7eb, -1px 1px 0px #e5e7eb, 2px 2px 0px #6b7280, 0px 0px 8px #9ca3af'
                                      : index === 2
                                      ? '1px 1px 0px #fed7aa, -1px -1px 0px #fed7aa, 1px -1px 0px #fed7aa, -1px 1px 0px #fed7aa, 2px 2px 0px #ea580c, 0px 0px 8px #f97316'
                                      : undefined
                                  }}
                                  onClick={() => {
                                    console.log('=== V2 TITLE CLICK DEBUG ===')
                                    console.log('Service object:', service)
                                    console.log('Service URL:', service.url)
                                    console.log('Service ID:', service.id)
                                    console.log('Service name:', service.name)
                                    
                                    // V2専用のクリック履歴保存
                      saveV2ClickedService(service.id, service.name, service.url)
                                    
                                    // 詳細なサービスクリックイベント
                                    const detailedEvent = createServiceClickEvent(service.id, service.name, 'v2')
                                    trackEvent(detailedEvent, {
                                      button_location: 'v2_result_page',
                                      service_name: service.name,
                                      service_id: service.id,
                                      service_rank: index + 1,
                                      click_type: 'title_click',
                                      event_type: 'v2_final_page_service_click'
                                    })
                                    
                                    // 従来のイベントも送信（互換性のため）
                                    trackEvent('v2_service_title_click', {
                                      button_location: 'v2_result_page',
                                      service_name: service.name,
                                      service_id: service.id,
                                      service_rank: index + 1,
                                      click_type: 'title_click'
                                    })
                                    
                                    window.open(service.url, '_blank')
                                  }}
                                >
                                  {service.name}
                                </h4>
                                <ExternalLink className="w-4 h-4 text-blue-500 group-hover:text-green-500 transition-colors mx-auto sm:mx-0" />
                              </div>
                              <p className="text-xs sm:text-sm text-gray-600">{Array.isArray(service.category) ? service.category.join(' • ') : service.category}</p>
                            </div>
                            {service.image && (
                              <img 
                                src={service.image} 
                                alt={service.name}
                                className="w-full h-56 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-xl object-contain sm:object-cover shadow-md hover:shadow-lg transition-shadow flex-shrink-0 mx-auto sm:mx-0 order-2 sm:order-1"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(service.priority)} group-hover:scale-105 transition-transform`}>
                          {service.priority === "high" ? "高優先度" : service.priority === "medium" ? "中優先度" : "低優先度"}
                        </span>
                      </div>
                      
                      <p className="text-sm sm:text-base text-gray-700 mb-6 group-hover:text-gray-900 transition-colors">{service.description}</p>
                      
                      {/* カテゴリ情報 */}
                      {service.category && (
                        <div className="mb-4">
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {Array.isArray(service.category) ? (
                              service.category.map((cat, idx) => (
                                <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium">
                                  {cat}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-md font-medium group-hover:bg-purple-200 transition-colors">
                                {service.category}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* タグ */}
                      {service.tags && (Array.isArray(service.tags) ? service.tags.length > 0 : true) && (
                        <div className="mb-4">
                          <h5 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 group-hover:text-yellow-600 transition-colors" />
                            特徴タグ
                          </h5>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {Array.isArray(service.tags) ? (
                              service.tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md group-hover:bg-gray-200 transition-colors">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md group-hover:bg-gray-200 transition-colors">
                                {service.tags}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-6 group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                        <p className="text-sm sm:text-base text-blue-800">
                          <strong>推奨理由:</strong> {service.reason}
                        </p>
                      </div>
                      
                      {/* 詳細確認ボタン */}
                      <button
                        className={`w-full py-5 sm:py-6 px-6 sm:px-8 rounded-xl font-bold text-lg sm:text-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 ${
                          index === 0 
                            ? "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-orange-600 text-black shadow-xl hover:shadow-2xl animate-pulse hover:animate-none font-black" 
                            : index === 1
                            ? "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl animate-pulse hover:animate-none"
                            : index === 2
                            ? "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl animate-pulse hover:animate-none"
                            : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation() // カード全体のクリックを防ぐ
                          console.log('=== V2 BUTTON CLICK DEBUG ===')
                          console.log('Service object:', service)
                          console.log('Service URL:', service.url)
                          console.log('Service ID:', service.id)
                          console.log('Service name:', service.name)
                          
                          // V2専用のクリック履歴保存
                      saveV2ClickedService(service.id, service.name, service.url)
                          
                          // 詳細なサービスクリックイベント
                          const detailedEvent = createServiceClickEvent(service.id, service.name, 'v2')
                          trackEvent(detailedEvent, {
                            button_location: 'v2_result_page',
                            service_name: service.name,
                            service_id: service.id,
                            service_rank: index + 1,
                            button_text: index === 0 ? '🚀 今すぐ詳細をチェック！' : '✨ 詳細を確認する',
                            click_type: 'button_click',
                            event_type: 'v2_final_page_service_click',
                            is_top_recommendation: index === 0
                          })
                          
                          // 従来のイベントも送信（互換性のため）
                          trackEvent('v2_service_button_click', {
                            button_location: 'v2_result_page',
                            service_name: service.name,
                            service_id: service.id,
                            service_rank: index + 1,
                            click_type: 'button_click'
                          })
                          
                          window.open(service.url, '_blank')
                        }}
                      >
                        <span className="text-2xl sm:text-3xl">👆</span>
                        <span>{index === 0 ? '🚀 今すぐ詳細をチェック！' : '✨ 詳細を確認する'}</span>
                        <ExternalLink className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* さらに詳細な診断の案内 */}
        <Card className="mb-6 sm:mb-8 shadow-xl border-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                さらに詳細に診断しませんか？
              </h3>
              <p className="text-sm sm:text-base text-gray-700 mb-6 leading-relaxed">
                テキストチャットで対話しながら、あなたのことをより深く紐解いて<br className="hidden sm:block" />
                パーソナライズされたアドバイスをお提供できます
              </p>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <Button 
                size="lg"
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 sm:py-6 px-6 sm:px-8 text-lg sm:text-xl shadow-2xl transform hover:scale-105 transition-all duration-200 relative overflow-hidden rounded-xl border-0"
                onClick={() => {
                  trackEvent('ai_chat_start_click', {
                    button_location: 'v2_result_page',
                    source_diagnosis: 'v2',
                    result_type: result.type,
                    urgency_level: result.urgency,
                    button_text: 'AI対話診断を始める'
                  })
                  router.push('/diagnosis/chat')
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                <div className="relative flex items-center justify-center gap-2 sm:gap-3">
                  <MessageCircle className="w-5 sm:w-6 h-5 sm:h-6" />
                  AI対話診断を始める
                  <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6" />
                </div>
              </Button>
              
              <div className="flex items-center justify-center gap-4 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>無料</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>約5-10分</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>個別対応</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 行動促進ボタン */}
        <div className="text-center space-y-3 sm:space-y-4 px-4">
          <Button 
            size="lg"
            variant="outline"
            className="w-full sm:w-auto border-2 border-green-500 text-green-700 hover:bg-green-50 hover:border-green-600 font-bold py-4 sm:py-5 px-6 sm:px-8 text-base sm:text-lg shadow-lg transform hover:scale-105 transition-all duration-200 rounded-xl"
            onClick={() => {
              trackEvent('diagnosis_retry_click', {
                button_location: 'v2_result_page',
                source_diagnosis: 'v2',
                result_type: result.type,
                urgency_level: result.urgency,
                button_text: 'もう一度診断する'
              })
              router.push('/v2')
            }}
          >
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-lg sm:text-xl">🔄</span>
              もう一度診断する
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
          </Button>
          
          <p className="text-gray-600 text-xs sm:text-sm px-2">
            結果をスクリーンショットで保存することをおすすめします
          </p>
        </div>
      </div>
    </div>
  )
}