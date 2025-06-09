"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRight, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { getSession, saveSession } from "@/lib/storage"
import { trackEvent } from "@/lib/analytics"

interface SimpleResult {
  type: string
  urgency: "high" | "medium" | "low"
  summary: string
  advice: string
  needsDetailedAnalysis: boolean
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

    if (sessionData.simpleResult) {
      setResult(sessionData.simpleResult)
      setLoading(false)
    } else {
      console.log("simpleResultが存在しないため、即座にローカル結果を表示")
      if (sessionData?.basicAnswers) {
        // 即座にローカル結果を表示してローディングを解除
        const localResult = {
          type: "検討型",
          urgency: "medium" as const,
          summary: "基本診断が完了しました。",
          advice: "より詳細な分析を行うことで、具体的なアドバイスを提供できます。",
          needsDetailedAnalysis: true
        }
        
        setResult(localResult)
        setLoading(false)
        
        // API分析は裏側で非同期実行
        analyzeBasicAnswersInBackground(sessionData.basicAnswers)
      } else {
        console.error("❌ basicAnswersも存在しません")
        setError("基本診断データが見つかりません。最初からやり直してください。")
        setLoading(false)
      }
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

  // バックグラウンドでAPI分析を実行する関数
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
        
        // API結果で更新
        setResult(data.result)
        
        // セッションにも保存
        const updatedSession = {
          ...session,
          basicAnswers: answers,
          simpleResult: data.result,
        }
        
        saveSession(updatedSession)
        setSession(updatedSession)
        
        console.log("バックグラウンド分析完了、結果を更新しました")
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
          updatedAt: new Date().toISOString()
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
        updatedAt: new Date().toISOString()
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
      updatedAt: new Date().toISOString()
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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">簡易診断結果</h1>
        <p className="text-gray-600">基本的な分析結果をお示しします</p>
      </div>

      {result && (
        <>
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

          {result.needsDetailedAnalysis && (
            <Alert className="mb-6">
              <AlertDescription>
                より詳細な分析のため、追加の質問にお答えいただくことをお勧めします。
                より具体的で個別化されたアドバイスを提供できます。
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col space-y-3">
            <Button onClick={
              () => {
                trackEvent('continue_to_detail', { step: 3 })
                continueToDetail()
              }
            } size="lg">
              {result.needsDetailedAnalysis ? "詳細診断に進む" : "最終結果を見る"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
