"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ArrowRight, ArrowLeft } from "lucide-react"
import { getSession, saveSession } from "@/lib/storage"

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">詳細入力</h1>
        <p className="text-gray-600">より詳細な分析のため、現在の状況や気持ちを自由にお書きください（任意）</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>現在の状況について詳しく教えてください</CardTitle>
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
        <Button onClick={handleSubmit} size="lg" disabled={textInput.trim().length < 10}>
          AI問答に進む
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <Button variant="outline" onClick={skipDetail}>
          入力をスキップして最終結果を見る
        </Button>

        <Button variant="ghost" onClick={() => router.back()} className="self-start">
          <ArrowLeft className="w-4 h-4 mr-2" />
          前に戻る
        </Button>
      </div>
    </div>
  )
}
