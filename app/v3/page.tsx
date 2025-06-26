/**
 * V3診断システム - メインページ
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MessageSquareText, Brain, TrendingUp, Users, CheckCircle, ArrowRight, FileText, Clock, Target } from "lucide-react"
import { getV3Session, getV3ProgressInfo, clearV3Session } from "@/lib/v3/session"
import { trackEvent } from "@/lib/analytics"

export default function V3MainPage() {
  const [progressInfo, setProgressInfo] = useState<any>({
    currentStep: 1,
    completedQuestions: 0,
    totalQuestions: 10,
    progressPercentage: 0,
    isCompleted: false,
    canDiagnose: false,
    hasPartialDiagnosis: false,
    hasFinalResult: false
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // セッション情報を取得（クライアントサイドでのみ実行）
    const loadProgressInfo = () => {
      try {
        const info = getV3ProgressInfo()
        setProgressInfo(info)
      } catch (error) {
        console.error('V3セッション情報取得エラー:', error)
        // エラーが発生した場合はデフォルトの進行情報を設定
        setProgressInfo({
          currentStep: 1,
          completedQuestions: 0,
          totalQuestions: 10,
          progressPercentage: 0,
          isCompleted: false,
          canDiagnose: false,
          hasPartialDiagnosis: false,
          hasFinalResult: false
        })
      } finally {
        setIsLoading(false)
      }
    }

    // ページ読み込み完了後に即座に実行
    if (typeof window !== 'undefined') {
      loadProgressInfo()
    }
  }, [])

  const handleStartDiagnosis = () => {
    if (typeof window !== 'undefined') {
      trackEvent('診断開始_V3', { version: 'v3', location: 'main_page' })
    }
    // 診断開始
  }

  const handleContinueDiagnosis = () => {
    if (typeof window !== 'undefined') {
      trackEvent('診断再開_V3', { 
        version: 'v3', 
        current_step: progressInfo?.currentStep,
        completed_questions: progressInfo?.completedQuestions
      })
    }
    // 診断再開
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  const hasInProgress = progressInfo && progressInfo.completedQuestions > 0 && !progressInfo.isCompleted

  return (
    <div className="space-y-8">
      {/* ヒーローセクション */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 text-green-700 rounded-full text-sm font-medium shadow-lg">
          <MessageSquareText className="w-4 h-4 mr-2" />
          10問、３分。次のキャリアを無料で診断
        </div>
        
        <h1 className="text-3xl md:text-5xl font-black text-gray-900 leading-tight">
          
          <span className="block text-3xl md:text-4xl font-bold text-gray-800">
            Claude AIでキャリア診断
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-700 mb-4 font-semibold">
          選択肢回答では計りきれないあなたの状況を解析
        </p>
        
        <p className="text-sm md:text-base text-gray-600 max-w-3xl mx-auto leading-relaxed">
          最新AI「<strong className="text-blue-600">Claude 3.5 Sonnet</strong>」が、言葉のニュアンスまで拾ってくれるので、
          あなたの状況、迷っていることへのアドバイスをくれます。<br />
          <strong className="text-gray-800">テキストで深掘り、適切な結果を提供</strong>。
        </p>
        
        {/* 進行中の診断がある場合 */}
        {hasInProgress && (
          <div className="space-y-4">
            {/* 現在の精度で診断するボタン - ファーストビューに表示 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-xl p-6 max-w-2xl mx-auto shadow-lg">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  🎯 {progressInfo.completedQuestions}問回答済み！今すぐ診断可能
                </h3>
                <p className="text-green-700 text-sm">
                  現在の回答で診断結果を確認できます
                </p>
              </div>
              <Link href="/v3/diagnosis">
                <Button 
                  size="lg"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      trackEvent('V3途中診断実行', { 
                        version: 'v3', 
                        completed_questions: progressInfo.completedQuestions,
                        location: 'main_page_top'
                      })
                    }
                  }}
                  className="w-full text-lg font-bold px-8 py-4 h-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 rounded-xl relative overflow-hidden shadow-xl hover:shadow-green-500/50 transform hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                  <div className="relative flex items-center justify-center">
                    <Brain className="w-6 h-6 mr-3" />
                    <span>現在の精度で診断する ({progressInfo.completedQuestions}問)</span>
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </div>
                </Button>
              </Link>
            </div>

            {/* 継続・リセットオプション */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="text-center mb-3">
                <h4 className="text-base font-semibold text-yellow-800 mb-1">より詳しい診断をお求めの場合</h4>
                <Progress value={progressInfo.progressPercentage} className="mb-3" />
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/v3/diagnosis">
                  <Button 
                    onClick={handleContinueDiagnosis}
                    className="bg-yellow-600 hover:bg-yellow-700 text-sm px-4 py-2"
                  >
                    続きから回答する
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('進行中の診断データをリセットして、新しく始めますか？')) {
                      clearV3Session()
                      window.location.reload()
                    }
                  }}
                  className="text-sm px-4 py-2"
                >
                  最初から始める
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 診断開始ボタン */}
        {!hasInProgress && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
            <Link href="/v3/diagnosis" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                onClick={handleStartDiagnosis}
                className="w-full sm:w-auto text-lg font-bold px-8 py-4 h-auto bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 hover:from-green-600 hover:via-blue-600 hover:to-purple-600 text-white border-0 rounded-lg relative overflow-hidden shadow-2xl hover:shadow-green-500/50 transform hover:scale-105 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full hover:translate-x-full transition-transform duration-700"></div>
                <div className="relative flex items-center justify-center">
                  <FileText className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">無料で診断スタート</span>
                  <span className="sm:hidden">診断スタート</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </div>
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* サービス特徴の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-4xl mx-auto mt-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <Brain className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">最低2問の回答で結果作成はできます、でも...</h3>
              <p className="text-sm text-blue-800 leading-relaxed">
                より多くの質問にお答えいただくほど、あなたの状況をより深く理解し、<span className="font-semibold">精度の高いアドバイス</span>をお届けできます。<br />
                <span className="text-blue-600">できれば多くの質問にお答えください。</span>
              </p>
            </div>
          </div>
        </div>


      {/* 選ばれる理由 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquareText className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-xl mb-2">テキストで深掘り</CardTitle>
            <CardDescription className="text-gray-600 leading-relaxed">
              あなたの状況、悩み、迷いを<br />文章で詳しく教えてください。
            </CardDescription>
          </CardHeader>
        </Card>
        
        <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl mb-2">Claudeが解析</CardTitle>
            <CardDescription className="text-gray-600 leading-relaxed">
              AIがあなたの悩みを深く理解し、<br />どうすればいいか適切にアドバイス。
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <CardTitle className="text-xl mb-2">レポート即日</CardTitle>
            <CardDescription className="text-gray-600 leading-relaxed">
              グラフ、適職ランキング、行動プラン。<br />今日すぐ活用。
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center hover:shadow-lg transition-shadow duration-200 border-0 shadow-md">
          <CardHeader className="pb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="w-8 h-8 text-orange-600" />
            </div>
            <CardTitle className="text-xl mb-2">あなた色の診断</CardTitle>
            <CardDescription className="text-gray-600 leading-relaxed">
              他の誰とも違う、完全オリジナル。<br />パーソナルレポート生成。
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* ご利用の流れ */}
      <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
        <h3 className="text-2xl font-bold text-center text-gray-900 mb-8">ご利用の流れ</h3>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
              1
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">スタートボタンを押す</h4>
            <p className="text-sm text-gray-600">好きな数だけ文章で回答</p>
            <p className="text-xs text-green-600 mt-1">1問からでも診断開始</p>
          </div>
          <div className="hidden md:block">
            <ArrowRight className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
              2
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">その場でAIが診断を生成</h4>
            <p className="text-sm text-gray-600">答えるほど精度がアップ</p>
            <p className="text-xs text-blue-600 mt-1">続きから再開もOK</p>
          </div>
          <div className="hidden md:block">
            <ArrowRight className="w-6 h-6 text-gray-300" />
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-3">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">実践的アドバイスを即受け取り</h4>
            <p className="text-sm text-gray-600">読んだその日から行動に移せる</p>
            <p className="text-xs text-purple-600 mt-1">最大95%精度</p>
          </div>
        </div>
      </div>

      {/* 精度比較表 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8">
        <h3 className="text-xl font-bold text-center text-gray-900 mb-6">答える数だけ、未来がクリアに</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600 mb-1">2-3問</div>
            <div className="text-sm text-gray-600 mb-2">診断スタート</div>
            <div className="text-xs text-red-600">基本的なヒント</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold text-yellow-600 mb-1">4-6問</div>
            <div className="text-sm text-gray-600 mb-2">状況把握</div>
            <div className="text-xs text-yellow-600">より具体的なアドバイス</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600 mb-1">7-9問</div>
            <div className="text-sm text-gray-600 mb-2">深い理解</div>
            <div className="text-xs text-blue-600">精度の高い解析</div>
          </div>
          <div className="text-center p-4 bg-white rounded-lg shadow border-2 border-green-500">
            <div className="text-2xl font-bold text-green-600 mb-1">10問</div>
            <div className="text-sm text-gray-600 mb-2">完全解析</div>
            <div className="text-xs text-green-600">最適なアドバイス</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      {!hasInProgress && (
        <div className="text-center py-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            モヤモヤ、言語化。未来、動き出す。
          </h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            転職活動がもっと戦略的に、もっと前向きに。<br />
            キーボードを叩くだけ。キャリアの羅針盤、完成。
          </p>
          <Link href="/v3/diagnosis">
            <Button 
              size="lg" 
              onClick={handleStartDiagnosis}
              className="text-lg font-bold px-8 py-4 h-auto bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 shadow-xl hover:shadow-green-500/25 border-0 rounded-xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-200"></div>
              <div className="relative flex items-center justify-center">
                <MessageSquareText className="w-5 h-5 mr-3" />
                今すぐ１問スタート
                <ArrowRight className="w-5 h-5 ml-3" />
              </div>
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}