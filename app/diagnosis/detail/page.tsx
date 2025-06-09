"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { getSession, saveSession } from "@/lib/storage"
import { trackEvent } from "@/lib/analytics"

export default function DetailPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [textInput, setTextInput] = useState("")

  useEffect(() => {
    const sessionData = getSession()
    setSession(sessionData)
    setTextInput(sessionData.textInput || "")
  }, [])

  const handleSubmit = () => {
    const updatedSession = {
      ...session,
      textInput,
      currentStep: 4,
    }
    setSession(updatedSession)
    saveSession(updatedSession)
    router.push("/diagnosis/chat")
  }

  const skipDetail = () => {
    router.push("/diagnosis/final")
  }

  if (!session) return <div>Loading...</div>

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* 魅力的なヘッダー */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
          <span>💬</span>
          <span>AI詳細診断</span>
          <span>✨</span>
        </div>
        <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          あなたの気持ちを聞かせてください
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed">
          まずは現在の状況を簡単に入力してから、<br />
          <strong className="text-blue-600">AIとのリアルタイムチャット</strong>で深く掘り下げていきます
        </p>
      </div>

      {/* メリット紹介カード */}
      <Card className="mb-6 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-center mb-4 text-blue-800">
            🎯 このステップで得られること
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤝</span>
              <div>
                <p className="font-medium text-blue-700">個別対話</p>
                <p className="text-sm text-gray-600">あなただけの状況に合わせた質問</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium text-purple-700">新しい気づき</p>
                <p className="text-sm text-gray-600">自分では気づかなかった視点</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-medium text-green-700">具体的提案</p>
                <p className="text-sm text-gray-600">実行しやすいアクションプラン</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="font-medium text-orange-700">スピーディー</p>
                <p className="text-sm text-gray-600">3-5分で完了</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <span>📝</span>
            まずは現在の状況を簡単に教えてください
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            この後のAIチャットでより詳しくお聞きします。まずは思いつくことを自由にどうぞ✨
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">以下のような内容について、思うことを自由にお書きください：</p>
            <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
              <li>具体的な悩みや困っていること</li>
              <li>職場での出来事や人間関係</li>
              <li>将来に対する不安や希望</li>
              <li>理想の働き方や生活</li>
              <li>その他、気になることなんでも</li>
            </ul>

            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="こちらに自由にお書きください..."
              className="min-h-[200px]"
            />

            <p className="text-xs text-gray-500">
              ※ 入力いただいた内容は診断にのみ使用され、外部に共有されることはありません
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col space-y-3 mt-8">
        {/* メインボタン：AI問答 */}
        <Button 
          onClick={() => {
            trackEvent('submit_answer', { step: 3 })
            handleSubmit()
          }} 
          size="lg" 
          disabled={textInput.trim().length < 10}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold py-4 text-lg shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:transform-none"
        >
          <span className="mr-2">🚀</span>
          {textInput.trim().length < 10 ? "10文字以上入力してAIチャットを開始" : "AIとのチャットを開始する"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* プログレスヒント */}
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm font-medium">
            💬 次のステップ：AIが3〜5つの質問をして、あなたの状況を深く理解します
          </p>
        </div>

        {/* スキップボタン */}
        <Button 
          variant="outline" 
          onClick={() => {
            trackEvent('skip_detail', { step: 3 })
            skipDetail()
          }}
          className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          今回はスキップして最終結果を見る
        </Button>

        <Button variant="ghost" onClick={
          () => {
            trackEvent('back_to_detail', { step: 3 })
            router.back()
          }
        } className="self-start">
          <ArrowLeft className="w-4 h-4 mr-2" />
          前に戻る
        </Button>
      </div>
    </div>
  )
}
