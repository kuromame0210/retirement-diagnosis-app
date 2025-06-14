/**
 * V2診断専用のセッション管理
 * V1のstorage.tsと同じ思想でV2用に実装
 */

export const V2_STORAGE_KEY = "v2_diagnosis_session"

export interface V2DiagnosisSession {
  sessionId: string
  userId: string
  currentStep: number
  answers: Record<string, any>
  freeText: string
  clickedServices: Array<{
    id: string
    name: string
    url: string
    clickedAt: string
  }>
  result?: any
  startedAt: string
  updatedAt: string
  completedAt?: string
}

// 日本時間（JST）のタイムスタンプを取得する関数
export const getV2JSTTimestamp = (): string => {
  // 日本時間（JST = UTC+9）に変換
  const now = new Date()
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  return jstTime.toISOString()
}

/* V2セッションを取得 */
export const getV2Session = (): V2DiagnosisSession => {
  if (typeof window === "undefined") {
    return createNewV2Session()
  }

  try {
    const data = sessionStorage.getItem(V2_STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    } else {
      const newSession = createNewV2Session()
      sessionStorage.setItem(V2_STORAGE_KEY, JSON.stringify(newSession))
      return newSession
    }
  } catch (error) {
    console.error("Failed to get V2 session:", error)
    const newSession = createNewV2Session()
    sessionStorage.setItem(V2_STORAGE_KEY, JSON.stringify(newSession))
    return newSession
  }
}

/* V2セッションを保存 */
export const saveV2Session = (patch: Partial<V2DiagnosisSession>) => {
  if (typeof window === 'undefined') return Promise.resolve()

  const current = getV2Session()
  const updated = {
    ...current,
    ...patch,
    updatedAt: getV2JSTTimestamp(),
  }
  
  sessionStorage.setItem(V2_STORAGE_KEY, JSON.stringify(updated))
  
  // V2用データベース同期を非同期で実行
  return syncV2SessionToServer().catch(console.warn)
}

/* V2セッションをクリア */
export const clearV2Session = () => {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(V2_STORAGE_KEY)
    // V2関連の他のキーもクリア
    sessionStorage.removeItem('v2_session_id')
    sessionStorage.removeItem('v2_answers')
    sessionStorage.removeItem('v2_result')
    sessionStorage.removeItem('v2_clicked_services')
  } catch (error) {
    console.error("Failed to clear V2 session:", error)
  }
}

/* 新しいV2セッションを作成 */
const createNewV2Session = (): V2DiagnosisSession => ({
  userId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  currentStep: 1,
  answers: {},
  freeText: "",
  clickedServices: [],
  startedAt: getV2JSTTimestamp(),
  updatedAt: getV2JSTTimestamp(),
})

/* V2サービスクリックを追記する関数 */
export function addV2ClickedService(service: {
  id: string
  name: string
  url: string
}) {
  if (typeof window === "undefined") return

  try {
    const session = getV2Session()

    // 重複チェック
    const duplicated = session.clickedServices.some(s => s.id === service.id)
    if (duplicated) {
      return
    }

    // クリック履歴を追加
    const nextClicked = [
      ...session.clickedServices,
      { ...service, clickedAt: getV2JSTTimestamp() }
    ]

    console.log("🎯 [V2 Session Click]", {
      serviceName: service.name,
      serviceId: service.id,
      totalClicks: nextClicked.length,
      clickedAt: getV2JSTTimestamp()
    })

    // セッションを更新保存
    saveV2Session({
      clickedServices: nextClicked,
    })
  } catch (e) {
    console.warn("addV2ClickedService error", e)
  }
}

/* V2セッションをサーバーに同期 */
let ongoingV2SyncPromise: Promise<void> | null = null

export async function syncV2SessionToServer() {
  if (typeof window === "undefined") return
  
  // 既に同期処理中の場合は、その処理の完了を待つ
  if (ongoingV2SyncPromise) {
    console.log("syncV2SessionToServer: already in progress, waiting...")
    return ongoingV2SyncPromise
  }
  
  try {
    const session = getV2Session()
    
    // 統一されたV2保存関数を使用
    ongoingV2SyncPromise = (async () => {
      const { saveV2DiagnosisData } = await import('@/lib/v2/database')
      
      const result = await saveV2DiagnosisData({
        answers: session.answers,
        clickedServices: session.clickedServices,
        userAgent: navigator.userAgent,
        currentStep: session.currentStep, // ステップ情報を追加
        updateType: session.currentStep === 1 ? 'diagnosis_started' : 'session_update'
      })
      
      if (!result.success) {
        console.error("❌ [V2 DB Sync] データベース同期失敗:", result.error)
      }
    })()
    
    await ongoingV2SyncPromise
  } catch (err) {
    console.warn("syncV2SessionToServer failed", err)
  } finally {
    ongoingV2SyncPromise = null
  }
}