import { getSession, syncSessionToServer } from "@/lib/storage"

// デバウンス用のタイマー
let syncDebounceTimer: NodeJS.Timeout | null = null

// アナリティクスイベント名の対応表（日本語→英語）
const EVENT_NAME_MAP: Record<string, string> = {
  // 診断開始
  '診断開始_V1': 'start_diagnosis',
  '診断開始_V2': 'start_diagnosis_v2',
  
  // サービス関連
  'サービス詳細クリック': 'service_detail_click',
  'サービスタイトルクリック': 'service_title_click',
  'サービスボタンクリック': 'service_button_click',
  'サービスカードクリック': 'service_card_click',
  
  // V2サービス関連
  'V2サービス詳細クリック': 'v2_service_detail_click',
  'V2サービスタイトルクリック': 'v2_service_title_click',
  'V2サービスボタンクリック': 'v2_service_button_click',
  'V2サービスカードクリック': 'v2_service_card_click',
  
  // 最終診断完了とサービスクリック
  '最終診断完了_サービスクリック': 'final_serve_a',
  'V2最終診断完了_サービスクリック': 'final_serve_a_v2',
  
  // ステップ関連
  'ステップクリック': 'step_click',
  
  // その他
  'ページビュー': 'page_view',
}

// サービスIDを含むイベント名を生成
export const createServiceClickEvent = (
  serviceId: string, 
  serviceName: string, 
  version: 'v1' | 'v2' = 'v1'
): string => {
  const prefix = version === 'v2' ? 'V2最終診断完了_サービスクリック' : '最終診断完了_サービスクリック'
  return `${prefix}_${serviceId}_${serviceName.replace(/[^a-zA-Z0-9\u3040-\u3096\u30A0-\u30FC\u4E00-\u9FAF]/g, '')}`
}

// src/lib/analytics.ts
export const trackEvent = (
    action: string,
    params?: Record<string, any>
  ) => {

    // わかりやすい日本語名から英語名に変換
    const englishAction = EVENT_NAME_MAP[action] || action
    
    // デバッグ用ログ（日本語名も表示）
    console.log(`[Analytics] ${action}${action !== englishAction ? ` → ${englishAction}` : ''}`, params)

    /* === GA4 === */
    if (typeof window === 'undefined') return   // SSR では何もしない
    if (!(window as any).gtag) return           // gtag 未ロード

    ;(window as any).gtag('event', englishAction, params)

    /* ========= Supabase UPSERT（デバウンス付き） - V1のみ ========= */
    // V2診断関連のイベントはV1のセッション同期をスキップ
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    const actionIncludesV2 = action.includes('v2') || action.includes('V2')
    const paramsVersionV2 = params?.version === 'v2'
    const pathStartsWithV2 = pathname.startsWith('/v2')
    
    const isV2Event = typeof window !== 'undefined' && (
      pathStartsWithV2 || 
      actionIncludesV2 || 
      paramsVersionV2
    )
    
    console.log("[trackEvent] V2判定デバッグ:", {
      action,
      pathname,
      actionIncludesV2,
      paramsVersionV2,
      pathStartsWithV2,
      isV2Event
    })
    
    if (isV2Event) {
      console.log("[trackEvent] V2イベントのため、V1セッション同期をスキップ:", action)
      return
    }

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