/**
 * V3診断結果ページ - 段階的診断対応（Haiku即時 → Sonnet詳細）
 */

"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import StagedDiagnosisResult from "@/components/v3/StagedDiagnosisResult"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Sparkles } from "lucide-react"

function V3ResultPageContent() {
  const searchParams = useSearchParams()
  const type = searchParams?.get('type') || 'final'
  
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              V3 AI診断結果
            </h1>
            <p className="text-gray-600">段階的分析でより深い洞察をお届け</p>
          </div>
          <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
        </div>
      </div>
      
      <StagedDiagnosisResult 
        sessionId="current-session"
        onQuickResult={(result) => {
          console.log('Quick diagnosis completed:', result)
        }}
        onDetailedResult={(result) => {
          console.log('Detailed diagnosis completed:', result)
        }}
      />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-7 h-7 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              診断結果を準備中...
            </h1>
            <p className="text-gray-600">AIが分析を実行しています</p>
          </div>
        </div>
      </div>
      
      <Card className="border-2 border-green-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl text-green-800 flex items-center justify-center gap-2">
            <Brain className="w-6 h-6 animate-pulse" />
            診断システム起動中...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full animate-pulse" style={{width: '70%'}}></div>
            </div>
            <p className="text-center text-sm text-gray-600">初期化中...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function V3ResultPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <V3ResultPageContent />
    </Suspense>
  )
}