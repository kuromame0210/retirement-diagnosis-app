export const STORAGE_KEY = "diagnosis_session"

export interface DiagnosisSession {
  sessionId: string
  currentStep: number
  basicAnswers: Record<string, string>
  textInput: string
  chatHistory: Array<{
    question: string
    answer: string
    intent?: string
  }>
  simpleResult: any
  finalResult: any
  startedAt: string
  updatedAt: string
  completedAt?: string
}

export const saveSession = (data: Partial<DiagnosisSession>) => {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...data,
        updatedAt: new Date().toISOString(),
      }),
    )
  } catch (error) {
    console.error("Failed to save session:", error)
  }
}

export const getSession = (): DiagnosisSession => {
  if (typeof window === "undefined") {
    return createNewSession()
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : createNewSession()
  } catch (error) {
    console.error("Failed to get session:", error)
    return createNewSession()
  }
}

export const clearSession = () => {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear session:", error)
  }
}

const createNewSession = (): DiagnosisSession => ({
  sessionId: crypto.randomUUID(),
  currentStep: 1,
  basicAnswers: {},
  textInput: "",
  chatHistory: [],
  simpleResult: null,
  finalResult: null,
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})
