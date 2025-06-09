"use client"
import Link from "next/link"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Clock, Shield, Users, CheckCircle, ArrowRight, Zap, Code2, Sparkles } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

export default function HomePage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-12 max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 text-blue-700 rounded-full text-sm font-medium mb-8 shadow-lg">
            <Brain className="w-4 h-4 mr-2" />
            AIがあなたのキャリアをサポート
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
            <span className="block mb-2">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                ヤメドキ
              </span>
            </span>
            <span className="block text-4xl md:text-5xl font-bold text-gray-800">
              AI退職診断
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-6 font-light">あなたに最適な働き方を見つける</p>
          <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed px-4">
            Claude 3.5 Sonnetを使ったAI診断で現在の状況を整理し、最適な行動を提案します。<br />
            無料・匿名で安心してご利用いただけます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto mb-8">
            <Link href="/diagnosis/basic" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                className="w-full sm:w-auto text-lg font-bold px-8 py-4 h-auto bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 rounded-lg relative overflow-hidden shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-200"
                onClick={() => {
                  console.log("HomePage: Start diagnosis button clicked (hero)")
                  trackEvent('start_diagnosis', { step: 1, location: 'hero' })
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                <div className="relative flex items-center justify-center">
                  <Brain className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">今すぐ無料で診断を始める</span>
                  <span className="sm:hidden">無料で診断開始</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>約10分で完了</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>登録不要</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 pb-16 max-w-6xl">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">選ばれる3つの理由</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl mb-2">AI分析</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                Claude 3.5 Sonnetによる<br />高精度な状況分析
              </CardDescription>
            </CardHeader>
          </Card>
          
          <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl mb-2">約10分で完了</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                簡単な質問に答えるだけで<br />詳細な診断結果を取得
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl mb-2">完全匿名</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                個人情報の登録は一切不要<br />安心してご利用ください
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl mb-2">個別アドバイス</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                あなたの状況に合わせた<br />パーソナライズされた提案
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        
        {/* Process Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">診断の流れ</h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                1
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">基本診断</h4>
              <p className="text-sm text-gray-600">5問の簡単な質問</p>
            </div>
            <div className="hidden md:block">
              <ArrowRight className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                2
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">簡易結果</h4>
              <p className="text-sm text-gray-600">初期分析結果を確認</p>
            </div>
            <div className="hidden md:block">
              <ArrowRight className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                3
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">AI対話</h4>
              <p className="text-sm text-gray-600">詳細なヒアリング</p>
            </div>
            <div className="hidden md:block">
              <ArrowRight className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">最終結果</h4>
              <p className="text-sm text-gray-600">個別アドバイスを取得</p>
            </div>
          </div>
        </div>

        
        {/* CTA Section */}
        <div className="text-center py-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">あなたのキャリアの次のステップを見つけましょう</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            プロのAIカウンセラーがあなたの状況を分析し、最適な解決策を提案します。
          </p>
          <Link href="/diagnosis/basic" className="block w-full max-w-sm mx-auto">
            <Button 
              size="lg" 
              className="w-full text-lg font-bold px-6 py-4 h-auto bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 shadow-xl hover:shadow-blue-500/25 border-0 rounded-xl relative overflow-hidden"
              onClick={() => {
                console.log("HomePage: Start diagnosis button clicked")
                trackEvent('start_diagnosis', { step: 1 })
              }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
              <div className="relative flex items-center justify-center">
                <Brain className="w-5 h-5 mr-3" />
                無料で診断を開始する
                <ArrowRight className="w-5 h-5 ml-3" />
              </div>
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Footer */}
      <div className="bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center">
          <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700 hover:underline">
            プライバシーポリシー
          </Link>
        </div>
      </div>

    </div>
    
  )
}
