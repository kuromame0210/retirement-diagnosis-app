"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowRight, AlertTriangle, CheckCircle, Clock } from "lucide-react"
import { getSession, saveSession } from "@/lib/storage"

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
      console.log("simpleResultが存在しないため、analyzeBasicAnswersを実行")
      if (sessionData?.basicAnswers) {
        analyzeBasicAnswers(sessionData.basicAnswers)
      } else {
        console.error("❌ basicAnswersも存在しません")
        setError("基本診断データが見つかりません。最初からやり直してください。")
        setLoading(false)
      }
    }
  }, [])


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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>診断結果を分析中...</p>
            </div>
          </CardContent>
        </Card>
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
            <Button onClick={continueToDetail} size="lg">
              {result.needsDetailedAnalysis ? "詳細診断に進む" : "最終結果を見る"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {result.needsDetailedAnalysis && (
              <Button variant="outline" onClick={() => router.push("/diagnosis/final")}>
                この結果で完了する
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
