"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react"
import { saveSession, getSession } from "@/lib/storage"
import { trackEvent } from "@/lib/analytics"

const questions = [
  {
    id: "q1",
    question: "今の仕事について、正直どう思いますか？",
    options: [
      { value: "quit", label: "辞めたい" },
      { value: "continue", label: "続けたい" },
      { value: "unsure", label: "わからない・どちらでもない" },
      { value: "never_thought", label: "考えたことがない" },
    ],
  },
  {
    id: "q2",
    question: "その気持ちになったのは、いつ頃からですか？",
    options: [
      { value: "recent", label: "最近（1-3ヶ月以内）" },
      { value: "half_year", label: "半年〜1年前から" },
      { value: "long_ago", label: "もっと前から" },
      { value: "always", label: "覚えていない・ずっと" },
    ],
  },
  {
    id: "q3",
    question: "平日の夜や休日に、仕事のことが頭から離れない頻度は？",
    options: [
      { value: "daily", label: "ほぼ毎日" },
      { value: "few_times_week", label: "週に数回" },
      { value: "sometimes", label: "たまに" },
      { value: "rarely", label: "ほとんどない" },
    ],
  },
  {
    id: "q4",
    question: "今の職場で一番のストレス要因は？",
    options: [
      { value: "relationships", label: "上司・同僚との人間関係" },
      { value: "workload", label: "業務量・労働時間" },
      { value: "content", label: "仕事内容・やりがい" },
      { value: "future", label: "将来への不安" },
    ],
  },
  {
    id: "q5",
    question: "もし辞めるとしたら、一番の不安は？",
    options: [
      { value: "financial", label: "経済的な不安" },
      { value: "job_search", label: "次の仕事が見つかるか" },
      { value: "others", label: "周囲に迷惑をかけること" },
      { value: "no_anxiety", label: "特に不安はない" },
    ],
  },
]

export default function BasicDiagnosisPage() {
  const router = useRouter()
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    console.log("basic/page: useEffect started")
    const sessionData = getSession()
    console.log("basic/page: session loaded:", sessionData.userId)
    setSession(sessionData)
    setAnswers(sessionData.basicAnswers || {})
  }, [])

  const handleAnswerClick = (value: string) => {
    console.log("Answer clicked:", value)
    
    // 現在の質問情報を保存（画面遷移後も正しい値でトラッキングするため）
    const currentQuestionId = questions[currentQuestion].id
    const currentStep = currentQuestion + 1
    
    const newAnswers = {
      ...answers,
      [currentQuestionId]: value,
    }
    
    // 1. 即座にローカル状態を更新
    setAnswers(newAnswers)

    const updatedSession = {
      ...session,
      basicAnswers: newAnswers,
      currentStep: 2,
    }
    setSession(updatedSession)

    // 2. 先に画面遷移を実行
    nextQuestion()

    // 3. 裏側で非同期でデータ保存とトラッキングを実行（ユーザーはブロックされない）
    Promise.all([
      // saveSessionを非同期で実行
      Promise.resolve().then(() => {
        try {
          saveSession(updatedSession)
          console.log("Background save completed")
        } catch (error) {
          console.warn("saveSession failed:", error)
        }
      }),
      // trackEventを非同期で実行
      Promise.resolve().then(() => {
        try {
          trackEvent('answer_selected', { 
            question: currentQuestionId,
            answer: value,
            step: currentStep
          })
          console.log("Background tracking completed")
        } catch (error) {
          console.warn("trackEvent failed:", error)
        }
      })
    ]).catch((error) => {
      console.warn("Background processing failed:", error)
    })
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      // 最後の質問でも即座に画面遷移
      router.push("/diagnosis/result")
      
      // トラッキングは裏側で非同期実行
      Promise.resolve().then(() => {
        try {
          trackEvent('complete_basic_diagnosis', { totalQuestions: questions.length })
          console.log("Background completion tracking completed")
        } catch (error) {
          console.warn("trackEvent for completion failed:", error)
        }
      }).catch((error) => {
        console.warn("Background completion processing failed:", error)
      })
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card className="border-0 shadow-2xl">
            <CardContent className="py-16 px-8">
              <div className="text-center">
                {/* メインアニメーション */}
                <div className="relative mb-8">
                  {/* 外側の回転リング */}
                  <div className="w-24 h-24 mx-auto relative">
                    <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-transparent border-t-purple-500 rounded-full animate-spin animate-reverse"></div>
                  </div>
                  
                  {/* 中央のアイコン */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center animate-pulse">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* タイトル */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    診断準備中
                  </span>
                </h2>
                
                {/* メッセージ */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <p className="text-gray-600 text-lg">診断を準備しています</p>
                  <p className="text-gray-500 text-sm">もうすぐ開始できます</p>
                </div>
                
                <p className="text-xs text-gray-400">
                  🔮 ヤメドキAI退職診断
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 text-purple-700 rounded-full text-sm font-medium mb-4 shadow-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              質問 {currentQuestion + 1} / {questions.length}
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              あなたのお話をお聞かせください
            </h1>
            <p className="text-gray-600 mt-2">正直にお答えください。AIがあなたに最適なアドバイスをします</p>
          </div>
          <Progress value={progress} className="w-full bg-gradient-to-r from-purple-200 to-pink-200" />
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-lg text-gray-900">{questions[currentQuestion].question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questions[currentQuestion].options.map((option) => {
                const isSelected = answers[questions[currentQuestion].id] === option.value
                return (
                  <Button
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    className={`w-full p-4 h-auto text-left justify-start transition-colors duration-150 rounded-lg ${
                      isSelected 
                        ? "bg-blue-500 text-white border-0 shadow-md" 
                        : "bg-white text-gray-700 border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                    onClick={() => handleAnswerClick(option.value)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected 
                          ? "border-white bg-white" 
                          : "border-gray-400"
                      }`}>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <span className="text-base font-medium">{option.label}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            className="px-6 py-3 rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            onClick={
              () => {
                trackEvent('prev_question', { step: currentQuestion })
                prevQuestion()
              }
            } 
            disabled={currentQuestion === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            前の質問
          </Button>

          {/* 回答済みの場合のみ次の質問ボタンを表示 */}
          {answers[questions[currentQuestion].id] && (
            <Button 
              className="px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              onClick={() => {
                trackEvent('skip_to_next', { step: currentQuestion })
                nextQuestion()
              }}
            >
              {currentQuestion === questions.length - 1 ? "結果を見る" : "次の質問"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {/* 未回答の場合は選択を促すメッセージ */}
          {!answers[questions[currentQuestion].id] && (
            <div className="text-sm text-gray-600 flex items-center">
              選択肢をクリックすると自動で次に進みます
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
