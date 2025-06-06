export const STORAGE_KEY = "diagnosis_session"

export interface DiagnosisSession {
  sessionId: string
  userId: string
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
  clickedServices: Array<{
    id: string
    name: string
    url: string
    clickedAt: string
  }>
  startedAt: string
  updatedAt: string
  completedAt?: string
}

/* 追加：サービスクリックを追記する関数 */
export function addClickedService(service: {
  id: string
  name: string
  url: string
}) {
  if (typeof window === "undefined") return

  console.log("addClickedServiceのsession:", {service})

  try {
    /* ① いまのセッションを取得 */
    const session = getSession()

    console.log("sessionがあった:", {session})

    console.log("session.clickedServices:", session?.clickedServices)

    if(session?.clickedServices && session?.clickedServices.length > 0) {
      console.log("session.clickedServicesがあった:", session?.clickedServices)
      /* ② すでに同じ ID があればスキップ */
      const duplicated = session?.clickedServices.some(
        (s) => {
          console.log("s:", {s})
          return s.id === service.id
        }
      )
      if (duplicated) {
        console.log("duplicated:", {duplicated})
        return
      }
    }
    console.log("session.clickedServicesがなかった:", session?.clickedServices)

    /* ③ クリック履歴を作成 */
    const nextClicked = 
      session?.clickedServices ? [
        ...(session?.clickedServices ),
        { ...service, clickedAt: new Date().toISOString() },
      ] : [
        { ...service, clickedAt: new Date().toISOString() },
      ]
    console.log("nextClicked",{nextClicked})

    /* ④ セッションを上書き保存（ほかのプロパティは保持） */
    saveSession({
      ...session,
      clickedServices: nextClicked,
    })
  } catch (e) {
    console.warn("addClickedService error", e)
  }
}

export const saveSession = (data: Partial<DiagnosisSession>) => {
  if (typeof window === "undefined") return
  try {
    const updated = {
      ...getSession(),
      ...data,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    console.log("saveSession", {updated})
    /* 追加：保存したら即同期 */
    syncSessionToServer().catch(() => {})
  } catch (e) {
    console.error("Failed to save session:", e)
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
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  currentStep: 1,
  basicAnswers: {},
  textInput: "",
  chatHistory: [],
  simpleResult: null,
  finalResult: null,
  clickedServices: [],
  startedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

/* サーバーへ非同期同期  ------------------------------ */
export async function syncSessionToServer() {
  if (typeof window === "undefined") return
  try {
    console.log("syncSessionToServer")
    const session = getSession()
    /* keepalive 付き POST：ページ遷移中でも完走しやすい */
    await fetch("/api/save-diagnosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
      keepalive: true,
    })
  } catch (err) {
    console.warn("syncSessionToServer failed", err)
  }
}