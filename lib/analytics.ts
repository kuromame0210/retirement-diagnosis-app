import { getSession, syncSessionToServer } from "@/lib/storage"

// デバウンス用のタイマー
let syncDebounceTimer: NodeJS.Timeout | null = null

// アナリティクスイベント名の対応表（日本語→英語）
const EVENT_NAME_MAP: Record<string, string> = {
  // 診断開始
  '診断開始_V1': 'start_diagnosis',
  '診断開始_V2': 'start_diagnosis_v2',
  '診断開始_V3': 'start_diagnosis_v3',
  '診断再開_V3': 'resume_diagnosis_v3',
  
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
  
  // V3診断関連
  'V3質問回答_Q1': 'v3_question_answered_q1',
  'V3質問回答_Q2': 'v3_question_answered_q2',
  'V3質問回答_Q3': 'v3_question_answered_q3',
  'V3質問回答_Q4': 'v3_question_answered_q4',
  'V3質問回答_Q5': 'v3_question_answered_q5',
  'V3質問回答_Q6': 'v3_question_answered_q6',
  'V3質問回答_Q7': 'v3_question_answered_q7',
  'V3質問回答_Q8': 'v3_question_answered_q8',
  'V3質問回答_Q9': 'v3_question_answered_q9',
  'V3質問回答_Q10': 'v3_question_answered_q10',
  'V3途中診断実行': 'v3_partial_diagnosis_executed',
  'V3最終診断実行': 'v3_final_diagnosis_executed',
  'V3診断継続': 'v3_continue_diagnosis',
  'V3サービスクリック': 'v3_service_click',
  
  // 最終診断完了とサービスクリック
  '最終診断完了_サービスクリック': 'final_serve_a',
  'V2最終診断完了_サービスクリック': 'final_serve_a_v2',
  'V3最終診断完了_サービスクリック': 'final_serve_a_v3',
  'V3途中診断完了_サービスクリック': 'partial_serve_a_v3',
  
  // ステップ関連
  'ステップクリック': 'step_click',
  
  // その他
  'ページビュー': 'page_view',
}

// サービスIDを含むイベント名を生成
export const createServiceClickEvent = (
  serviceId: string, 
  serviceName: string, 
  version: 'v1' | 'v2' | 'v3' = 'v1',
  diagnosisStage?: string
): string => {
  let prefix: string
  
  if (version === 'v3') {
    // V3では途中診断と最終診断を区別
    prefix = diagnosisStage?.startsWith('partial_') 
      ? 'V3途中診断完了_サービスクリック'
      : 'V3最終診断完了_サービスクリック'
  } else if (version === 'v2') {
    prefix = 'V2最終診断完了_サービスクリック'
  } else {
    prefix = '最終診断完了_サービスクリック'
  }
  
  return `${prefix}_${serviceId}_${serviceName.replace(/[^a-zA-Z0-9\u3040-\u3096\u30A0-\u30FC\u4E00-\u9FAF]/g, '')}`
}

// src/lib/analytics.ts
export const trackEvent = (
    action: string,
    params?: Record<string, any>
  ) => {

    // わかりやすい日本語名から英語名に変換
    const englishAction = EVENT_NAME_MAP[action] || action
    

    /* === GA4 === */
    if (typeof window === 'undefined') return   // SSR では何もしない
    if (!(window as any).gtag) return           // gtag 未ロード

    ;(window as any).gtag('event', englishAction, params)

    /* ========= Supabase UPSERT（デバウンス付き） - V1/V2/V3振り分け ========= */
    // 診断バージョンを判定
    const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
    
    const isV3Event = typeof window !== 'undefined' && (
      pathname.startsWith('/v3') || 
      action.includes('v3') || 
      action.includes('V3') ||
      params?.version === 'v3'
    )
    
    const isV2Event = typeof window !== 'undefined' && (
      pathname.startsWith('/v2') || 
      action.includes('v2') || 
      action.includes('V2') ||
      params?.version === 'v2'
    )
    

    if (isV3Event) {
      /* ========= V3セッション同期 ========= */
      
      try {
        // V3セッション同期を非同期で実行
        import('@/lib/v3/session').then(({ syncV3SessionToServer, getV3Session }) => {
          const v3Session = getV3Session()
          console.log("📊 [V3 Analytics] セッション情報:", { 
            action, 
            userId: v3Session.userId,
            sessionId: v3Session.sessionId,
            currentStep: v3Session.currentStep,
            completedQuestions: v3Session.completedQuestions
          })
          
          // V3同期実行
          syncV3SessionToServer()
            .catch((e) => console.warn("❌ [V3 Analytics] セッション同期失敗:", e))
        }).catch((e) => console.warn("❌ [V3 Analytics] セッション取得失敗:", e))
        
      } catch (e) {
        console.warn("❌ [V3 Analytics] V3処理失敗:", e)
      }
      
      return // V3イベントの場合はここで終了、V1/V2処理をスキップ
      
    } else if (isV2Event) {
      /* ========= V2セッション同期 ========= */
      
      try {
        // V2セッション同期を非同期で実行
        import('@/lib/v2/session').then(({ syncV2SessionToServer, getV2Session }) => {
          const v2Session = getV2Session()
          console.log("📊 [V2 Analytics] セッション情報:", { 
            action, 
            userId: v2Session.userId,
            currentStep: v2Session.currentStep
          })
          
          // V2同期実行
          syncV2SessionToServer()
            .catch((e) => console.warn("❌ [V2 Analytics] セッション同期失敗:", e))
        }).catch((e) => console.warn("❌ [V2 Analytics] セッション取得失敗:", e))
        
      } catch (e) {
        console.warn("❌ [V2 Analytics] V2処理失敗:", e)
      }
      
      return // V2イベントの場合はここで終了、V1処理をスキップ
      
    } else {
      /* ========= V1セッション同期（既存処理） ========= */
      
      try {
        const session = getSession()                     // localStorage の最新

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
        console.warn("trackEvent: V1 getSession failed", e)
      }
    }

  }