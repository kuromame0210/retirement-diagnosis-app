"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight } from "lucide-react"
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
    const newAnswers = {
      ...answers,
      [questions[currentQuestion].id]: value,
    }
    setAnswers(newAnswers)

    const updatedSession = {
      ...session,
      basicAnswers: newAnswers,
      currentStep: 2,
    }
    setSession(updatedSession)
    saveSession(updatedSession)

    // trackEvent発火
    trackEvent('answer_selected', { 
      question: questions[currentQuestion].id,
      answer: value,
      step: currentQuestion + 1
    })

    // 少し遅延してから次の質問へ自動進行
    setTimeout(() => {
      nextQuestion()
    }, 300)
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      trackEvent('complete_basic_diagnosis', { totalQuestions: questions.length })
      router.push("/diagnosis/result")
    }
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const progress = ((currentQuestion + 1) / questions.length) * 100

  if (!session) return <div>Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">基本診断</h1>
            <span className="text-sm text-gray-600">
              {currentQuestion + 1} / {questions.length}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
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
                    className={`w-full p-4 h-auto text-left justify-start transition-all duration-200 rounded-lg ${
                      isSelected 
                        ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white border-0 shadow-lg transform scale-[1.02]" 
                        : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50 shadow-sm hover:shadow-md"
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
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
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
