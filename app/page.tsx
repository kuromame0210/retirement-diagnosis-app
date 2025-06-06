"use client"
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Clock, Shield, Users } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { ensureUserId } from "@/lib/userId"
import { saveSession, getSession } from "@/lib/storage"

export default function HomePage() {

  useEffect(() => {
    const uidInfo = ensureUserId()
    if(uidInfo?.uid) {
      console.log(uidInfo)
      saveSession({
        ...getSession(),
          userId: uidInfo.uid,
        })
    }
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">退職診断</h1>
        <p className="text-xl text-gray-600 mb-8">あなたに最適な働き方を見つける</p>
        <p className="text-gray-500 max-w-2xl mx-auto">
          AI診断で現在の状況を整理し、最適な行動を提案します。無料で匿名利用可能。
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <Brain className="w-8 h-8 text-blue-600 mb-2" />
            <CardTitle>AI分析</CardTitle>
            <CardDescription>Claude 3.5 Sonnetによる高精度な状況分析</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Clock className="w-8 h-8 text-green-600 mb-2" />
            <CardTitle>約10分で完了</CardTitle>
            <CardDescription>簡単な質問に答えるだけで詳細な診断結果を取得</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="w-8 h-8 text-purple-600 mb-2" />
            <CardTitle>完全匿名</CardTitle>
            <CardDescription>個人情報の登録は一切不要、安心してご利用ください</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Users className="w-8 h-8 text-orange-600 mb-2" />
            <CardTitle>個別アドバイス</CardTitle>
            <CardDescription>あなたの状況に合わせたパーソナライズされた提案</CardDescription>
          </CardHeader>
        </Card>
      </div>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>診断の流れ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <span>基本診断（5問の質問）</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <span>簡易結果の確認</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <span>詳細入力（任意）</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <span>AI問答（5回の対話）</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                5
              </div>
              <span>最終診断結果</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mb-6">
        <Link href="/diagnosis/basic">
          <Button size="lg" className="text-lg" style={{ padding: "2rem" }}
          onClick={() => {
            trackEvent('start_diagnosis', { step: 1 })
          }}
          >
            診断を開始する
          </Button>
        </Link>
      </div>

    </div>
  )
}
