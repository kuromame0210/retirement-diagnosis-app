/**
 * 正確な日本時間（JST）タイムスタンプ取得ユーティリティ
 * 二重タイムゾーン変換を回避し、常に正確なJSTを返す
 */

/**
 * 正確なJSTタイムスタンプを取得
 * システムのタイムゾーンに関係なく、常に正確な日本時間を返す
 */
export const getJSTTimestamp = (): string => {
  const now = new Date()
  
  // Intl.DateTimeFormat を使用してより正確なJST変換
  const formatter = new Intl.DateTimeFormat('sv-SE', { 
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  const parts = formatter.formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value  
  const day = parts.find(p => p.type === 'day')?.value
  const hour = parts.find(p => p.type === 'hour')?.value
  const minute = parts.find(p => p.type === 'minute')?.value
  const second = parts.find(p => p.type === 'second')?.value
  
  // ISO形式で組み立て（ミリ秒も保持）
  const jstISOString = `${year}-${month}-${day}T${hour}:${minute}:${second}.${now.getMilliseconds().toString().padStart(3, '0')}Z`
  
  // デバッグ用ログ（本番環境では削除可能）
  if (process.env.NODE_ENV === 'development') {
    console.log("🕐 JST Timestamp:", {
      original_utc: now.toISOString(),
      jst_converted: jstISOString,
      system_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      check_jst: now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    })
  }
  
  return jstISOString
}

/**
 * PostgreSQL/Supabase用のJSTタイムスタンプ
 * timestamptz型に保存する場合はUTCで保存し、表示時にJST変換する
 */
export const getUTCTimestamp = (): string => {
  return new Date().toISOString()
}

/**
 * PostgreSQL側でJSTに変換するSQL関数
 */
export const getJSTTimestampSQL = (): string => {
  return `timezone('Asia/Tokyo', now())`
}