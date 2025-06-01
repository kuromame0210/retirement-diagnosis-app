"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { saveSession, getSession } from "@/lib/storage"

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
    const sessionData = getSession()
    setSession(sessionData)
    setAnswers(sessionData.basicAnswers || {})
  }, [])

  const handleAnswer = (value: string) => {
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
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">基本診断</h1>
          <span className="text-sm text-gray-500">
            {currentQuestion + 1} / {questions.length}
          </span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{questions[currentQuestion].question}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[questions[currentQuestion].id] || ""}
            onValueChange={handleAnswer}
            className="space-y-3"
          >
            {questions[currentQuestion].options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={prevQuestion} disabled={currentQuestion === 0}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          前の質問
        </Button>

        <Button onClick={nextQuestion} disabled={!answers[questions[currentQuestion].id]}>
          {currentQuestion === questions.length - 1 ? "結果を見る" : "次の質問"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
