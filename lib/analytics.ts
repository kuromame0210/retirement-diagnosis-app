import { getSession, syncSessionToServer } from "@/lib/storage"


// src/lib/analytics.ts
export const trackEvent = (
    action: string,
    params?: Record<string, any>
  ) => {

    /* === GA4 === */
    if (typeof window === 'undefined') return   // SSR では何もしない
    if (!(window as any).gtag) return           // gtag 未ロード

    ;(window as any).gtag('event', action, params)

    /* ========= Supabase UPSERT ========= */
    try {
      const session = getSession()                     // localStorage の最新
      console.log("[trackEvent] send", { action, session })

      // 非同期で送信（失敗しても UI を止めない）
      syncSessionToServer()
        .catch((e) => console.warn("syncSessionToServer failed", e))
    } catch (e) {
      console.warn("trackEvent: getSession failed", e)
    }

  }