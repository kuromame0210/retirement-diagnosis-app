"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, RotateCcw, Heart, Sparkles } from "lucide-react"
import { getSession, clearSession, getJSTTimestamp } from "@/lib/storage"
import ServiceRecommendations from "@/components/ServiceRecommendations"
import { recommendServices } from "@/lib/serviceRecommendation"

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
  encouragingMessage?: string
}

export default function FinalPage() {
  const [session, setSession] = useState<any>(null)
  const [finalResult, setFinalResult] = useState<FinalResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const sessionData = getSession()
    setSession(sessionData)

    // Facebook Pixel conversion tracking for final page
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }

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

      if (!response.ok) {
        console.warn("API分析失敗 - ローカル分析を使用")
        // ✅ API失敗時のローカル分析
        const localResult = {
          finalType: "お悩み解決型",
          currentSituation: "お疲れさまでした〜！いろいろな質問にお答えいただき、ありがとうございます。あなたの転職に関するお気持ちがよく伝わってきました。今の状況を整理して、一歩ずつ前に進んでいきましょうね。",
          recommendedActions: [
            {
              priority: 1,
              action: "まずは今の気持ちを整理してみましょう〜",
              timeline: "今すぐ〜1週間"
            },
            {
              priority: 2,
              action: "信頼できる人に相談してみるのもいいですね",
              timeline: "1〜2週間"
            }
          ],
          serviceRecommendations: [],
          urgencyLevel: sessionData.simpleResult?.urgency || "medium",
          encouragingMessage: "大丈夫です！あなたのペースで進んでいけば、きっと良い道が見つかりますよ〜"
        }
        setFinalResult(localResult)
        setSession({ ...sessionData, finalResult: localResult })
        return
      }

      const result = await response.json()
      setFinalResult(result)

      // セッションに保存
      const updatedSession = {
        ...sessionData,
        finalResult: result,
        completedAt: getJSTTimestamp(),
      }
      setSession(updatedSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析中にちょっとエラーが起きちゃいました💦 でも大丈夫ですよ〜")
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
        return "今すぐアクション！"
      case "medium":
        return "じっくり検討しよう"
      case "low":
        return "余裕を持って進めよう"
      default:
        return ""
    }
  }

  const downloadResult = () => {
    if (!finalResult) return

    const resultText = `
転職診断結果 〜あなたの未来への第一歩〜

診断タイプ: ${finalResult.finalType}
緊急度: ${getUrgencyText(finalResult.urgencyLevel)}

現状分析:
${finalResult.currentSituation}

推奨アクション:
${finalResult.recommendedActions
  .map((action) => `${action.priority}. ${action.action} (${action.timeline})`)
  .join("\n")}

${finalResult.longTermStrategy ? `長期戦略:\n${finalResult.longTermStrategy}` : ""}

${finalResult.encouragingMessage ? `応援メッセージ:\n${finalResult.encouragingMessage}` : ""}

診断日時: ${new Date().toLocaleString("ja-JP")}

※ あなたのペースで進んでいけば大丈夫です！応援しています〜
    `.trim()

    const blob = new Blob([resultText], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `転職診断結果_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const restartDiagnosis = () => {
    clearSession()
    window.location.href = "/"
  }

  // ✅ サービス推奨の生成
  const getRecommendedServices = () => {
    if (!finalResult || !session?.basicAnswers) return []
    
    return recommendServices(
      {
        finalType: finalResult.finalType,
        urgencyLevel: finalResult.urgencyLevel,
        currentSituation: finalResult.currentSituation
      },
      session.basicAnswers,
      session.textInput  // 自由記述も追加
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">最終診断結果を生成中... ✨</p>
              <p className="text-sm text-gray-500 mt-2">全ての情報を統合して、あなたにぴったりの分析をお作りしてます〜</p>
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
            <Button onClick={() => window.location.reload()}>もう一度やってみる 🔄</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const recommendedServices = getRecommendedServices()

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Heart className="w-8 h-8 text-pink-500" />
          最終診断結果が完成しました〜！
          <Heart className="w-8 h-8 text-pink-500" />
        </h1>
        <p className="text-gray-600">あなたの状況を総合的に分析した結果をお届けします✨</p>
      </div>

      {finalResult && (
        <div className="space-y-8">
          {/* 診断タイプと緊急度 */}
          <Card className="border-2 border-blue-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-blue-800">{finalResult.finalType}</CardTitle>
                <Badge className={`${getUrgencyColor(finalResult.urgencyLevel)} font-semibold`}>
                  {getUrgencyText(finalResult.urgencyLevel)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-3 text-blue-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                あなたの現在の状況
              </h3>
              <p className="text-gray-700 leading-relaxed bg-blue-50 p-4 rounded-lg">{finalResult.currentSituation}</p>
            </CardContent>
          </Card>

          {/* 推奨アクション */}
          <Card className="shadow-lg">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-800 flex items-center gap-2">
                <span>🎯</span>
                おすすめのアクション
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {finalResult.recommendedActions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-3 bg-green-50 p-4 rounded-lg">
                    <Badge variant="outline" className="mt-0.5 bg-green-100 text-green-800 border-green-300">
                      {action.priority}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-green-800">{action.action}</p>
                      <p className="text-sm text-green-600 mt-1">⏰ {action.timeline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* サービス推奨セクション */}
          {recommendedServices.length > 0 && (
            <div className="relative">
              {/* 背景装飾 */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-50 via-pink-50 to-yellow-50 rounded-xl opacity-80"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-xl"></div>
              
              {/* メインコンテンツ */}
              <div className="relative bg-white/90 backdrop-blur-sm p-8 rounded-xl border-2 border-gradient-to-r from-purple-200 to-pink-200 shadow-lg">
                {/* 特別なヘッダー */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
                    <span>✨</span>
                    <span>あなただけの特別な提案</span>
                    <span>✨</span>
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    おすすめサービスランキング
                  </h2>
                  <p className="text-gray-600 mt-2">診断結果と回答内容から厳選しました</p>
                </div>
                
                <ServiceRecommendations services={recommendedServices} />
                
                {/* 行動促進メッセージ */}
                <div className="text-center mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <p className="text-blue-800 font-medium">
                    🎯 <strong>今がチャンス！</strong>気になるサービスがあれば、まずは詳細をチェックしてみましょう
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    小さな一歩が、大きな変化の始まりです✨
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 長期戦略 */}
          {finalResult.longTermStrategy && (
            <Card className="shadow-lg">
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-purple-800 flex items-center gap-2">
                  <span>🚀</span>
                  長期的な戦略
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-gray-700 leading-relaxed bg-purple-50 p-4 rounded-lg">{finalResult.longTermStrategy}</p>
              </CardContent>
            </Card>
          )}

          {/* 励ましメッセージ */}
          {finalResult.encouragingMessage && (
            <Card className="border-2 border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50">
              <CardContent className="pt-6 text-center">
                <h3 className="font-semibold mb-3 text-pink-800 flex items-center justify-center gap-2">
                  <Heart className="w-5 h-5" />
                  応援メッセージ
                  <Heart className="w-5 h-5" />
                </h3>
                <p className="text-pink-700 leading-relaxed text-lg font-medium">{finalResult.encouragingMessage}</p>
              </CardContent>
            </Card>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button 
              onClick={downloadResult} 
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              <Download className="w-4 h-4 mr-2" />
              結果をダウンロード 📄
            </Button>
            <Button 
              variant="outline" 
              onClick={restartDiagnosis} 
              className="flex-1 border-2 border-gray-300 hover:bg-gray-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              新しい診断を開始 🔄
            </Button>
          </div>

          {/* 免責事項 */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                ※ この診断結果は参考情報として提供されており、専門的な医療やキャリアカウンセリングの代替ではありません💡
                重要な決定を行う前に、適切な専門家にご相談することをお勧めします。
                あなたの人生はあなたが決めるもの〜応援しています！✨
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
