import { getSession, syncSessionToServer } from "@/lib/storage"

// デバウンス用のタイマー
let syncDebounceTimer: NodeJS.Timeout | null = null

// src/lib/analytics.ts
export const trackEvent = (
    action: string,
    params?: Record<string, any>
  ) => {

    /* === GA4 === */
    if (typeof window === 'undefined') return   // SSR では何もしない
    if (!(window as any).gtag) return           // gtag 未ロード

    ;(window as any).gtag('event', action, params)

    /* ========= Supabase UPSERT（デバウンス付き） ========= */
    try {
      const session = getSession()                     // localStorage の最新
      console.log("[trackEvent] send", { action, session })

      // 既存のタイマーをクリア
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer)
      }

      // 100ms後に同期実行（高頻度クリックを防ぐ）
      syncDebounceTimer = setTimeout(() => {
        syncSessionToServer()
          .catch((e) => console.warn("syncSessionToServer failed", e))
          .finally(() => {
            syncDebounceTimer = null
          })
      }, 100)

    } catch (e) {
      console.warn("trackEvent: getSession failed", e)
    }

  }