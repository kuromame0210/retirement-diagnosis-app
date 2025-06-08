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

/* --- 2. saveSession を簡潔に -------------------- */
export const saveSession = (patch: Partial<DiagnosisSession>) => {
  if (typeof window === 'undefined') return

  const current = getSession()                // 必ず userId を含む
  const updated = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  // syncSessionToServer(updated).catch(console.warn)
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
let ongoingSyncPromise: Promise<void> | null = null

export async function syncSessionToServer() {
  if (typeof window === "undefined") return
  
  // 既に同期処理中の場合は、その処理の完了を待つ
  if (ongoingSyncPromise) {
    console.log("syncSessionToServer: already in progress, waiting...")
    return ongoingSyncPromise
  }
  
  try {
    console.log("syncSessionToServer: starting new sync")
    const session = getSession()
    
    ongoingSyncPromise = fetch("/api/save-diagnosis", {
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session }),
      keepalive: true,
    }).then(() => {
      console.log("syncSessionToServer: completed successfully")
    })
    
    await ongoingSyncPromise
  } catch (err) {
    console.warn("syncSessionToServer failed", err)
  } finally {
    ongoingSyncPromise = null
  }
}