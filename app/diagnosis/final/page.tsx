"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, RotateCcw } from "lucide-react"
import { getSession, clearSession } from "@/lib/storage"

interface FinalResult {
  finalType: string
  currentSituation: string
  recommendedActions: Array<{
    priority: number
    action: string
    timeline: string
  }>
  serviceRecommendations: Array<{
    category: string
    services: string[]
    reason: string
  }>
  longTermStrategy?: string
  urgencyLevel: "high" | "medium" | "low"
}

export default function FinalPage() {
  const [session, setSession] = useState<any>(null)
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionData = getSession()
    setSession(sessionData)

    if (sessionData.finalResult) {
      setFinalResult(sessionData.finalResult)
      setLoading(false)
    } else {
      generateFinalAnalysis(sessionData)
    }
  }, [])

  const generateFinalAnalysis = async (sessionData: any) => {
    try {
      setLoading(true)
      const response = await fetch("/api/final-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          basicAnswers: sessionData.basicAnswers,
          textInput: sessionData.textInput || "",
          chatHistory: sessionData.chatHistory || [],
          previousAnalysis: sessionData.simpleResult,
        }),
      })

      if (!response.ok) throw new Error("最終分析に失敗しました")

      const result = await response.json()
      setFinalResult(result)

      // セッションに保存
      const updatedSession = {
        ...sessionData,
        finalResult: result,
        completedAt: new Date().toISOString(),
      }
      setSession(updatedSession)
      // saveSession(updatedSession) // 最終結果は保存しない（プライバシー考慮）
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
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

  const downloadResult = () => {
    if (!finalResult) return

    const resultText = `
退職診断結果

診断タイプ: ${finalResult.finalType}
緊急度: ${getUrgencyText(finalResult.urgencyLevel)}

現状分析:
${finalResult.currentSituation}

推奨アクション:
${finalResult.recommendedActions
  .map((action) => `${action.priority}. ${action.action} (${action.timeline})`)
  .join("\n")}

サービス推奨:
${finalResult.serviceRecommendations
  .map((rec) => `${rec.category}: ${rec.services.join(", ")}\n理由: ${rec.reason}`)
  .join("\n\n")}

${finalResult.longTermStrategy ? `長期戦略:\n${finalResult.longTermStrategy}` : ""}

診断日時: ${new Date().toLocaleString("ja-JP")}
    `.trim()

    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `退職診断結果_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const restartDiagnosis = () => {
    clearSession()
    window.location.href = "/"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>最終診断結果を生成中...</p>
              <p className="text-sm text-gray-500 mt-2">全ての情報を統合して分析しています</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>再試行</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">最終診断結果</h1>
        <p className="text-gray-600">あなたの状況を総合的に分析した結果をお示しします</p>
      </div>

      {finalResult && (
        <div className="space-y-6">
          {/* 診断タイプと緊急度 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{finalResult.finalType}</CardTitle>
                <Badge className={getUrgencyColor(finalResult.urgencyLevel)}>
                  {getUrgencyText(finalResult.urgencyLevel)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">現状分析</h3>
              <p className="text-gray-700 leading-relaxed">{finalResult.currentSituation}</p>
            </CardContent>
          </Card>

          {/* 推奨アクション */}
          <Card>
            <CardHeader>
              <CardTitle>推奨アクション</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {finalResult.recommendedActions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Badge variant="outline" className="mt-0.5">
                      {action.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium">{action.action}</p>
                      <p className="text-sm text-gray-500">{action.timeline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* サービス推奨 */}
          <Card>
            <CardHeader>
              <CardTitle>推奨サービス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {finalResult.serviceRecommendations.map((rec, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold text-blue-700">{rec.category}</h4>
                    <p className="text-sm text-gray-600 mb-2">{rec.reason}</p>
                    <div className="flex flex-wrap gap-2">
                      {rec.services.map((service, serviceIndex) => (
                        <Badge key={serviceIndex} variant="secondary">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 長期戦略 */}
          {finalResult.longTermStrategy && (
            <Card>
              <CardHeader>
                <CardTitle>長期戦略</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{finalResult.longTermStrategy}</p>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button onClick={downloadResult} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              結果をダウンロード
            </Button>
            <Button variant="outline" onClick={restartDiagnosis} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              新しい診断を開始
            </Button>
          </div>

          {/* 免責事項 */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <p className="text-xs text-gray-600">
                ※ この診断結果は参考情報として提供されており、専門的な医療やキャリアカウンセリングの代替ではありません。
                重要な決定を行う前に、適切な専門家にご相談することをお勧めします。
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
