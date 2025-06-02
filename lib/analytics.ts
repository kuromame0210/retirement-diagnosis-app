// src/lib/analytics.ts
export const trackEvent = (
    action: string,
    params?: Record<string, any>
  ) => {
    if (typeof window === 'undefined') return   // SSR では何もしない
    if (!(window as any).gtag) return           // gtag 未ロード
  
    ;(window as any).gtag('event', action, params)
  }
  