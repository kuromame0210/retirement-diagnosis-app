"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRight, AlertTriangle, CheckCircle, Clock, Sparkles, Brain, Target, ExternalLink, Star, DollarSign, MessageCircle } from "lucide-react"
import { V2Answers, validateV2Answers } from "@/lib/v2/questions"
import { recommendV2Services, V2RecommendedService } from "@/lib/v2/serviceRecommendation"
import { trackEvent } from "@/lib/analytics"

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
  
  let type = "検討型"
  let urgency: "high" | "medium" | "low" = "medium"
  let summary = ""
  let advice = ""
  let actionPlan: string[] = []
  
  // 月曜日の朝の感情による基本分析
  if (answers.satisfaction === "dread") {
    type = "緊急転職型"
    urgency = "high"
    summary = "月曜日の朝に吐き気を感じるほど辛い状況ですね。心身の健康を考えると、早急な環境改善が必要です。"
  } else if (answers.satisfaction === "heavy") {
    type = "転職検討型"
    urgency = "medium"
    summary = "職場に向かうのが重い気持ちになるのは、現在の環境があなたに合っていないサインかもしれません。"
  } else if (answers.satisfaction === "neutral") {
    type = "様子見型"
    urgency = "low"
    summary = "仕事に対して普通の感情を持っていますが、もっと充実した働き方を見つける余地がありそうです。"
  } else {
    type = "成長型"
    urgency = "low"
    summary = "仕事に対してポジティブな気持ちを持っていますね。さらなる成長機会を探すタイミングかもしれません。"
  }
  
  // 夜の思考パターンによる緊急度調整
  if (answers.night_thoughts === "escape_thoughts") {
    urgency = "high"
    summary += "夜に『逃げ出したい』と考えてしまうのは、相当なストレスを感じている証拠です。"
  } else if (answers.night_thoughts === "tomorrow_work") {
    if (urgency === "low") urgency = "medium"
    summary += "明日の仕事で頭がいっぱいになるのは、仕事の負担が大きいのかもしれません。"
  }
  
  // お金の現実に基づくアドバイス
  if (answers.money_reality === "barely_survive" || answers.money_reality === "no_luxury") {
    advice += "経済的な厳しさを感じているので、年収アップを最優先に転職活動を進めましょう。"
    actionPlan.push("年収アップが期待できる業界・職種を研究する")
    actionPlan.push("給与交渉のスキルを身につける")
  } else if (answers.money_reality === "comfortable" || answers.money_reality === "wealthy") {
    advice += "経済面では安定しているので、やりがいや成長機会を重視した選択ができそうです。"
    actionPlan.push("自分の価値観と合う企業文化を探す")
    actionPlan.push("長期的なキャリアプランを設計する")
  }
  
  // 理想の未来による推奨
  if (answers.ideal_future === "freelance_expert") {
    actionPlan.push("フリーランスとしてのスキルと実績を準備する")
    actionPlan.push("個人事業の基礎知識を学ぶ")
  } else if (answers.ideal_future === "corporate_leader") {
    actionPlan.push("マネジメント経験を積める環境を探す")
    actionPlan.push("リーダーシップスキルを向上させる")
  } else if (answers.ideal_future === "work_life_balance") {
    actionPlan.push("働き方改革に積極的な企業を探す")
    actionPlan.push("残業時間や有給取得率を事前に確認する")
  }
  
  // スキル自信度による推奨
  if (answers.skill_confidence === "very_low" || answers.skill_confidence === "low_confidence") {
    actionPlan.push("まずはスキルアップで市場価値を高める")
    actionPlan.push("オンライン学習や資格取得を検討する")
  } else if (answers.skill_confidence === "high_confidence") {
    actionPlan.push("ハイクラス転職を狙って条件交渉を行う")
    actionPlan.push("スキルを活かせる新しい挑戦を探す")
  }
  
  // 転職活動の覚悟による推奨
  if (answers.action_readiness === "serious_hunting" || answers.action_readiness === "active_preparation") {
    actionPlan.push("既に動いているので、エージェントを活用して効率化を図る")
    actionPlan.push("面接対策を強化して成功率を上げる")
  } else if (answers.action_readiness === "just_thinking" || answers.action_readiness === "not_ready") {
    actionPlan.push("まずは情報収集から始めて転職市場を理解する")
    actionPlan.push("自分の強みと市場価値を客観的に把握する")
  }
  
  // 人間関係の現実による配慮
  if (answers.relationship_reality === "toxic_environment") {
    actionPlan.push("有害な環境から早急に脱出することを最優先にする")
    actionPlan.push("転職時は企業文化や人間関係を慎重に確認する")
  } else if (answers.relationship_reality === "family_like") {
    actionPlan.push("現在の良好な関係を活かしつつ、さらなる成長機会を探す")
    actionPlan.push("社内での昇進・異動も含めて選択肢を検討する")
  }
  
  // 破綻ポイントによる緊急度調整
  if (answers.breaking_point?.includes("health_warning")) {
    urgency = "high"
    actionPlan.push("健康第一。まずは休息と環境改善を最優先に")
  }
  if (answers.breaking_point?.includes("boss_unreasonable")) {
    actionPlan.push("パワハラ環境からの脱出を最優先に転職活動を進める")
  }
  
  // フリーテキストがある場合の追加アドバイス
  if (answers.freeText && answers.freeText.length > 0) {
    actionPlan.push("具体的な状況を踏まえたカスタムアドバイスを実施")
  }
  
  // 基本的なアクションプラン
  if (actionPlan.length === 0) {
    actionPlan = [
      "自分の強みとスキルを整理する",
      "転職市場の動向を調査する",
      "履歴書・職務経歴書を更新する",
      "現在の状況を客観視するための時間を作る"
    ]
  }
  
  // サービス推奨（新しいロジック使用）
  let serviceRecommendations: V2RecommendedService[] = []
  try {
    serviceRecommendations = recommendV2Services(answers)
  } catch (error) {
    console.error("サービス推奨エラー:", error)
    // フォールバック: 空の配列
    serviceRecommendations = []
  }
  
  return {
    type,
    urgency,
    summary,
    advice,
    actionPlan,
    serviceRecommendations
  }
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
    
    // セッションストレージから回答を取得
    const v2AnswersStr = sessionStorage.getItem('v2_answers')
    
    if (!v2AnswersStr) {
      console.error("❌ V2回答データが見つかりません")
      setError("診断データが見つかりません。最初からやり直してください。")
      setLoading(false)
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
        setError("回答データが不完全です。診断をやり直してください。")
        setLoading(false)
        return
      }
      
      console.log("バリデーション成功")
      
      setAnswers(parsedAnswers)
      
      // 既存の結果があるかチェック（一時的に無効化してテスト）
      // const existingResultStr = sessionStorage.getItem('v2_result')
      // if (existingResultStr) {
      //   try {
      //     const existingResult = JSON.parse(existingResultStr) as V2DiagnosisResult
      //     console.log("既存のV2結果を使用:", existingResult)
      //     setResult(existingResult)
      //     setLoading(false)
      //     return
      //   } catch {
      //     console.log("既存結果の解析に失敗、新規分析を実行")
      //   }
      // }
      
      console.log("キャッシュを無視して新規分析を実行")
      
      // 新規分析を実行
      try {
        analyzeV2Answers(parsedAnswers)
      } catch (analysisError) {
        console.error("分析処理エラー:", analysisError)
        setError("分析処理中にエラーが発生しました。")
        setLoading(false)
      }
      
    } catch (parseError) {
      console.error("❌ V2回答データの解析に失敗:", parseError)
      setError("回答データの解析に失敗しました。診断をやり直してください。")
      setLoading(false)
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
      const localResult = generateLocalV2Analysis(answersData)
      setResult(localResult)
      setLoading(false)

      // データベースに先にローカル結果で保存
      saveV2DiagnosisToDatabase(answersData, localResult)

      // AI分析を裏側で実行
      try {
        console.log("AI分析リクエスト送信中...")
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
          
          // AI結果で更新
          if (aiResult && aiResult.result) {
            setResult(aiResult.result)
            
            // セッションストレージに保存
            sessionStorage.setItem('v2_result', JSON.stringify(aiResult.result))
            
            // データベースに再保存（AI結果で更新）
            saveV2DiagnosisToDatabase(answersData, aiResult.result)
            
            console.log("V2 AI分析完了、結果を更新しました")
          } else {
            console.warn("AI結果が不正な形式です:", aiResult)
          }
        } else {
          const errorText = await response.text()
          console.warn("V2 AI分析失敗:", response.status, errorText)
        }
      } catch (aiError) {
        console.warn("V2 AI分析でエラー:", aiError)
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
      
      // セッションIDを生成または取得
      let sessionId = sessionStorage.getItem('v2_session_id')
      if (!sessionId) {
        sessionId = `v2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        sessionStorage.setItem('v2_session_id', sessionId)
      }

      const saveData = {
        answers: answersData,
        result: resultData,
        sessionId,
        userAgent: navigator.userAgent,
        prefecture: null // TODO: 都道府県取得があれば実装
      }

      console.log("データベース保存リクエスト:", JSON.stringify(saveData, null, 2))

      const response = await fetch("/api/save-v2-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saveData),
      })

      console.log("データベース保存レスポンス:", response.status, response.statusText)

      if (response.ok) {
        const result = await response.json()
        console.log("✅ V2診断データ保存成功:", result)
        
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
      }
    } catch (saveError) {
      console.warn("V2診断データ保存でエラー:", saveError)
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
              {result.serviceRecommendations.map((service, index) => (
                <div key={index} className="relative border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 hover:border-green-300 cursor-pointer group">
                  {/* 全体をクリック可能にするためのリンク */}
                  {service.url && (
                    <a 
                      href={service.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="absolute inset-0 z-10"
                      aria-label={`${service.name}の詳細を確認`}
                    />
                  )}
                  
                  <div className="p-4 sm:p-6 relative z-20 pointer-events-none">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg group-hover:scale-110 transition-transform">
                        {service.rank}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{service.name}</h4>
                          <ExternalLink className="w-4 h-4 text-blue-500 group-hover:text-green-500 transition-colors" />
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600">{Array.isArray(service.category) ? service.category.join(' • ') : service.category}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(service.priority)} group-hover:scale-105 transition-transform`}>
                      {service.priority === "high" ? "高優先度" : service.priority === "medium" ? "中優先度" : "低優先度"}
                    </span>
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-700 mb-4 group-hover:text-gray-900 transition-colors">{service.description}</p>
                  
                  {/* カテゴリ情報 */}
                  {service.category && (
                    <div className="mb-3">
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
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 group-hover:bg-blue-100 group-hover:border-blue-300 transition-colors">
                    <p className="text-sm sm:text-base text-blue-800">
                      <strong>推奨理由:</strong> {service.reason}
                    </p>
                  </div>
                  </div>
                  
                  {/* 大きな詳細確認ボタン */}
                  {service.url && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-20">
                      <div className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-4 sm:py-5 px-6 sm:px-8 rounded-xl transition-all duration-200 transform group-hover:scale-105 shadow-xl group-hover:shadow-2xl flex items-center justify-center gap-3 text-lg sm:text-xl pointer-events-auto">
                        <span className="text-2xl sm:text-3xl">👆</span>
                        <span>詳細を確認する</span>
                        <ExternalLink className="w-6 h-6" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
                className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 sm:py-6 px-6 sm:px-8 text-lg sm:text-xl shadow-2xl transform hover:scale-105 transition-all duration-200 relative overflow-hidden rounded-xl"
                onClick={() => {
                  trackEvent('v2_ai_chat_click', { 
                    version: 'v2',
                    result_type: result.type,
                    urgency: result.urgency
                  })
                  // v2の回答データを保持したまま既存のチャット診断へ
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
            className="w-full sm:w-auto border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-bold py-3 sm:py-4 px-6 sm:px-8 text-base sm:text-lg shadow-lg transform hover:scale-105 transition-all duration-200 rounded-xl"
            onClick={() => {
              trackEvent('v2_diagnosis_retry', { 
                version: 'v2',
                result_type: result.type,
                urgency: result.urgency
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