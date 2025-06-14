"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { v2Questions, V2Answers, validateV2Answers } from "@/lib/v2/questions"
import { trackEvent } from "@/lib/analytics"
import { getJSTTimestamp } from "@/lib/utils/timestamp"
import { getV2Session, saveV2Session } from "@/lib/v2/session"

export default function V2DiagnosisPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Partial<V2Answers>>({
    breaking_point: [],
    demographics: {},
    freeText: ""
  })
  const [demographicStep, setDemographicStep] = useState<'age' | 'job'>('age')
  const [v2Session, setV2Session] = useState(getV2Session())

  const totalSteps = v2Questions.length + 1 // 質問 + フリーテキスト
  const progress = ((currentQuestion + 1) / totalSteps) * 100
  const question = currentQuestion < v2Questions.length ? v2Questions[currentQuestion] : null

  useEffect(() => {
    // ページビュー追跡
    trackEvent('v2_diagnosis_start', { version: 'v2' })
    
    // 初期保存を一時的に無効化
    // initializeV2Diagnosis()
  }, [])

  const initializeV2Diagnosis = async () => {
    try {
      // セッションIDを生成または取得（UUID形式で生成）
      let sessionId = sessionStorage.getItem('v2_session_id')
      if (!sessionId) {
        // UUID形式のIDを生成
        sessionId = crypto.randomUUID()
        sessionStorage.setItem('v2_session_id', sessionId)
      }

      // 初期データ保存
      const response = await fetch('/api/save-v2-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          answers: { satisfaction: '' }, // 空の初期データ
          result: { type: '', summary: '', advice: '' }, // 空の初期結果
          userAgent: navigator.userAgent,
          isInitialSave: true // 初期保存フラグ
        })
      })

      if (response.ok) {
        console.log('V2診断初期データ保存成功')
      }
    } catch (error) {
      console.warn('V2診断初期データ保存エラー:', error)
    }
  }

  const handleSingleSelect = (value: string) => {
    const questionId = question.id
    const currentQuestionNumber = currentQuestion + 1

    if (questionId === 'demographics') {
      // 人口統計学的質問の処理
      if (demographicStep === 'age') {
        const newAnswers = {
          ...answers,
          demographics: { ...answers.demographics, age: value }
        }
        setAnswers(newAnswers)
        setDemographicStep('job')
        
        // V1と同じようにセッション更新（年代選択）
        updateV2SessionWithAnswer(newAnswers, currentQuestionNumber, `${questionId}_age`, value)
        return
      } else {
        const newAnswers = {
          ...answers,
          demographics: { ...answers.demographics, job: value }
        }
        setAnswers(newAnswers)
        
        // V1と同じようにセッション更新（職種選択）
        updateV2SessionWithAnswer(newAnswers, currentQuestionNumber, `${questionId}_job`, value)
        nextQuestion()
      }
    } else {
      const newAnswers = { ...answers, [questionId]: value }
      setAnswers(newAnswers)
      
      // V1と同じようにセッション更新
      updateV2SessionWithAnswer(newAnswers, currentQuestionNumber, questionId, value)
      
      nextQuestion()
    }
  }

  // V1と同じ思想でV2セッション更新関数
  const updateV2SessionWithAnswer = (newAnswers: Partial<V2Answers>, questionNumber: number, questionId: string, value: string) => {
    // ステップ計算: 1=開始, 2=質問1, 3=質問2, ... n+1=質問n, n+2=完了
    const newStep = questionNumber + 1
    const updatedSession = {
      ...v2Session,
      answers: newAnswers,
      currentStep: newStep,
      updatedAt: getJSTTimestamp()
    }
    setV2Session(updatedSession)

    // ステップ更新とupdated_at情報をコンソール出力
    console.log("📊 [V2 Answer]", {
      questionNumber,
      questionId,
      answer: Array.isArray(value) ? value.join(',') : value,
      step: `${v2Session.currentStep} → ${newStep}`,
      updatedAt: updatedSession.updatedAt
    })

    // 2. データベース同期を確実に実行
    // V2セッション保存（データベース同期付き）
    saveV2Session(updatedSession)
    
    // トラッキング（アナリティクス + V2セッション同期）
    trackEvent('v2_question_answered', {
      question_id: questionId,
      question_number: questionNumber,
      answer: value,
      version: 'v2',
      user_id: v2Session.userId // ユーザーIDを追加
    })
  }

  const handleMultipleSelect = (value: string) => {
    const questionId = question.id as 'breaking_point'
    const currentSelections = answers[questionId] || []
    const maxSelections = question.maxSelections || 3
    const currentQuestionNumber = currentQuestion + 1

    let newSelections: string[]
    if (currentSelections.includes(value)) {
      // 既に選択されている場合は削除
      newSelections = currentSelections.filter(item => item !== value)
    } else if (currentSelections.length < maxSelections) {
      // 最大選択数に達していない場合は追加
      newSelections = [...currentSelections, value]
    } else {
      // 最大選択数に達している場合は何もしない
      return
    }

    const newAnswers = { ...answers, [questionId]: newSelections }
    setAnswers(newAnswers)

    // V1と同じようにセッション更新（複数選択）
    updateV2SessionWithAnswer(newAnswers, currentQuestionNumber, questionId, newSelections.join(','))
  }

  const nextQuestion = () => {
    if (currentQuestion < v2Questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setDemographicStep('age') // 人口統計学的質問のステップをリセット
    } else {
      // 全質問完了 - フリーテキスト入力画面へ
      setCurrentQuestion(v2Questions.length) // フリーテキスト画面用の特別なインデックス
    }
  }

  const prevQuestion = () => {
    // フリーテキスト画面から戻る場合
    if (currentQuestion >= v2Questions.length) {
      setCurrentQuestion(v2Questions.length - 1)
      return
    }
    
    if (question?.id === 'demographics' && demographicStep === 'job') {
      setDemographicStep('age')
      return
    }
    
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
      setDemographicStep('age')
    }
  }

  const completeV2Diagnosis = async () => {
    
    if (!validateV2Answers(answers)) {
      alert("すべての質問に答えてから進んでください。")
      return
    }

    // フリーテキストも含めた最終回答を更新
    const finalAnswers = { ...answers }
    // 診断完了段階: 全質問数 + 2 (1=開始, +質問数, +1=完了)
    const completionStep = v2Questions.length + 2
    const finalSession = {
      ...v2Session,
      answers: finalAnswers,
      currentStep: completionStep,
      completedAt: getJSTTimestamp(),
      updatedAt: getJSTTimestamp()
    }
    setV2Session(finalSession)

    // V1と同じようにバックグラウンドでセッション保存
    saveV2Session(finalSession)

    // 完了トラッキング（アナリティクス + セッション同期）
    trackEvent('v2_diagnosis_completed', {
      version: 'v2',
      total_questions: v2Questions.length,
      completion_time: Date.now()
    })

    // セッションストレージに保存（互換性のため）
    sessionStorage.setItem('v2_answers', JSON.stringify(finalAnswers))
    
    // 統一された保存関数を使用（非同期で実行して動作速度を保つ）
    const { saveV2DiagnosisCompleted } = await import('@/lib/v2/database')
    saveV2DiagnosisCompleted(finalAnswers)
    
    // 結果ページへ即座に遷移
    router.push('/v2/result')
  }

  const canProceedMultiple = () => {
    const questionId = question.id as 'breaking_point'
    const selections = answers[questionId] || []
    return selections.length > 0
  }

  const getQuestionTitle = () => {
    if (question.id === 'demographics') {
      return demographicStep === 'age' ? '年代を選んでください' : '職種を選んでください'
    }
    return question.question
  }

  const getQuestionOptions = () => {
    if (question.id === 'demographics') {
      return demographicStep === 'age' 
        ? question.options.slice(0, 5) // 年代の選択肢
        : question.options.slice(5)    // 職種の選択肢
    }
    return question.options
  }

  // フリーテキスト入力画面
  if (currentQuestion >= v2Questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-2xl">
          <div className="mb-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 text-purple-700 rounded-full text-sm font-medium mb-4 shadow-lg">
                <Sparkles className="w-4 h-4 mr-2" />
                最終ステップ
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                もう少し詳しく教えてください
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-2 px-2">状況をより詳しく書いていただけると、より的確なアドバイスができます（任意）</p>
            </div>
            <Progress value={progress} className="w-full bg-gradient-to-r from-purple-200 to-pink-200" />
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl md:text-2xl text-center text-gray-900 flex items-center justify-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl">💭</span>
                現在の状況について自由に書いてください
              </CardTitle>
              <p className="text-center text-xs sm:text-sm text-gray-600 mt-2">
                例：上司との関係、具体的な悩み、将来への不安など
              </p>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 md:p-8">
              <textarea
                value={answers.freeText || ""}
                onChange={(e) => setAnswers(prev => ({ ...prev, freeText: e.target.value }))}
                placeholder="ここに自由に書いてください。どんな小さなことでも大丈夫です。例えば、どんな時に一番ストレスを感じるか、理想の働き方、転職への不安など..."
                className="w-full h-24 sm:h-32 p-3 sm:p-4 text-sm sm:text-base border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={1000}
              />
              <div className="text-right text-sm text-gray-500 mt-2">
                {(answers.freeText || "").length}/1000文字
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 sm:mt-8 space-y-4">
            <Button
              variant="ghost"
              onClick={prevQuestion}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              前の質問に戻る
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  // フリーテキストなしでも完了処理を実行
                  const updatedAnswers = { ...answers, freeText: answers.freeText || "" }
                  setAnswers(updatedAnswers)
                  
                  // V1と同じようにセッション更新してから完了
                  const completionStep = v2Questions.length + 2
                  const updatedSession = {
                    ...v2Session,
                    answers: updatedAnswers,
                    freeText: answers.freeText || "",
                    currentStep: completionStep,
                    updatedAt: getJSTTimestamp()
                  }
                  setV2Session(updatedSession)
                  saveV2Session(updatedSession)
                  
                  completeV2Diagnosis()
                }}
                className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 text-sm sm:text-base py-2 sm:py-3"
              >
                スキップして診断結果を見る
              </Button>
              
              <Button
                onClick={() => {
                  // フリーテキスト入力を反映してから完了
                  const updatedAnswers = { ...answers }
                  setAnswers(updatedAnswers)
                  
                  // V1と同じようにセッション更新してから完了
                  const completionStep = v2Questions.length + 2
                  const updatedSession = {
                    ...v2Session,
                    answers: updatedAnswers,
                    freeText: answers.freeText || "",
                    currentStep: completionStep,
                    updatedAt: getJSTTimestamp()
                  }
                  setV2Session(updatedSession)
                  saveV2Session(updatedSession)
                  
                  completeV2Diagnosis()
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-sm sm:text-base py-2 sm:py-3"
              >
                診断結果を見る
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-2xl">
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-100 to-blue-100 border border-green-200 text-green-700 rounded-full text-sm font-medium mb-4 shadow-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              質問 {currentQuestion + 1} / {v2Questions.length}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              選択肢から選んでください
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">クリックするだけで完了します</p>
          </div>
          <Progress value={progress} className="w-full bg-gradient-to-r from-green-200 to-blue-200" />
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl text-center text-gray-900 flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-2xl sm:text-3xl">{question.emoji}</span>
              {getQuestionTitle()}
            </CardTitle>
            {question.type === 'multiple' && (
              <p className="text-center text-sm text-gray-600 mt-2">
                最大{question.maxSelections}つまで選択可能 
                {question.id === 'breaking_point' ? 
                  ` (${(answers[question.id] || []).length}/${question.maxSelections}選択中)` : ''}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8">
            <div className="grid gap-2 sm:gap-3 md:gap-4">
              {getQuestionOptions().map((option) => {
                const isSelected = (() => {
                  if (question.type === 'multiple') {
                    const questionId = question.id as 'breaking_point'
                    return (answers[questionId] || []).includes(option.value)
                  } else if (question.id === 'demographics') {
                    const field = demographicStep === 'age' ? 'age' : 'job'
                    return answers.demographics?.[field] === option.value
                  } else {
                    return answers[question.id as keyof V2Answers] === option.value
                  }
                })()

                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    className={`p-3 sm:p-4 md:p-6 h-auto text-left justify-start text-wrap ${
                      isSelected 
                        ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-lg transform scale-105" 
                        : "hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 hover:border-green-300"
                    } transition-all duration-200`}
                    onClick={() => {
                      if (question.type === 'multiple') {
                        handleMultipleSelect(option.value)
                      } else {
                        handleSingleSelect(option.value)
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      {option.emoji && <span className="text-lg sm:text-xl md:text-2xl">{option.emoji}</span>}
                      <span className="text-sm sm:text-base md:text-lg font-medium">{option.label}</span>
                    </div>
                  </Button>
                )
              })}
            </div>

            {/* 複数選択の場合の次へボタン */}
            {question.type === 'multiple' && (
              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6 sm:mt-8">
                <Button
                  variant="ghost"
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 w-full sm:w-auto order-2 sm:order-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  戻る
                </Button>
                
                <Button
                  onClick={nextQuestion}
                  disabled={!canProceedMultiple()}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold w-full sm:w-auto order-1 sm:order-2 py-3"
                >
                  次へ
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* 人口統計学的質問での戻るボタン */}
            {question.id === 'demographics' && demographicStep === 'job' && (
              <div className="flex justify-start mt-6 sm:mt-8">
                <Button
                  variant="ghost"
                  onClick={prevQuestion}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  年代選択に戻る
                </Button>
              </div>
            )}

            {/* 通常の戻るボタン */}
            {question.type === 'single' && question.id !== 'demographics' && (
              <div className="flex justify-start mt-6 sm:mt-8">
                <Button
                  variant="ghost"
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <ArrowLeft className="w-4 h-4" />
                  戻る
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}