/**
 * V3段階的診断結果表示コンポーネント
 * Phase 1: 即時結果 → Phase 2: 詳細パーソナル結果
 */

"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Calendar,
  Lightbulb,
  Heart,
  Star,
  ExternalLink,
  Zap,
  Award
} from "lucide-react"
import { QuickDiagnosisResult, DetailedPersonalDiagnosisResult } from '@/lib/v3/staged-diagnosis'
import { V3ServiceRecommendation } from '@/lib/v3/serviceRecommendation'
import Image from 'next/image'

interface StagedDiagnosisResultProps {
  sessionId: string
  onQuickResult?: (result: QuickDiagnosisResult) => void
  onDetailedResult?: (result: DetailedPersonalDiagnosisResult) => void
}

export default function StagedDiagnosisResult({ 
  sessionId, 
  onQuickResult, 
  onDetailedResult 
}: StagedDiagnosisResultProps) {
  const [quickResult, setQuickResult] = useState<QuickDiagnosisResult | null>(null)
  const [detailedResult, setDetailedResult] = useState<DetailedPersonalDiagnosisResult | null>(null)
  const [serviceRecommendations, setServiceRecommendations] = useState<V3ServiceRecommendation[]>([])
  const [isLoadingQuick, setIsLoadingQuick] = useState(false)
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false)
  const [error, setError] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Phase 1: 即時診断実行
  const executeQuickDiagnosis = async () => {
    setIsLoadingQuick(true)
    setError('')
    
    try {
      const { getV3Session } = await import('@/lib/v3/session')
      const session = getV3Session()
      
      const requestBody = {
        sessionId: session.sessionId,
        phase: 'quick',
        diagnosisType: 'final',
        q1_text: session.textAnswers['q1_text']?.answer || '',
        q2_text: session.textAnswers['q2_text']?.answer || '',
        q3_text: session.textAnswers['q3_text']?.answer || '',
        q4_text: session.textAnswers['q4_text']?.answer || '',
        q5_text: session.textAnswers['q5_text']?.answer || '',
        q6_text: session.textAnswers['q6_text']?.answer || '',
        q7_text: session.textAnswers['q7_text']?.answer || '',
        q8_text: session.textAnswers['q8_text']?.answer || '',
        q9_text: session.textAnswers['q9_text']?.answer || '',
        q10_text: session.textAnswers['q10_text']?.answer || ''
      }
      
      const response = await fetch('/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error('即時診断に失敗しました')
      }
      
      const data = await response.json()
      setQuickResult(data.result)
      onQuickResult?.(data.result)
      
      // 詳細診断を自動開始
      setTimeout(() => {
        executeDetailedDiagnosis()
      }, 1000)
      
    } catch (error) {
      console.error('Quick diagnosis error:', error)
      setError('即時診断でエラーが発生しました')
    } finally {
      setIsLoadingQuick(false)
    }
  }

  // Phase 2: 詳細パーソナル診断実行
  const executeDetailedDiagnosis = async () => {
    setIsLoadingDetailed(true)
    setProgress(0)
    
    // プログレス更新
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) return prev
        return prev + Math.random() * 15
      })
    }, 500)
    
    try {
      const { getV3Session } = await import('@/lib/v3/session')
      const session = getV3Session()
      
      const requestBody = {
        sessionId: session.sessionId,
        phase: 'detailed',
        diagnosisType: 'final',
        q1_text: session.textAnswers['q1_text']?.answer || '',
        q2_text: session.textAnswers['q2_text']?.answer || '',
        q3_text: session.textAnswers['q3_text']?.answer || '',
        q4_text: session.textAnswers['q4_text']?.answer || '',
        q5_text: session.textAnswers['q5_text']?.answer || '',
        q6_text: session.textAnswers['q6_text']?.answer || '',
        q7_text: session.textAnswers['q7_text']?.answer || '',
        q8_text: session.textAnswers['q8_text']?.answer || '',
        q9_text: session.textAnswers['q9_text']?.answer || '',
        q10_text: session.textAnswers['q10_text']?.answer || ''
      }
      
      const response = await fetch('/api/v3/staged-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      if (!response.ok) {
        throw new Error('詳細診断に失敗しました')
      }
      
      const data = await response.json()
      setProgress(100)
      
      setTimeout(() => {
        setDetailedResult(data.result)
        onDetailedResult?.(data.result)
        
        // サービス推薦を設定
        if (data.result.service_recommendations) {
          setServiceRecommendations(data.result.service_recommendations)
          console.log('✅ サービス推薦を表示:', data.result.service_recommendations.length)
        }
      }, 500)
      
    } catch (error) {
      console.error('Detailed diagnosis error:', error)
      setError('詳細診断でエラーが発生しました')
    } finally {
      clearInterval(progressInterval)
      setIsLoadingDetailed(false)
    }
  }

  // 初期実行
  useEffect(() => {
    executeQuickDiagnosis()
  }, [])

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 sm:px-6 lg:px-8">
      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Phase 1: 即時診断結果 */}
      {isLoadingQuick && (
        <Card className="border-2 border-green-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Brain className="w-6 h-6 text-green-600 animate-pulse" />
              <CardTitle className="text-xl text-green-800">AI即時診断中...</CardTitle>
            </div>
            <CardDescription>Haikuが高速分析を実行中</CardDescription>
          </CardHeader>
        </Card>
      )}

      {quickResult && (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-blue-50 shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-green-800">即時診断結果</CardTitle>
                <CardDescription>基本的な分析が完了しました</CardDescription>
              </div>
              <Badge className="ml-auto bg-green-500 text-white">
                {quickResult.result_type}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-gray-700 leading-relaxed text-base">
              {quickResult.summary}
            </p>
            
            <div className="bg-white/80 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                今日からできること
              </h4>
              <ul className="space-y-2">
                {quickResult.immediate_actions.map((action, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <ArrowRight className="w-4 h-4 text-green-500" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: 詳細分析中 */}
      {isLoadingDetailed && (
        <Card className="border-2 border-blue-300 shadow-xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Brain className="w-8 h-8 text-blue-600 animate-pulse" />
                <Sparkles className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
              </div>
              <CardTitle className="text-xl text-blue-800">
                あなた専用の詳細分析中...
              </CardTitle>
            </div>
            <CardDescription className="text-blue-600">
              Claude Sonnet 3.5があなたの回答を深く分析し、パーソナライズされたアドバイスを作成中
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* プログレスバー */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-600">{Math.round(progress)}% 完了</p>
            
            {/* 分析ステップ表示 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="text-center space-y-2">
                <Heart className="w-6 h-6 text-red-500 mx-auto animate-pulse" />
                <p className="text-xs text-gray-600">感情分析</p>
              </div>
              <div className="text-center space-y-2">
                <TrendingUp className="w-6 h-6 text-green-500 mx-auto animate-pulse" />
                <p className="text-xs text-gray-600">成長パターン</p>
              </div>
              <div className="text-center space-y-2">
                <Users className="w-6 h-6 text-blue-500 mx-auto animate-pulse" />
                <p className="text-xs text-gray-600">相性分析</p>
              </div>
              <div className="text-center space-y-2">
                <Lightbulb className="w-6 h-6 text-yellow-500 mx-auto animate-pulse" />
                <p className="text-xs text-gray-600">アドバイス生成</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2: 詳細パーソナル診断結果 */}
      {detailedResult && (
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  あなた専用パーソナル診断
                </CardTitle>
                <CardDescription>詳細な分析が完了しました</CardDescription>
              </div>
              <Badge className="ml-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                {detailedResult.result_type}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-white/90 rounded-lg p-5 border border-purple-200">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">
                あなたの現状分析
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {detailedResult.personal_summary}
              </p>
            </div>

            {/* あなたの洞察 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/90 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  あなたの感情パターン
                </h4>
                <p className="text-sm text-gray-700">{detailedResult.personal_insights.emotional_pattern}</p>
              </div>
              
              <div className="bg-white/90 rounded-lg p-4 border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  あなたの強み
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  {detailedResult.personal_insights.career_strengths.map((strength, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-green-500" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* あなた専用アクションプラン */}
            <div className="bg-white/90 rounded-lg p-5 border border-orange-200">
              <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                あなた専用アクションプラン
              </h3>
              
              {detailedResult.personalized_action_plan.this_week.map((action, index) => (
                <div key={index} className="mb-4 p-3 bg-orange-50 rounded-md">
                  <h5 className="font-medium text-orange-800 mb-1">今週の行動</h5>
                  <p className="text-sm text-gray-700 mb-2">{action.action}</p>
                  <p className="text-xs text-orange-600">
                    <strong>なぜあなたに：</strong> {action.why_for_you}
                  </p>
                </div>
              ))}
            </div>

            {/* あなたの将来シナリオ */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/90 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">現職継続の場合</h4>
                <p className="text-xs text-gray-600 mb-2">
                  実現可能性: {detailedResult.your_future_scenarios.stay_current_path.probability_for_you}
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {detailedResult.your_future_scenarios.stay_current_path.what_happens_to_you.map((outcome, index) => (
                    <li key={index} className="text-xs">• {outcome}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white/90 rounded-lg p-4 border border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-2">変化を選ぶ場合</h4>
                <p className="text-xs text-gray-600 mb-2">
                  実現可能性: {detailedResult.your_future_scenarios.change_path.probability_for_you}
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {detailedResult.your_future_scenarios.change_path.what_happens_to_you.map((outcome, index) => (
                    <li key={index} className="text-xs">• {outcome}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* サービス推薦セクション */}
      {serviceRecommendations.length > 0 && (
        <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                <Award className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                  あなたにおすすめのサービス
                </CardTitle>
                <CardDescription>あなたの診断結果に基づいて厳選されました</CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {serviceRecommendations.map((recommendation, index) => (
              <div 
                key={recommendation.service.id} 
                className="bg-white/90 rounded-lg p-5 border border-yellow-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {/* サムネイル画像 */}
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm absolute -top-1 -left-1 z-10">
                        {recommendation.rank}
                      </div>
                      {recommendation.service.image && !imageErrors.has(recommendation.service.id) ? (
                        <div className="w-16 h-16 relative bg-gray-100 rounded-lg overflow-hidden border">
                          <Image
                            src={recommendation.service.image}
                            alt={recommendation.service.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                            unoptimized={true}
                            onError={(e) => {
                              console.log('Image load error for service:', recommendation.service.name, recommendation.service.image)
                              setImageErrors(prev => new Set(prev).add(recommendation.service.id))
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center border">
                          <Zap className="w-8 h-8 text-blue-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800 text-lg">
                        {recommendation.service.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={recommendation.priority === 'urgent' ? 'destructive' : 
                                  recommendation.priority === 'recommended' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {recommendation.priority === 'urgent' ? '緊急' : 
                           recommendation.priority === 'recommended' ? '推奨' : '検討'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {recommendation.timing === 'immediate' ? '今すぐ' : 
                           recommendation.timing === '1-3months' ? '1-3ヶ月' : '3-6ヶ月'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          スコア: {recommendation.score}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      // クリック追跡
                      window.open(recommendation.service.url, '_blank')
                      console.log('サービスクリック:', recommendation.service.name)
                    }}
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                    size="sm"
                  >
                    詳細を見る
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                
                <p className="text-gray-700 text-sm mb-3">
                  {recommendation.service.description}
                </p>
                
                <div className="bg-yellow-50 rounded-md p-3 mb-3">
                  <h5 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    なぜあなたにおすすめか
                  </h5>
                  <p className="text-sm text-yellow-700">
                    {recommendation.aiReason}
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-md p-3">
                    <h6 className="font-medium text-blue-800 text-xs mb-1">期待される効果</h6>
                    <p className="text-xs text-blue-700">{recommendation.expectedOutcome}</p>
                  </div>
                  
                  <div className="bg-green-50 rounded-md p-3">
                    <h6 className="font-medium text-green-800 text-xs mb-1">マッチ要因</h6>
                    <div className="flex flex-wrap gap-1">
                      {recommendation.matchFactors.map((factor, factorIndex) => (
                        <span 
                          key={factorIndex} 
                          className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="text-center mt-6 p-4 bg-yellow-100 rounded-lg">
              <p className="text-sm text-yellow-800">
                🎯 これらのサービスは、あなたの回答内容と診断結果に基づいて選ばれました。
                <br />
                詳細を確認して、あなたの次のステップを見つけてください。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}