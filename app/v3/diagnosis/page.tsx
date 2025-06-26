/**
 * V3診断ページ - テキスト回答形式診断
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  MessageSquareText, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  Brain,
  Clock,
  Target,
  Lightbulb
} from "lucide-react"

import { V3_QUESTIONS, getProgressInfo, getPartialDiagnosisConfig } from "@/lib/v3/questions"
import { 
  getV3Session, 
  addV3Answer, 
  addV3PartialResult,
  syncV3SessionToServer 
} from "@/lib/v3/session"
import { trackEvent } from "@/lib/analytics"

export default function V3DiagnosisPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [showPartialDiagnosis, setShowPartialDiagnosis] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  // セッション復元（最適化）
  useEffect(() => {
    const session = getV3Session()
    const sessionAnswers = session.textAnswers || {}
    const sessionStep = session.currentStep || 1
    
    setAnswers(sessionAnswers)
    setCurrentStep(sessionStep)
    
    // 現在の質問の既存回答を設定
    const currentQuestionId = V3_QUESTIONS[sessionStep - 1]?.id
    if (currentQuestionId && sessionAnswers[currentQuestionId]?.answer) {
      setCurrentAnswer(sessionAnswers[currentQuestionId].answer)
    }
  }, [])

  const currentQuestion = V3_QUESTIONS[currentStep - 1]
  const answeredCount = Object.keys(answers).length
  const progressInfo = getProgressInfo(answeredCount)
  const partialConfig = getPartialDiagnosisConfig(answeredCount)

  // 回答を保存して次へ
  const handleNext = async () => {
    if (!currentQuestion) return

    // バリデーション
    const trimmedAnswer = currentAnswer.trim()
    if (trimmedAnswer.length < currentQuestion.minLength) {
      setValidationError(`${currentQuestion.minLength}文字以上で入力してください（現在: ${trimmedAnswer.length}文字）`)
      return
    }
    if (trimmedAnswer.length > currentQuestion.maxLength) {
      setValidationError(`${currentQuestion.maxLength}文字以内で入力してください（現在: ${trimmedAnswer.length}文字）`)
      return
    }

    setValidationError("")
    setIsLoading(true)

    try {
      // 回答を保存
      addV3Answer(currentQuestion.id, currentQuestion.question, trimmedAnswer)
      
      // Analyticsイベント
      trackEvent(`V3質問回答_Q${currentStep}`, {
        version: 'v3',
        question_id: currentQuestion.id,
        answer_length: trimmedAnswer.length,
        step: currentStep
      })

      // 状態を更新
      const newAnswers = {
        ...answers,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          answer: trimmedAnswer,
          answeredAt: new Date().toISOString(),
          characterCount: trimmedAnswer.length
        }
      }
      setAnswers(newAnswers)

      // 次のステップへ
      if (currentStep < V3_QUESTIONS.length) {
        setCurrentStep(currentStep + 1)
        setCurrentAnswer("")
        
        // 途中診断の提案タイミング
        if ([3, 6, 9].includes(Object.keys(newAnswers).length)) {
          setShowPartialDiagnosis(true)
        }
      } else {
        // 最終診断へ
        router.push('/v3/result?type=final')
      }

      // サーバーに同期（非同期、UIをブロックしない）
      syncV3SessionToServer().catch(error => {
        console.error('バックグラウンド同期エラー:', error)
      })

    } catch (error) {
      console.error('回答保存エラー:', error)
      alert('回答の保存中にエラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  // 前の質問に戻る（最適化）
  const handlePrevious = () => {
    if (currentStep > 1) {
      const newStep = currentStep - 1
      setCurrentStep(newStep)
      
      const prevQuestionId = V3_QUESTIONS[newStep - 1]?.id
      const prevAnswer = prevQuestionId && answers[prevQuestionId]?.answer
      setCurrentAnswer(prevAnswer || "")
    }
  }

  // 途中診断を実行
  const handlePartialDiagnosis = async () => {
    setIsLoading(true)
    setShowPartialDiagnosis(false)

    try {
      trackEvent('V3途中診断実行', {
        version: 'v3',
        answered_questions: answeredCount,
        confidence_level: partialConfig.confidenceLevel
      })

      // セッション情報を取得（最新の状態を確実に取得）
      // セッション同期処理を最適化
      
      // 現在のUI状態をセッションに反映（同期確保）
      const currentSessionData = getV3Session()
      Object.keys(answers).forEach(questionId => {
        if (answers[questionId] && !currentSessionData.textAnswers[questionId]) {
          addV3Answer(questionId, answers[questionId].question, answers[questionId].answer)
        }
      })
      
      // 同期後にセッションを再取得
      const session = getV3Session()

      // 実際の回答数を検証
      const actualAnswerCount = Object.values(session.textAnswers).filter(
        answer => answer?.answer?.trim() && answer.answer.trim().length > 0
      ).length

      if (actualAnswerCount < 1) {
        console.error('V3 Error: No valid answers found in session')
        alert('回答データが正しく保存されていません。ページを再読み込みして、もう一度お試しください。')
        return
      }

      // セッションIDの有効性チェック
      if (!session.sessionId || session.sessionId.trim().length === 0) {
        console.error('V3 Error: Invalid session ID')
        alert('セッションIDが無効です。ページを再読み込みして、もう一度お試しください。')
        return
      }

      // カラムベース形式に変換（セッションから直接取得）
      const requestBody = {
        sessionId: session.sessionId,
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

      // 実際に送信される非空の回答を確認
      const nonEmptyAnswers = Object.entries(requestBody).filter(([key, value]) => 
        key !== 'sessionId' && value && value.trim().length > 0
      )

      // 送信前の最終チェック
      if (nonEmptyAnswers.length < 1) {
        console.error('V3 Error: No valid answers to send to API')
        alert('有効な回答がありません。質問に回答してから診断をお試しください。')
        return
      }

      const response = await fetch('/api/v3/partial-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('V3 API Error:', errorData)
        
        // エラーの詳細情報をユーザーに表示
        let errorMessage = `途中診断API エラー (${response.status}): ${errorData.error || response.statusText}`
        if (errorData.details) {
          errorMessage += `\n詳細: 有効な回答数 ${errorData.details.validAnswerCount}`
        }
        
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      const { result } = responseData
      
      // 途中診断結果を保存（V3PartialResult形式に変換）
      const partialResult = {
        answeredQuestions: result.answeredQuestions,
        confidenceLevel: result.confidenceLevel,
        resultType: result.resultType,
        summary: result.summary,
        recommendations: result.recommendations || []
      }
      
      addV3PartialResult(partialResult)

      // 結果ページへ
      router.push('/v3/result?type=partial')

    } catch (error) {
      console.error('途中診断エラー:', error)
      alert('診断中にエラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  // 質問をスキップ（任意質問のみ）
  const handleSkip = () => {
    if (!currentQuestion?.required) {
      setCurrentAnswer("")
      if (currentStep < V3_QUESTIONS.length) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">診断完了</h2>
        <p className="text-gray-600 mb-6">すべての質問が完了しました</p>
        <Button onClick={() => router.push('/v3/result?type=final')}>
          最終診断結果を見る
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* プログレスヘッダー（整理版） */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-1">
              {currentStep}/{V3_QUESTIONS.length}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-1 ${
                currentQuestion.category === 'basic' ? 'bg-red-50 text-red-700 border-red-200' :
                currentQuestion.category === 'detailed' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-green-50 text-green-700 border-green-200'
              }`}
            >
              {currentQuestion.category === 'basic' ? '基本' :
               currentQuestion.category === 'detailed' ? '詳細' :
               '深層'}
            </Badge>
          </div>
          
          <div className="text-xs text-gray-500">
            回答: {answeredCount}問
          </div>
        </div>

        <Progress value={progressInfo.progressPercentage} className="mb-3" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span>{progressInfo.progressPercentage}%</span>
            </div>
            {answeredCount >= 1 && (
              <div className="flex items-center gap-1">
                <Brain className="w-3 h-3 text-blue-500" />
                <span className="hidden sm:inline">診断可能 (精度: {partialConfig.accuracyPercentage})</span>
                <span className="sm:hidden">診断可能</span>
              </div>
            )}
          </div>
          
          {/* 上部診断ボタン */}
          {answeredCount >= 1 && (
            <Button
              size="sm"
              onClick={handlePartialDiagnosis}
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white text-xs px-3 py-2 h-8 ml-3"
            >
              <Brain className="w-3 h-3 mr-1" />
              診断する
            </Button>
          )}
        </div>
      </div>

      {/* 途中診断提案モーダル */}
      {showPartialDiagnosis && (
        <Alert className="border-blue-200 bg-blue-50">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-3">
              <p className="font-medium">
                {answeredCount}問お答えいただきました！ここで診断結果を確認できます。
              </p>
              <p className="text-sm">
                現在の精度: {partialConfig.accuracyPercentage} | 
                最後まで答えると、さらに詳細で正確な診断が可能です
              </p>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handlePartialDiagnosis}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? (
                    <>
                      <div className="w-3 h-3 mr-1 border border-white border-t-transparent rounded-full animate-spin"></div>
                      Claude分析中...
                    </>
                  ) : (
                    '現在の回答で診断する'
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowPartialDiagnosis(false)}
                >
                  続けて回答する
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* 診断中の全画面ローディングモーダル */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-6">
              {/* メインローディングアニメーション */}
              <div className="relative">
                <div className="w-20 h-20 mx-auto">
                  <div className="absolute inset-0 border-4 border-green-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-blue-200 rounded-full"></div>
                  <div className="absolute inset-2 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '0.8s'}}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* タイトル */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Claude AIが分析中</h3>
                <p className="text-sm text-gray-600">あなたの回答を深く分析しています...</p>
              </div>

              {/* プロセス表示 */}
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    テキスト解析
                  </span>
                  <span className="text-green-600 font-medium">完了 ✓</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    感情分析
                  </span>
                  <span className="text-blue-600 font-medium">実行中...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    キャリア診断
                  </span>
                  <span className="text-gray-400">待機中</span>
                </div>
              </div>

              {/* プログレスバー */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 h-2 rounded-full transition-all duration-1000 animate-pulse" style={{width: '70%'}}></div>
              </div>

              {/* 特徴説明 */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 border border-green-200">
                <p className="text-xs text-green-800 font-medium mb-1">✨ V3 Claude分析の特徴</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-green-700">
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                    高精度分析
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    パーソナライズ
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 質問カード（コンパクト） */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-full flex items-center justify-center font-bold text-base flex-shrink-0">
              {currentStep}
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg sm:text-xl mb-1 leading-relaxed">
                {currentQuestion.question}
              </CardTitle>
              {currentQuestion.description && (
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  {currentQuestion.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* テキストエリア（モバイル最適化） */}
          <div className="space-y-2">
            <div className="relative">
              <Textarea
                value={currentAnswer}
                onChange={(e) => {
                  setCurrentAnswer(e.target.value)
                  setValidationError("")
                  setIsTyping(e.target.value.length > 0)
                }}
                placeholder={currentQuestion.placeholder}
                className={`min-h-[120px] sm:min-h-[160px] resize-none text-base sm:text-lg leading-relaxed border-2 transition-all duration-300 focus:border-transparent focus:ring-4 bg-white/70 backdrop-blur-sm ${
                  isTyping ? 'border-green-300 focus:ring-green-200' : 'border-gray-200 focus:ring-blue-200'
                }`}
                disabled={isLoading}
              />
              {isTyping && (
                <div className="absolute top-3 right-3 flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
            </div>
            
            {/* 文字数カウンター */}
            <div className="flex justify-between items-center text-sm">
              <span className={`${
                currentAnswer.length < currentQuestion.minLength ? 'text-red-500' :
                currentAnswer.length > currentQuestion.maxLength ? 'text-red-500' :
                'text-green-600'
              }`}>
                {currentAnswer.length} 文字
                {currentQuestion.required && (
                  <span className="text-gray-500 ml-2">
                    (最小: {currentQuestion.minLength}文字)
                  </span>
                )}
              </span>
              
              <span className="text-gray-400">
                最大: {currentQuestion.maxLength}文字
              </span>
            </div>

            {/* バリデーションエラー */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* 操作ボタン */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {/* 次へボタン */}
            <Button
              onClick={handleNext}
              disabled={isLoading || currentAnswer.trim().length < currentQuestion.minLength}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 flex items-center gap-2 flex-1 sm:flex-none"
            >
              {isLoading ? (
                '保存中...'
              ) : currentStep === V3_QUESTIONS.length ? (
                <>最終診断へ <Target className="w-4 h-4" /></>
              ) : (
                <>次の質問へ <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>

            {/* スキップボタン（任意質問のみ） */}
            {!currentQuestion.required && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-gray-500 hover:text-gray-700"
              >
                スキップ
              </Button>
            )}

            {/* 戻るボタン */}
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-2 sm:ml-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              前の質問
            </Button>
          </div>

          {/* 途中診断ボタン（簡素化） */}
          {answeredCount >= 2 && !showPartialDiagnosis && (
            <div className="border-t pt-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-center sm:text-left">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    現在の回答で診断可能
                  </div>
                  <div className="text-xs text-blue-700">
                    精度: {partialConfig.accuracyPercentage} | 最後まで答えるとさらに正確
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handlePartialDiagnosis}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 h-8"
                >
                  <Brain className="w-3 h-3 mr-1" />
                  今すぐ診断
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 質問一覧（モバイル最適化） */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">質問一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {V3_QUESTIONS.map((q, index) => {
              const questionStep = index + 1
              const isAnswered = answers[q.id]
              const isCurrent = questionStep === currentStep
              
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentStep(questionStep)
                    setCurrentAnswer(answers[q.id]?.answer || "")
                  }}
                  disabled={isLoading}
                  className={`p-2 rounded-md text-left transition-all text-xs ${
                    isCurrent 
                      ? 'bg-blue-100 border-2 border-blue-500 text-blue-800' :
                    isAnswered 
                      ? 'bg-green-50 border border-green-200 text-green-800 hover:bg-green-100' :
                      'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-medium text-xs">Q{questionStep}</span>
                    {isAnswered && <CheckCircle className="w-3 h-3 text-green-600" />}
                    {isCurrent && <Clock className="w-3 h-3 text-blue-600" />}
                  </div>
                  <div className="text-xs opacity-75 line-clamp-2">
                    {q.question.substring(0, 25)}...
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}