"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Loader2, ArrowRight, MessageCircle, AlertTriangle } from "lucide-react"
import { getSession, saveSession } from "@/lib/storage"

interface ChatMessage {
  question: string
  answer: string
  intent?: string
}

interface ChatState {
  currentQuestionIndex: number
  isInitialized: boolean
  isGeneratingQuestion: boolean
  currentQuestion: string
  error: string | null
}

export default function ChatPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [textAnalysis, setTextAnalysis] = useState<any>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [state, setState] = useState<ChatState>({
    currentQuestionIndex: 0,
    isInitialized: false,
    isGeneratingQuestion: false,
    currentQuestion: "",
    error: null,
  })
  const [questionCount, setQuestionCount] = useState(0)
  const [loading, setLoading] = useState(false)

  // デバッグ用ログ関数
  const debugLog = useCallback(
    (action: string, data: any = {}) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`[ChatPage] ${action}:`, {
          currentQuestionIndex: state.currentQuestionIndex,
          chatHistoryLength: chatHistory.length,
          isGeneratingQuestion: state.isGeneratingQuestion,
          isInitialized: state.isInitialized,
          ...data,
        })
      }
    },
    [state.currentQuestionIndex, chatHistory.length, state.isGeneratingQuestion, state.isInitialized],
  )

  // テキスト分析を実行
  const performTextAnalysis = useCallback(
    async (sessionData: any) => {
      debugLog("performTextAnalysis start")
      try {
        const response = await fetch("/api/analyze-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            basicResult: sessionData.simpleResult,
            textInput: sessionData.textInput,
          }),
        })

        if (!response.ok) throw new Error("テキスト分析に失敗しました")

        const analysis = await response.json()
        debugLog("performTextAnalysis success", { analysis })
        return analysis
      } catch (err) {
        debugLog("performTextAnalysis error", { error: err.message })
        throw err
      }
    },
    [debugLog],
  )

  // 質問生成の統一関数
  const generateQuestion = useCallback(
    async (questionIndex: number, sessionData: any) => {
      if (state.isGeneratingQuestion) {
        debugLog("generateQuestion skipped - already generating")
        return
      }

      debugLog("generateQuestion start", { questionIndex })

      // ✅ 追加：送信データの詳細ログ
      console.log("=== API送信データ確認 ===")
      console.log("sessionData:", sessionData)
      console.log("sessionData.basicAnswers:", sessionData.basicAnswers)
      console.log("sessionData.chatHistory:", sessionData.chatHistory)
      console.log("questionIndex:", questionIndex, "type:", typeof questionIndex)

      setState((prev) => ({
        ...prev,
        isGeneratingQuestion: true,
        error: null,
      }))

      try {
        // テキスト分析が必要で未実行の場合（最初の質問のみ）
        let analysis = textAnalysis
        if (questionIndex === 1 && !analysis && sessionData.textInput) {
          debugLog("performing text analysis")
          analysis = await performTextAnalysis(sessionData)
          setTextAnalysis(analysis)
        }

        // ✅ 重複防止：既に生成済みの質問かチェック
        const existingQuestions = sessionData.chatHistory?.map(chat => chat.question) || []

        // ✅ 追加：送信する実際のデータをログ出力
        const requestData = {
          chatHistory: sessionData.chatHistory || [],
          textAnalysis: analysis,
          basicAnswers: sessionData.basicAnswers,
          questionCount: questionIndex,
          existingQuestions: existingQuestions,
        }

        console.log("=== 実際の送信データ ===")
        console.log("requestData:", requestData)
        console.log("basicAnswers存在:", !!requestData.basicAnswers)
        console.log("questionCount:", requestData.questionCount, "type:", typeof requestData.questionCount)

        const response = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        })

        console.log("API Response Status:", response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("API Error Response:", errorText)
          throw new Error("質問生成に失敗しました")
        }

        const result = await response.json()

        if (!result.question) {
          throw new Error("質問が生成されませんでした")
        }

        // ✅ 重複チェック
        if (existingQuestions.includes(result.question)) {
          throw new Error("重複した質問が生成されました")
        }

        debugLog("generateQuestion success", { question: result.question })

        setState((prev) => ({
          ...prev,
          currentQuestion: result.question,
          currentQuestionIndex: questionIndex,
          isGeneratingQuestion: false,
        }))
      } catch (err) {
        debugLog("generateQuestion error", { error: err.message })
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "質問生成中にエラーが発生しました",
          isGeneratingQuestion: false,
        }))
      }
    },
    [state.isGeneratingQuestion, textAnalysis, performTextAnalysis, debugLog],
  )



  const initializeChat = useCallback(async () => {
    if (state.isInitialized) {
      debugLog("initializeChat skipped - already initialized")
      return
    }

    debugLog("initializeChat start")
    setState((prev) => ({ ...prev, isInitialized: true }))

    const sessionData = getSession()

    // ✅ 非常に詳細なデバッグ
    console.log("=== セッションデータ超詳細確認 ===")
    console.log("sessionData:", sessionData)
    console.log("sessionData type:", typeof sessionData)

    // ✅ ローカルストレージの直接確認
    const rawStorage = localStorage.getItem('diagnosis-session')
    console.log("ローカルストレージの生データ:", rawStorage)

    if (sessionData) {
      console.log("セッション内のキー一覧:", Object.keys(sessionData))
      console.log("currentStep:", sessionData.currentStep)
      console.log("basicAnswers存在:", 'basicAnswers' in sessionData)
      console.log("basicAnswers値:", sessionData.basicAnswers)
      console.log("simpleResult存在:", 'simpleResult' in sessionData)
      console.log("textInput存在:", 'textInput' in sessionData)
    }

    // ✅ 条件チェックを段階的に
    if (!sessionData) {
      console.error("❌ sessionDataがnull/undefined")
      setState((prev) => ({
        ...prev,
        error: "セッションデータが見つかりません",
        isGeneratingQuestion: false,
      }))
      return
    }

    if (!('basicAnswers' in sessionData)) {
      console.error("❌ basicAnswersプロパティが存在しません")
      console.log("利用可能なプロパティ:", Object.keys(sessionData))
      setState((prev) => ({
        ...prev,
        error: "基本診断データがありません。簡単診断から始めてください。",
        isGeneratingQuestion: false,
      }))
      return
    }

    if (!sessionData.basicAnswers || Object.keys(sessionData.basicAnswers).length === 0) {
      console.error("❌ basicAnswersが空です")
      console.log("basicAnswersの内容:", sessionData.basicAnswers)
      setState((prev) => ({
        ...prev,
        error: "基本診断が未完了です。簡単診断から始めてください。",
        isGeneratingQuestion: false,
      }))
      return
    }

    console.log("✅ セッションデータ検証OK")
    setSession(sessionData)
    setChatHistory(sessionData.chatHistory || [])

    const nextQuestionIndex = (sessionData.chatHistory?.length || 0) + 1
    if (nextQuestionIndex <= 5) {
      await generateQuestion(nextQuestionIndex, sessionData)
    } else {
      router.push("/diagnosis/final")
    }
  }, [])


  // 初期化用useEffect（一度だけ実行）
  useEffect(() => {
    console.log("=== useEffect開始 ===")

    if (!state.isInitialized) {
      console.log("初期化を開始します")
      initializeChat()
    }
  }, [])



  // 回答送信処理
  const submitAnswer = useCallback(async () => {
    if (!currentAnswer.trim() || state.isGeneratingQuestion) {
      debugLog("submitAnswer skipped", {
        hasAnswer: !!currentAnswer.trim(),
        isGenerating: state.isGeneratingQuestion,
      })
      return
    }

    debugLog("submitAnswer start")

    const newChatEntry: ChatMessage = {
      question: state.currentQuestion,
      answer: currentAnswer.trim(),
    }

    const updatedChatHistory = [...chatHistory, newChatEntry]
    const updatedSession = {
      ...session,
      chatHistory: updatedChatHistory,
      currentStep: 5,
    }

    // 状態を同期的に更新
    setChatHistory(updatedChatHistory)
    setSession(updatedSession)
    saveSession(updatedSession)
    setCurrentAnswer("")

    debugLog("submitAnswer - state updated", {
      newHistoryLength: updatedChatHistory.length,
    })

    if (updatedChatHistory.length >= 5) {
      debugLog("chat completed, redirecting to final")
      router.push("/diagnosis/final")
    } else {
      // 更新されたセッションデータを使用して次の質問を生成
      const nextQuestionIndex = updatedChatHistory.length + 1
      await generateQuestion(nextQuestionIndex, updatedSession)
    }
  }, [
    currentAnswer,
    state.isGeneratingQuestion,
    state.currentQuestion,
    chatHistory,
    session,
    router,
    generateQuestion,
    debugLog,
  ])

  // エラー再試行
  const retryGeneration = useCallback(() => {
    if (session) {
      // ✅ 修正：現在の質問インデックスを使用（実際の履歴長+1ではなく）
      const questionIndex = Math.max(1, chatHistory.length + 1)

      debugLog("retryGeneration", {
        questionIndex,
        currentQuestionIndex: state.currentQuestionIndex,
        chatHistoryLength: chatHistory.length
      })

      generateQuestion(questionIndex, session)
    }
  }, [session, chatHistory.length, state.currentQuestionIndex, generateQuestion, debugLog])


  const progress = (state.currentQuestionIndex / 5) * 100

  // 初期化中の表示
  if (!state.isInitialized) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>診断を準備中...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">AI問答</h1>
          <span className="text-sm text-gray-500">{state.currentQuestionIndex} / 5</span>
        </div>
        <Progress value={progress} className="w-full" />
        <p className="text-gray-600 mt-2">より詳細な分析のため、いくつか質問させていただきます</p>
      </div>

      {/* エラー表示 */}
      {state.error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{state.error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={retryGeneration} className="mt-2">
              再試行
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 過去の会話履歴 */}
      {chatHistory.length > 0 && (
        <div className="space-y-4 mb-6">
          {chatHistory.map((chat, index) => (
            <div key={index} className="space-y-2">
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    <MessageCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <p className="text-blue-800">{chat.question}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-gray-700">{chat.answer}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* 現在の質問 */}
      {state.currentQuestion && !state.error && !state.isGeneratingQuestion && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <span>質問 {state.currentQuestionIndex}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg mb-4">{state.currentQuestion}</p>
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="こちらにお答えください..."
              className="min-h-[120px]"
              disabled={state.isGeneratingQuestion}
            />
          </CardContent>
        </Card>
      )}

      {/* ローディング表示 */}
      {state.isGeneratingQuestion && !state.error && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>次の質問を準備中...</span>
        </div>
      )}

      {/* 回答ボタン */}
      {state.currentQuestion && !state.isGeneratingQuestion && !state.error && (
        <div className="flex justify-end">
          <Button onClick={submitAnswer} disabled={!currentAnswer.trim()} size="lg">
            {state.currentQuestionIndex >= 5 ? "最終結果を見る" : "回答する"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}
