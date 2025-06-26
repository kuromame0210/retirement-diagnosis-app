/**
 * V3診断結果ページ - 途中診断・最終診断対応
 */

"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Brain,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  RefreshCw,
  FileText,
  Lightbulb,
  AlertTriangle,
  Star,
  ExternalLink,
  MessageSquareText,
  ChevronDown,
  ChevronUp
} from "lucide-react"

import { 
  getV3Session, 
  addV3ClickedService,
  setV3FinalResult,
  syncV3SessionToServer 
} from "@/lib/v3/session"
import { trackEvent } from "@/lib/analytics"
import { v3ServiceEngine, v3ServiceTracker } from "@/lib/v3/serviceRecommendation"

// サービスカードコンポーネント（V3コンパクト版）
function ServiceCard({ recommendation, onServiceClick, isUrgent = false }: {
  recommendation: any
  onServiceClick: (service: any, recommendation: any) => void
  isUrgent?: boolean
}) {
  const [imageLoadState, setImageLoadState] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const rank = recommendation.rank || 1

  // V2スタイルのランキング装飾を取得
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          cardClass: "relative hover:shadow-2xl transition-all duration-300 border-2 border-yellow-400 rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg transform hover:-translate-y-2",
          rankBadge: "w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-lg border-3 border-white",
          icon: "🏆",
          text: "1位",
          titleClass: "text-3xl sm:text-4xl font-black text-black hover:text-gray-900 drop-shadow-xl",
          titleShadow: '1px 1px 0px #fbbf24, -1px -1px 0px #fbbf24, 1px -1px 0px #fbbf24, -1px 1px 0px #fbbf24, 2px 2px 0px #f59e0b, 0px 0px 8px #fbbf24',
          buttonClass: "bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500 hover:from-yellow-500 hover:via-yellow-600 hover:to-orange-600 text-black font-black text-lg py-6 px-6 shadow-xl hover:shadow-2xl animate-pulse hover:animate-none"
        }
      case 2:
        return {
          cardClass: "relative hover:shadow-xl transition-all duration-300 border-2 border-gray-400 rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 shadow-md transform hover:-translate-y-1",
          rankBadge: "w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg border-3 border-white",
          icon: "🥈",
          text: "2位",
          titleClass: "text-2xl sm:text-3xl font-bold text-black hover:text-gray-900 drop-shadow-lg",
          titleShadow: '1px 1px 0px #e5e7eb, -1px -1px 0px #e5e7eb, 1px -1px 0px #e5e7eb, -1px 1px 0px #e5e7eb, 2px 2px 0px #6b7280, 0px 0px 8px #9ca3af',
          buttonClass: "bg-gradient-to-r from-gray-400 via-gray-500 to-gray-600 hover:from-gray-500 hover:via-gray-600 hover:to-gray-700 text-white font-bold py-5 px-4 shadow-lg hover:shadow-xl animate-pulse hover:animate-none"
        }
      case 3:
        return {
          cardClass: "relative hover:shadow-xl transition-all duration-300 border-2 border-orange-400 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 shadow-md transform hover:-translate-y-1",
          rankBadge: "w-10 sm:w-12 h-10 sm:h-12 bg-gradient-to-br from-orange-400 via-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg border-3 border-white",
          icon: "🥉",
          text: "3位",
          titleClass: "text-xl sm:text-2xl font-bold text-black hover:text-gray-900 drop-shadow-md",
          titleShadow: '1px 1px 0px #fed7aa, -1px -1px 0px #fed7aa, 1px -1px 0px #fed7aa, -1px 1px 0px #fed7aa, 2px 2px 0px #ea580c, 0px 0px 8px #f97316',
          buttonClass: "bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 hover:from-orange-500 hover:via-orange-600 hover:to-orange-700 text-white font-bold py-5 px-4 shadow-lg hover:shadow-xl animate-pulse hover:animate-none"
        }
      default:
        return {
          cardClass: "relative hover:shadow-lg transition-all duration-300 border border-blue-200 rounded-lg bg-white transform hover:-translate-y-1",
          rankBadge: "w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md border-2 border-white",
          icon: "⭐",
          text: `${rank}位`,
          titleClass: "text-lg sm:text-xl font-bold text-gray-800 hover:text-blue-600",
          titleShadow: undefined,
          buttonClass: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-5 px-4 shadow-md hover:shadow-xl"
        }
    }
  }

  const rankStyle = getRankStyle(rank)

  return (
    <Card className={rankStyle.cardClass}>
      {/* ランキングバッジ（簡素化） */}
      <div className="absolute -top-1 -left-1 z-20">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ${
          rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
          rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
          rank === 3 ? 'bg-gradient-to-br from-orange-400 to-yellow-500' :
          'bg-gradient-to-br from-blue-500 to-purple-500'
        }`}>
          {rank}
        </div>
      </div>

      <CardContent className="p-3">
        <div className="space-y-3">
          {/* コンパクトヘッダー（モバイル最適化） */}
          <div className="flex items-start gap-3 ml-2">
            {/* サービス画像（左寄せ） */}
            {recommendation.service.image && (
              <div className="relative w-10 h-10 flex-shrink-0 mt-0.5">
                <img 
                  src={recommendation.service.image} 
                  alt={recommendation.service.name}
                  className="w-10 h-10 rounded-md object-cover shadow-sm"
                  onLoad={() => setImageLoadState(true)}
                />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <h3 
                className="text-sm sm:text-base font-bold text-gray-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors line-clamp-2"
                onClick={() => onServiceClick(recommendation.service, recommendation)}
              >
                {recommendation.service.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  {Math.round(recommendation.score * 10) / 10}点
                </Badge>
                {recommendation.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                    緊急
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* 簡潔な説明 */}
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-1 ml-2 px-1">
            {recommendation.service.description}
          </p>

          {/* 詳細展開エリア */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger className="flex items-center justify-center w-full py-1.5 text-xs text-blue-600 hover:text-blue-800 transition-colors hover:bg-blue-50 rounded-md">
              {isExpanded ? (
                <>詳細を閉じる <ChevronUp className="w-3 h-3 ml-1" /></>
              ) : (
                <>詳細を見る <ChevronDown className="w-3 h-3 ml-1" /></>
              )}
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-2 mt-2 border-t pt-2">
              {/* AI推薦理由（コンパクト） */}
              <div className="bg-blue-50 rounded-md p-2">
                <h5 className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  推薦理由
                </h5>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {recommendation.aiReason}
                </p>
              </div>

              {/* 期待される効果（コンパクト） */}
              <div className="bg-green-50 rounded-md p-2">
                <h5 className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  期待効果
                </h5>
                <p className="text-xs text-green-700">
                  {recommendation.expectedOutcome}
                </p>
              </div>

              {/* マッチ要因（最大2個まで） */}
              {recommendation.matchFactors?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {recommendation.matchFactors.slice(0, 2).map((factor: string, index: number) => (
                    <Badge 
                      key={index} 
                      variant="secondary" 
                      className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600"
                    >
                      {factor}
                    </Badge>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* アクションボタン（簡素化） */}
          <Button
            onClick={() => onServiceClick(recommendation.service, recommendation)}
            className={`w-full h-8 text-xs font-medium transition-all duration-200 ${
              rank === 1 
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white' 
                : rank === 2
                ? 'bg-gray-500 hover:bg-gray-600 text-white'
                : rank === 3
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            詳細をチェック <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function V3ResultPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const diagnosisType = searchParams.get('type') || 'partial' // 'partial' or 'final'
  
  const [session, setSession] = useState<any>(null)
  const [diagnosisResult, setDiagnosisResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExecutingFinalDiagnosis, setIsExecutingFinalDiagnosis] = useState(false)
  const [serviceRecommendations, setServiceRecommendations] = useState<any[]>([])
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  useEffect(() => {
    initializePage()
  }, [diagnosisType])

  const initializePage = async () => {
    setIsLoading(true)
    
    try {
      const currentSession = getV3Session()
      setSession(currentSession)

      if (diagnosisType === 'final') {
        // 最終診断を実行
        await executeFinalDiagnosis(currentSession)
      } else {
        // 途中診断結果を表示
        if (currentSession.partialDiagnosisHistory?.length > 0) {
          const latestPartial = currentSession.partialDiagnosisHistory[currentSession.partialDiagnosisHistory.length - 1]
          setDiagnosisResult(latestPartial)
          
          // サービス推薦を生成
          await generateServiceRecommendations(currentSession)
        }
      }
    } catch (error) {
      console.error('結果ページ初期化エラー:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeFinalDiagnosis = async (currentSession: any) => {
    setIsExecutingFinalDiagnosis(true)
    
    try {
      trackEvent('V3最終診断実行', {
        version: 'v3',
        answered_questions: currentSession.completedQuestions,
        total_questions: currentSession.totalQuestions
      })

      const response = await fetch('/api/v3/final-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textAnswers: currentSession.textAnswers,
          partialDiagnosisHistory: currentSession.partialDiagnosisHistory
        })
      })

      if (!response.ok) throw new Error('最終診断API エラー')

      const { result } = await response.json()
      
      // 最終診断結果を保存
      setV3FinalResult(result)
      setDiagnosisResult(result)

      // サーバーに同期
      await syncV3SessionToServer()
      
      // サービス推薦を生成
      await generateServiceRecommendations(getV3Session())

    } catch (error) {
      console.error('最終診断エラー:', error)
      // フォールバック結果を表示
      setDiagnosisResult({
        resultType: '診断エラー',
        summary: '申し訳ございません。診断中にエラーが発生しました。',
        actionPlan: ['時間をおいて再度お試しください']
      })
    } finally {
      setIsExecutingFinalDiagnosis(false)
    }
  }

  const generateServiceRecommendations = async (sessionData: any) => {
    setIsLoadingServices(true)
    try {
      console.log('🔍 [Result Page] サービス推薦生成開始:', {
        sessionId: sessionData.sessionId,
        answersCount: Object.keys(sessionData.textAnswers || {}).length,
        hasPartialResults: !!sessionData.partialResults?.length,
        hasFinalResult: !!sessionData.finalResult
      })
      
      const recommendations = await v3ServiceEngine.generateRecommendations(sessionData)
      
      console.log('📊 [Result Page] 推薦エンジン結果:', {
        recommendationsCount: recommendations.length,
        recommendations: recommendations.map(r => ({ name: r.service.name, score: r.score, priority: r.priority })),
        urgentCount: recommendations.filter(r => r.priority === 'urgent').length,
        recommendedCount: recommendations.filter(r => r.priority === 'recommended').length,
        considerCount: recommendations.filter(r => r.priority === 'consider').length
      })
      
      // エンジン側で最低3つは保証されているはずだが、UI側でも確認
      if (recommendations.length === 0) {
        console.error('❌ [Result Page] 推薦エンジンから0件の結果。緊急フォールバック実行')
        // 緊急時のフォールバック（services.tsから直接選択）
        const { services } = await import('@/lib/services')
        const emergencyRecommendations = services.slice(0, 3).map((service, index) => ({
          service,
          rank: index + 1,
          score: 1.0,
          aiReason: `${service.description} 診断結果に基づいた推薦です。`,
          priority: 'consider' as const,
          timing: '3-6months' as const,
          expectedOutcome: '現状の改善',
          matchFactors: ['緊急フォールバック']
        }))
        setServiceRecommendations(emergencyRecommendations)
        console.log('🚨 [Result Page] 緊急フォールバック完了:', emergencyRecommendations.length)
      } else {
        setServiceRecommendations(recommendations)
        console.log('✅ [Result Page] サービス推薦設定完了:', recommendations.length)
        console.log('🔍 [Result Page] React state更新:', {
          stateLength: recommendations.length,
          priorityBreakdown: {
            urgent: recommendations.filter(r => r.priority === 'urgent').length,
            recommended: recommendations.filter(r => r.priority === 'recommended').length,
            consider: recommendations.filter(r => r.priority === 'consider').length
          }
        })
      }
      
    } catch (error) {
      console.error('❌ [Result Page] サービス推薦生成エラー:', error)
      console.error('エラー詳細:', error.stack)
      
      // 最終フォールバック
      try {
        const { services } = await import('@/lib/services')
        const fallbackRecommendations = services.slice(0, 5).map((service, index) => ({
          service,
          rank: index + 1,
          score: 1.0,
          aiReason: `${service.description} エラーが発生しましたが、このサービスをご検討ください。`,
          priority: 'consider' as const,
          timing: '1-3months' as const,
          expectedOutcome: '現状の改善',
          matchFactors: ['エラーフォールバック']
        }))
        setServiceRecommendations(fallbackRecommendations)
        console.log('🔧 [Result Page] エラーフォールバック完了:', fallbackRecommendations.length)
      } catch (fallbackError) {
        console.error('💥 [Result Page] 最終フォールバックも失敗:', fallbackError)
        setServiceRecommendations([])
      }
    } finally {
      setIsLoadingServices(false)
    }
  }

  const handleServiceClick = async (service: any, recommendation?: any) => {
    try {
      if (recommendation) {
        // V3推薦エンジンからのサービス
        await v3ServiceTracker.trackServiceClick(recommendation, 'card_click')
      } else {
        // 従来のサービス（後方互換）
        const diagnosisStage = diagnosisType === 'final' ? 'final' : `partial_${session?.completedQuestions}`
        
        addV3ClickedService(
          service.id,
          service.name,
          service.url || '#',
          diagnosisStage,
          diagnosisResult?.resultType
        )

        trackEvent('V3サービスクリック', {
          version: 'v3',
          service_id: service.id,
          service_name: service.name,
          diagnosis_stage: diagnosisStage,
          result_type: diagnosisResult?.resultType
        })
      }

      if (service.url && service.url !== '#') {
        window.open(service.url, '_blank')
      }
    } catch (error) {
      console.error('サービスクリック処理エラー:', error)
    }
  }

  const handleContinueDiagnosis = () => {
    trackEvent('V3診断継続', {
      version: 'v3',
      from_stage: diagnosisType,
      current_questions: session?.completedQuestions
    })
    router.push('/v3/diagnosis')
  }

  const handleRetryDiagnosis = () => {
    setIsLoading(true)
    setTimeout(() => {
      initializePage()
    }, 1000)
  }

  if (isLoading || isExecutingFinalDiagnosis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-2xl border-0 overflow-hidden">
            <div className="py-16 px-8">
              <div className="text-center">
                {/* V3専用メインアニメーション */}
                <div className="relative mb-8">
                  {/* 外側の回転リング */}
                  <div className="w-28 h-28 mx-auto relative">
                    <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-green-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" style={{animationDirection: 'reverse'}}></div>
                    <div className="absolute inset-4 border-4 border-transparent border-t-purple-500 rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
                  </div>
                  
                  {/* 中央のV3アイコン */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                      <span className="text-white font-bold text-lg">V3</span>
                    </div>
                  </div>
                </div>

                {/* タイトル */}
                <div className="mb-6">
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 text-green-700 rounded-full text-sm font-medium mb-4 shadow-lg">
                    <span className="text-2xl mr-2">🧠</span>
                    Claude 3.5 Sonnet AI分析
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {isExecutingFinalDiagnosis ? 'テキスト深層分析中' : 'V3診断結果準備中'}
                    </span>
                  </h2>
                  <p className="text-lg text-gray-700 font-medium">
                    {isExecutingFinalDiagnosis ? 
                      'あなたの言葉のニュアンスまで解析しています' : 
                      '診断結果を最適化しています'
                    }
                  </p>
                </div>
                
                {/* 動的メッセージ & プロセス表示 */}
                <div className="space-y-6 mb-8">
                  {/* 動的ドット */}
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  
                  {/* プロセス表示 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        テキスト感情分析
                      </span>
                      <span className="text-green-600 font-medium">完了 ✓</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                        キャリア意図解析
                      </span>
                      <span className="text-blue-600 font-medium">実行中...</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                        最適サービス選定
                      </span>
                      <span className="text-gray-400">待機中</span>
                    </div>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-6 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 animate-pulse" style={{width: isExecutingFinalDiagnosis ? '85%' : '65%'}}></div>
                </div>
                
                {/* V3特徴説明 */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-200">
                  <p className="text-sm text-green-800 font-medium mb-2">✨ V3システムの特徴</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                      テキスト深層解析
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                      AI個別推薦
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                      段階的精度向上
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                      リアルタイム分析
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!diagnosisResult) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">診断結果が見つかりません</h2>
        <p className="text-gray-600 mb-6">診断を実行してから結果をご確認ください</p>
        <Button onClick={() => router.push('/v3/diagnosis')}>
          診断を開始する
        </Button>
      </div>
    )
  }

  const isFinalDiagnosis = diagnosisType === 'final'
  const canContinue = session && session.completedQuestions < session.totalQuestions

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 結果ヘッダー */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Badge 
            variant="outline" 
            className={`px-4 py-2 text-sm font-medium ${
              isFinalDiagnosis 
                ? 'bg-green-100 text-green-800 border-green-300' 
                : 'bg-blue-100 text-blue-800 border-blue-300'
            }`}
          >
            {isFinalDiagnosis ? (
              <><CheckCircle className="w-4 h-4 mr-1" /> 最終診断結果</>
            ) : (
              <><Clock className="w-4 h-4 mr-1" /> 途中診断結果 ({session?.completedQuestions}問回答)</>
            )}
          </Badge>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          {diagnosisResult.resultType}
        </h1>
      </div>

      {/* 診断結果メイン */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6" />
            分析結果
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 総合分析セクション */}
          <div className="space-y-6">
            
            <div className="prose max-w-none">
              <p className="text-lg leading-relaxed text-gray-800">
                {diagnosisResult.summary || diagnosisResult.comprehensiveAdvice}
              </p>
            </div>

            {diagnosisResult.keyInsights && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">主要な洞察</h4>
                <ul className="space-y-1">
                  {diagnosisResult.keyInsights.map((insight: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diagnosisResult.urgencyLevel && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
                <AlertTriangle className={`w-5 h-5 ${
                  diagnosisResult.urgencyLevel === 'high' ? 'text-red-500' :
                  diagnosisResult.urgencyLevel === 'medium' ? 'text-yellow-500' :
                  'text-green-500'
                }`} />
                <span className="font-medium">
                  緊急度: {
                    diagnosisResult.urgencyLevel === 'high' ? '高' :
                    diagnosisResult.urgencyLevel === 'medium' ? '中' : '低'
                  }
                </span>
              </div>
            )}

            {/* 詳細分析（最終診断時のみ表示） */}
            {isFinalDiagnosis && (
              <div className="space-y-6 mt-8 border-t pt-6">
                <h4 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-6 h-6" />
                  詳細分析
                </h4>
                
                <div className="grid md:grid-cols-2 gap-4">
                  {diagnosisResult.detailedAnalysis?.emotionalState && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">感情状態</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p><strong>現在のレベル:</strong> {diagnosisResult.detailedAnalysis.emotionalState.current_level}</p>
                        {diagnosisResult.detailedAnalysis.emotionalState.primary_emotions && (
                          <div>
                            <strong>主要な感情:</strong>
                            <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                              {diagnosisResult.detailedAnalysis.emotionalState.primary_emotions.map((emotion: string, i: number) => (
                                <li key={i}>{emotion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {diagnosisResult.detailedAnalysis?.careerGoals && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">キャリア目標</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p><strong>明確度:</strong> {diagnosisResult.detailedAnalysis.careerGoals.clarity_level}</p>
                        {diagnosisResult.detailedAnalysis.careerGoals.primary_goals && (
                          <div>
                            <strong>主要目標:</strong>
                            <ul className="list-disc list-inside mt-1 text-sm text-gray-600">
                              {diagnosisResult.detailedAnalysis.careerGoals.primary_goals.map((goal: string, i: number) => (
                                <li key={i}>{goal}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {diagnosisResult.longTermStrategy && (
                  <Card>
                    <CardHeader>
                      <CardTitle>長期戦略</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-800 leading-relaxed">{diagnosisResult.longTermStrategy}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* おすすめサービスセクション */}
          <div className="space-y-6 border-t pt-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center justify-center gap-2">
                🎯 あなたにおすすめのサービス
              </h3>
              <p className="text-sm text-gray-600">Claude AIが診断結果に基づいて厳選</p>
              {serviceRecommendations.length > 0 && (
                <p className="text-sm text-gray-500">
                  合計 {serviceRecommendations.length} 件 | 
                  緊急: {serviceRecommendations.filter(r => r.priority === 'urgent').length} | 
                  推奨: {serviceRecommendations.filter(r => r.priority === 'recommended').length} | 
                  検討: {serviceRecommendations.filter(r => r.priority === 'consider').length}
                </p>
              )}
            </div>

            {isLoadingServices ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-gray-600">あなたに最適なサービスを分析中...</p>
                </div>
              </div>
            ) : serviceRecommendations.length > 0 ? (
              <div className="space-y-8">
                {/* 緊急度高 */}
                {serviceRecommendations.filter(rec => rec.priority === 'urgent').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <h4 className="text-lg font-semibold text-red-700">緊急対応推奨</h4>
                      <Badge variant="destructive" className="text-xs">
                        {serviceRecommendations.filter(rec => rec.priority === 'urgent').length}件
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {serviceRecommendations
                        .filter(rec => rec.priority === 'urgent')
                        .map((recommendation) => (
                          <ServiceCard 
                            key={recommendation.service.id} 
                            recommendation={recommendation} 
                            onServiceClick={handleServiceClick}
                            isUrgent={true}
                          />
                        ))}
                    </div>
                  </div>
                )}
                
                {/* 推奨 */}
                {serviceRecommendations.filter(rec => rec.priority === 'recommended').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <h4 className="text-lg font-semibold text-yellow-700">おすすめ</h4>
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700">
                        {serviceRecommendations.filter(rec => rec.priority === 'recommended').length}件
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {serviceRecommendations
                        .filter(rec => rec.priority === 'recommended')
                        .map((recommendation) => (
                          <ServiceCard 
                            key={recommendation.service.id} 
                            recommendation={recommendation} 
                            onServiceClick={handleServiceClick}
                          />
                        ))}
                    </div>
                  </div>
                )}
                
                {/* 検討対象 */}
                {serviceRecommendations.filter(rec => rec.priority === 'consider').length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-500" />
                      <h4 className="text-lg font-semibold text-blue-700">検討対象</h4>
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
                        {serviceRecommendations.filter(rec => rec.priority === 'consider').length}件
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {serviceRecommendations
                        .filter(rec => rec.priority === 'consider')
                        .map((recommendation) => (
                          <ServiceCard 
                            key={recommendation.service.id} 
                            recommendation={recommendation} 
                            onServiceClick={handleServiceClick}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* 選択のヒント */}
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-800 mb-1">💡 サービス選択のヒント</h5>
                  <p className="text-sm text-green-700">
                    迷ったときは1位のサービスからチェックしてみてください
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-4xl">🔧</div>
                  <h4 className="text-lg font-semibold text-gray-900">サービス推薦を生成中</h4>
                  <p className="text-gray-600">
                    申し訳ございません。現在サービス推薦を生成できませんでした。<br/>
                    診断を続けるか、しばらく時間をおいて再度お試しください。
                  </p>
                  <Button 
                    onClick={() => generateServiceRecommendations(session)}
                    variant="outline"
                    className="mt-4"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    再試行
                  </Button>
                </div>
              </div>
            )}
          </div>

        </CardContent>
      </Card>


      {/* 分析精度と進行状況（途中診断の場合） */}
      {!isFinalDiagnosis && (
        <div className="space-y-4">
          <Alert className="max-w-2xl mx-auto border-amber-200 bg-amber-50">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <p className="font-medium mb-2">現在の分析精度: {session?.completedQuestions <= 3 ? '30-40%' : session?.completedQuestions <= 6 ? '60-70%' : '80-90%'}</p>
              <p className="text-sm">最後まで答えると、さらに詳細で正確な診断結果をお届けできます。</p>
            </AlertDescription>
          </Alert>

          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <Target className="w-5 h-5" />
                診断進行状況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Progress 
                  value={(session?.completedQuestions / session?.totalQuestions) * 100} 
                  className="bg-amber-200"
                />
                <div className="flex justify-between text-sm text-amber-700">
                  <span>回答済み: {session?.completedQuestions}問</span>
                  <span>残り: {session?.totalQuestions - session?.completedQuestions}問</span>
                </div>
                <p className="text-xs text-amber-600">
                  より詳細で正確な診断結果を得るために、残りの質問にもお答えください
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {!isFinalDiagnosis && canContinue && (
          <Button 
            size="lg"
            onClick={handleContinueDiagnosis}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            <MessageSquareText className="w-5 h-5 px-2" />
            続けて回答する（より正確な診断のために）
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}

        {diagnosisResult.resultType === '診断エラー' && (
          <Button onClick={handleRetryDiagnosis} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            診断を再実行
          </Button>
        )}

        <Link href="/v3">
          <Button variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            V3診断トップに戻る
          </Button>
        </Link>
      </div>

      {/* 診断完了後のメッセージ */}
      {isFinalDiagnosis && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <p className="font-medium">診断完了！</p>
            <p className="text-sm mt-1">
              すべての質問にお答えいただき、ありがとうございました。
              この結果を参考に、あなたのキャリアの次のステップを考えてみてください。
            </p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default function V3ResultPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900">読み込み中...</h3>
            <p className="text-gray-600">診断結果を準備中です</p>
          </div>
        </div>
      </div>
    }>
      <V3ResultPageContent />
    </Suspense>
  )
}