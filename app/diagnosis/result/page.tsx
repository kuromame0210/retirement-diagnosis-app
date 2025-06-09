"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRight, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { getSession, saveSession, getJSTTimestamp } from "@/lib/storage"
import { trackEvent } from "@/lib/analytics"

interface SimpleResult {
  type: string
  urgency: "high" | "medium" | "low"
  summary: string
  advice: string
  needsDetailedAnalysis: boolean
}

// 基本回答から簡易分析を生成する関数
const generateLocalAnalysis = (basicAnswers: Record<string, string>): SimpleResult => {
  console.log("ローカル分析を生成中:", basicAnswers)
  
  // 実際の質問項目に基づいた分析ロジック
  const q1 = basicAnswers.q1 // 今の仕事について
  const q2 = basicAnswers.q2 // 気持ちになった時期
  const q3 = basicAnswers.q3 // 仕事が頭から離れない頻度
  const q4 = basicAnswers.q4 // 一番のストレス要因
  const q5 = basicAnswers.q5 // 退職を考える理由
  
  let type = "検討型"
  let urgency: "high" | "medium" | "low" = "medium"
  let summary = ""
  let advice = ""
  
  // Q1: 今の仕事についての気持ちによる分析
  if (q1 === "quit") {
    type = "転職検討型"
    urgency = "high"
    summary = "現在のお仕事を辞めたいという気持ちをお持ちですね。"
  } else if (q1 === "continue") {
    type = "現状維持型"
    urgency = "low"
    summary = "基本的には今のお仕事を続けたいとお考えですね。"
  } else if (q1 === "unsure") {
    type = "迷い型"
    urgency = "medium"
    summary = "今のお仕事について迷いを感じていらっしゃる状況ですね。"
  } else if (q1 === "never_thought") {
    type = "安定型"
    urgency = "low"
    summary = "これまで転職について深く考えたことがなかったようですね。"
  }
  
  // Q2: 気持ちになった時期による緊急度調整
  if (q2 === "recent") {
    summary += "最近になってその気持ちが強くなってきたということですね。"
  } else if (q2 === "half_year") {
    summary += "半年以上そのような気持ちが続いているということは、根深い問題があるかもしれません。"
    if (urgency === "low") urgency = "medium"
  } else if (q2 === "long_ago" || q2 === "always") {
    summary += "長期間にわたってそのような気持ちを抱えていらっしゃるのですね。"
    if (urgency === "low") urgency = "medium"
    if (urgency === "medium") urgency = "high"
  }
  
  // Q3: 仕事が頭から離れない頻度による分析
  if (q3 === "daily") {
    summary += "仕事のことが頭から離れない状況が続いているようで、かなりのストレスを感じていらっしゃることがうかがえます。"
    urgency = "high"
  } else if (q3 === "few_times_week") {
    summary += "週に数回は仕事のことが気になってしまう状況ですね。"
    if (urgency === "low") urgency = "medium"
  } else if (q3 === "sometimes") {
    summary += "たまに仕事のことが気になることがある程度で、比較的バランスが取れているようですね。"
  } else if (q3 === "rarely") {
    summary += "プライベートと仕事の境界をしっかり保てているようですね。"
  }
  
  // Q4: ストレス要因によるアドバイス
  if (q4 === "relationships") {
    advice = "人間関係のストレスは職場環境に大きく影響します。コミュニケーションの改善やチーム変更の可能性を検討し、難しい場合は環境を変えることも有効な解決策です。"
  } else if (q4 === "workload") {
    advice = "業務量や労働時間の問題は健康に直結します。効率化や業務分担の見直し、必要に応じて上司への相談を行い、改善が見込めない場合は転職を検討することをお勧めします。"
  } else if (q4 === "content") {
    advice = "仕事内容ややりがいの問題は長期的なモチベーションに関わります。現在の職場での業務拡大や、より興味のある分野への転職を検討してみましょう。"
  } else if (q4 === "future") {
    advice = "将来への不安は多くの方が抱える悩みです。キャリアプランの明確化や、成長できる環境への転職を通じて、より明るい未来を築いていくことができます。"
  } else {
    advice = "複数の要因が絡み合った複雑な状況のようですね。一つずつ整理して優先順位をつけることで、最適な解決策が見えてくるでしょう。"
  }
  
  return {
    type,
    urgency,
    summary,
    advice,
    needsDetailedAnalysis: true
  }
}

export default function ResultPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [result, setResult] = useState<SimpleResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessage, setLoadingMessage] = useState(0)

  useEffect(() => {
    const sessionData = getSession()

    // ✅ デバッグ追加
    console.log("=== resultページ - セッションデータ確認 ===")
    console.log("sessionData:", sessionData)
    console.log("basicAnswers存在:", !!sessionData?.basicAnswers)
    console.log("basicAnswers内容:", sessionData?.basicAnswers)
    console.log("simpleResult存在:", !!sessionData?.simpleResult)

    setSession(sessionData)

    if (sessionData?.simpleResult) {
      // 既存の分析結果がある場合
      console.log("既存のsimpleResultを使用")
      setResult(sessionData.simpleResult)
      setLoading(false)
    } else if (sessionData?.basicAnswers && Object.keys(sessionData.basicAnswers).length > 0) {
      // 基本回答があるが分析結果がない場合：ローカル分析を実行
      console.log("simpleResultが存在しないため、ローカル分析を実行")
      const localResult = generateLocalAnalysis(sessionData.basicAnswers)
      
      // 安定した表示のため、一度設定したら変更しない
      setResult(localResult)
      setLoading(false)
      
      // API分析は裏側で非同期実行（画面更新はしない）
      analyzeBasicAnswersInBackground(sessionData.basicAnswers)
    } else {
      console.error("❌ basicAnswersが存在しません")
      setError("基本診断データが見つかりません。最初からやり直してください。")
      setLoading(false)
    }
  }, [])

  // ローディングメッセージを動的に変更
  useEffect(() => {
    if (!loading) return

    const messages = [
      "あなたの回答を分析しています",
      "キャリアパターンを解析中",
      "最適なアドバイスを準備中",
      "AI分析がもうすぐ完了します"
    ]

    const interval = setInterval(() => {
      setLoadingMessage((prev) => (prev + 1) % messages.length)
    }, 2000)

    return () => clearInterval(interval)
  }, [loading])

  // バックグラウンドでAPI分析を実行する関数（画面更新なし）
  const analyzeBasicAnswersInBackground = async (answers: Record<string, string>) => {
    try {
      console.log("=== バックグラウンドでAPI分析開始 ===")
      console.log("分析対象のanswers:", answers)

      const response = await fetch("/api/analyze-basic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log("API分析成功:", data)
        
        // セッションにのみ保存（画面は更新しない）
        const updatedSession = {
          ...session,
          basicAnswers: answers,
          simpleResult: data.result,
        }
        
        saveSession(updatedSession)
        setSession(updatedSession)
        
        console.log("バックグラウンド分析完了、セッションに保存しました（画面更新なし）")
      } else {
        console.warn("API分析失敗 - ローカル結果のまま継続")
      }
    } catch (error) {
      console.warn("バックグラウンドAPI分析でエラー:", error)
    }
  }

  const analyzeBasicAnswers = async (answers: Record<string, string>) => {
    try {
      setLoading(true)

      console.log("=== analyzeBasicAnswers開始 ===")
      console.log("分析対象のanswers:", answers)

      const response = await fetch("/api/analyze-basic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })

      if (!response.ok) {
        console.warn("API分析失敗 - ローカル分析を使用")
        // ✅ API失敗時のローカル分析
        const localResult = {
          type: "検討型",
          urgency: "medium" as const,
          summary: "転職を検討している状況です。",
          advice: "詳細な分析でより具体的なアドバイスを提供します。",
          needsDetailedAnalysis: true
        }

        setResult(localResult)

        const updatedSession = {
          ...session,
          basicAnswers: answers, // ✅ 明示的に保持
          simpleResult: localResult,
          currentStep: 3,
          // updatedAtはsaveSession内で自動設定
        }

        setSession(updatedSession)
        saveSession(updatedSession)
        return
      }

      const analysisResult = await response.json()
      console.log("分析結果:", analysisResult)
      setResult(analysisResult)

      // ✅ basicAnswersを確実に保持
      const updatedSession = {
        ...session,
        basicAnswers: answers, // ✅ 明示的に保持
        simpleResult: analysisResult,
        currentStep: 3,
        // updatedAtはsaveSession内で自動設定
      }

      console.log("API分析後の保存セッション:", updatedSession)
      setSession(updatedSession)
      saveSession(updatedSession)

    } catch (err) {
      console.error("analyzeBasicAnswers エラー:", err)
      setError(err instanceof Error ? err.message : "分析中にエラーが発生しました")
    } finally {
      setLoading(false)
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

  const continueToDetail = () => {
    // ✅ 詳細入力に進む前にセッションデータを確実に保存
    console.log("=== resultページ - 詳細入力遷移前 ===")
    console.log("現在のsession:", session)
    console.log("現在のresult:", result)

    // ✅ 現在の状態を確実に保存
    const updatedSession = {
      ...session,
      basicAnswers: session?.basicAnswers, // 明示的にbasicAnswersを保持
      simpleResult: result, // 分析結果を保存
      currentStep: 3,
      // updatedAtはsaveSession内で自動設定されるので削除
    }

    console.log("保存するセッション:", updatedSession)
    console.log("basicAnswers確認:", updatedSession.basicAnswers)

    // セッションを更新して保存
    setSession(updatedSession)
    saveSession(updatedSession)

    // ✅ 保存後の確認
    const savedSession = getSession()
    console.log("保存後の確認:", savedSession)
    console.log("保存後のbasicAnswers:", savedSession?.basicAnswers)

    if (result?.needsDetailedAnalysis) {
      router.push("/diagnosis/detail")
    } else {
      router.push("/diagnosis/final")
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
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin animate-reverse"></div>
                  </div>
                  
                  {/* 中央のアイコン */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* タイトル */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AI分析中
                  </span>
                </h2>
                
                {/* 動的メッセージ */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <p className="text-gray-600 text-lg transition-all duration-500">
                    {["あなたの回答を分析しています", "キャリアパターンを解析中", "最適なアドバイスを準備中", "AI分析がもうすぐ完了します"][loadingMessage]}
                  </p>
                  <p className="text-gray-500 text-sm">高精度な分析でより良い結果をお届けします</p>
                </div>

                {/* プログレスバー風装飾 */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
                </div>
                
                <p className="text-xs text-gray-400">
                  ✨ Claude 3.5 Sonnetによる高精度分析
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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => window.location.reload()} className="mt-4">
          再試行
        </Button>
      </div>
    )
  }

  // 結果が存在しない場合の表示
  if (!result) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center py-12">
          <p className="text-gray-600">結果を準備中です...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-700 rounded-full text-sm font-medium mb-4 shadow-lg">
          <span>💡</span>
          <span className="ml-2">診断結果</span>
        </div>
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          AIからのアドバイスをお伝えします
        </h1>
        <p className="text-gray-600">あなたの状況に基づいたアドバイスをご提案いたします</p>
      </div>

      {/* 診断結果カード */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{result.type}</CardTitle>
            <div className="flex items-center space-x-2">
              {getUrgencyIcon(result.urgency)}
              <span className="text-sm font-medium">{getUrgencyText(result.urgency)}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">現在の状況</h3>
              <p className="text-gray-700">{result.summary}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">基本的なアドバイス</h3>
              <p className="text-gray-700">{result.advice}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 詳細診断への誘導ボタン（上部に配置） */}
      {result.needsDetailedAnalysis ? (
        <div className="mb-6 space-y-4">
          {/* 魅力的な誘導メッセージ */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">💬</span>
              <span className="font-bold text-blue-800">チャット形式で悩み相談するために</span>
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-blue-700 text-sm mb-3">
              <strong>詳細にあなたのことを聞かせてくれませんか？</strong><br />
              AIがより具体的で実践的なアドバイスをお伝えできます
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-blue-600">
              <span>✨ 具体的な行動プラン</span>
              <span>🎯 個別最適化アドバイス</span>
              <span>💪 背中を押してくれる言葉</span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            {/* メインの詳細診断ボタン */}
            <Button 
              onClick={() => {
                trackEvent('continue_to_detail', { step: 3 })
                continueToDetail()
              }} 
              size="lg" 
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-6 px-8 text-xl shadow-2xl transform hover:scale-105 transition-all duration-200 relative overflow-hidden rounded-xl min-h-[80px]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
              <div className="relative flex items-center justify-center gap-3">
                <span className="text-2xl">💬</span>
                <span className="leading-tight">AIとチャットして<br className="sm:hidden" />より詳しくお聞きします</span>
                <ArrowRight className="w-6 h-6" />
              </div>
            </Button>
            
            {/* サブボタン：スキップオプション */}
            <Button 
              variant="outline" 
              onClick={() => {
                trackEvent('skip_to_final', { step: 3 })
                continueToDetail()
              }}
              className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              今回はスキップして最終結果を見る
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col space-y-3 mb-6">
          <Button onClick={
            () => {
              trackEvent('continue_to_final', { step: 3 })
              continueToDetail()
            }
          } size="lg">
            最終結果を見る
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* 詳細診断のメリット訴求カード（ボタンの下に配置） */}
      {result.needsDetailedAnalysis && (
        <div className="mb-6 space-y-4">
          <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50 shadow-lg">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                  <span>🚀</span>
                  <span>さらに詳しくお話をお聞きできます！</span>
                  <span>✨</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-center mb-4 text-green-800">
                AIとのチャットで、あなたの状況をより詳しくお聞かせください
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/80 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💬</span>
                    <span className="font-semibold text-green-800">AIとの対話</span>
                  </div>
                  <p className="text-sm text-gray-700">Claude 3.5 Sonnetとリアルタイムで相談できます</p>
                </div>
                
                <div className="bg-white/80 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <span className="font-semibold text-blue-800">個別アドバイス</span>
                  </div>
                  <p className="text-sm text-gray-700">あなたの状況に合わせたピンポイントな提案</p>
                </div>
                
                <div className="bg-white/80 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⏰</span>
                    <span className="font-semibold text-purple-800">たった3分</span>
                  </div>
                  <p className="text-sm text-gray-700">短時間で深い洞察が得られます</p>
                </div>
                
                <div className="bg-white/80 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🔒</span>
                    <span className="font-semibold text-orange-800">完全匿名</span>
                  </div>
                  <p className="text-sm text-gray-700">安心してお悩みをお話しください</p>
                </div>
              </div>
              
              <div className="text-center bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-yellow-800 font-medium text-sm">
                  💡 <strong>多くの方が「話すことで気持ちが整理できた」と回答しています</strong>
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* 補足説明 */}
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800">
              <strong>💡 今のままでもアドバイスはお伝えできますが</strong>、詳細相談でさらに具体的なご提案ができます。
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
