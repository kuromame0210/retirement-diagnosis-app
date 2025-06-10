"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Clock, Shield, Users, CheckCircle, ArrowRight, Zap, Sparkles } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

export default function V2HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">

      {/* Hero Section */}
      <div className="container mx-auto px-2 sm:px-4 pt-12 sm:pt-20 pb-8 sm:pb-12 max-w-6xl relative z-10">
        <div className="text-center mb-8 sm:mb-16">
          <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 text-green-700 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8 shadow-lg">
            <Sparkles className="w-3 sm:w-4 h-3 sm:h-4 mr-1 sm:mr-2" />
            3分で完了
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-gray-900 mb-6 sm:mb-8 leading-tight tracking-tight px-2">
            <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              ヤメドキ
            </span>
            <span className="text-2xl sm:text-4xl md:text-5xl font-bold text-gray-800">
              AI退職診断
            </span>
          </h1>
          
          <p className="text-xs sm:text-sm md:text-base text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-4">
            10個の質問に答えるだけで、AIがあなたの状況を分析し、<br className="hidden sm:block" />
            あなたに最適な行動をご提案します。
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 justify-center items-center max-w-sm sm:max-w-lg mx-auto mb-6 sm:mb-8 px-4">
            <Link href="/v2/diagnosis" className="w-full">
              <Button 
                size="lg" 
                className="w-full text-lg sm:text-xl font-black px-12 sm:px-16 py-6 sm:py-8 h-auto bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:via-blue-700 hover:to-blue-800 text-white border-0 rounded-xl relative overflow-hidden shadow-2xl transform hover:scale-105 transition-all duration-300"
                onClick={() => {
                  console.log("V2HomePage: Start diagnosis button clicked")
                  trackEvent('start_diagnosis_v2', { step: 1, location: 'hero', version: 'v2' })
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-500"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <span className="text-2xl">🚀</span>
                  <span className="drop-shadow-lg">今すぐ無料で診断開始</span>
                  <ArrowRight className="w-5 sm:w-6 h-5 sm:h-6" />
                </div>
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12 md:mb-16 px-4">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <CardHeader className="text-center pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <Zap className="w-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 text-white" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">3分で完了</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-4 sm:p-6">
              <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
                テキスト入力なし！10個の質問にクリックするだけで完了
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
            <CardHeader className="text-center pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <Brain className="w-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 text-white" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">AI分析</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-4 sm:p-6">
              <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Claude 3.5 Sonnetがあなたの状況を詳しく分析
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 sm:col-span-2 md:col-span-1">
            <CardHeader className="text-center pb-3 sm:pb-4 p-4 sm:p-6">
              <div className="w-12 sm:w-14 md:w-16 h-12 sm:h-14 md:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
                <Users className="w-6 sm:w-7 md:w-8 h-6 sm:h-7 md:h-8 text-white" />
              </div>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900">最適な行動</CardTitle>
            </CardHeader>
            <CardContent className="text-center p-4 sm:p-6">
              <CardDescription className="text-sm sm:text-base text-gray-600 leading-relaxed">
                あなたに最適な行動とサービスを優先度順に提案
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center px-4">
          <Link href="/v2/diagnosis">
            <Button 
              size="lg"
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-lg shadow-lg transform hover:scale-105 transition-all duration-200 w-full sm:w-auto"
              onClick={() => {
                trackEvent('start_diagnosis_v2', { step: 1, location: 'bottom_cta', version: 'v2' })
              }}
            >
              <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
              3分で診断を始める
              <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}