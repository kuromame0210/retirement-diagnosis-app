// src/lib/userId.ts
export interface StoredUid {
    uid: string           // 固定 UUID
    createdAt: string     // 生成日時
    lastVisit: string     // 最終アクセス日時（毎回上書き）
  }
  
  const KEY = 'career_diag_uid'
  
  /**
   * ① まだ UID がなければ生成して localStorage に保存
   * ② すでにあれば lastVisit だけ更新
   * ③ 返り値は常に現在の StoredUid オブジェクト
   */
  export function ensureUserId(): StoredUid {
    if (typeof window === 'undefined') {
      // SSR では処理しない
      return { uid: 'ssr', createdAt: '', lastVisit: '' }
    }
  
    const now = new Date().toISOString()
    let stored: StoredUid | null = null
  
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) stored = JSON.parse(raw) as StoredUid
    } catch {
      /* パース失敗時は再生成 */
    }
  
    if (!stored) {
      // 初回生成
      stored = {
        uid: crypto.randomUUID ? crypto.randomUUID() : generateFallbackUid(),
        createdAt: now,
        lastVisit: now,
      }
    } else {
      // 2回目以降: lastVisit を更新
      stored.lastVisit = now
    }
  
    localStorage.setItem(KEY, JSON.stringify(stored))
    return stored
  }
  
  /* 古いブラウザ向けフォールバック（簡易ランダム文字列） */
  function generateFallbackUid() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
  