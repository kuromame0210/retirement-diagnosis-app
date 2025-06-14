/**
 * V2診断データベース保存ユーティリティ
 * 統一されたV2診断データ保存処理
 */

interface V2SaveData {
  answers?: any
  result?: any
  clickedServices?: any[]
  userAgent?: string
  prefecture?: string
  currentStep?: number
  updateType?: 'full' | 'click_history_only' | 'diagnosis_completed' | 'result_completed' | 'diagnosis_started' | 'session_update'
}

/**
 * V2診断データを保存する統一関数
 * セッション管理、既存レコード確認、適切なCRUD操作を自動判定
 */
export async function saveV2DiagnosisData(data: V2SaveData): Promise<{
  success: boolean
  id?: string
  message?: string
  error?: string
}> {
  try {
    // セッションIDの取得または生成（既存がある場合は必ず使用）
    let sessionId = sessionStorage.getItem('v2_session_id')
    
    // 既存セッションIDがない場合のみ新規生成
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('v2_session_id', sessionId)
    }

    // データベースに既存レコードがあるかチェック
    let recordExists = false
    try {
      const existsResponse = await fetch('/api/save-v2-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          checkOnly: true // 存在確認のみのフラグ
        })
      })

      if (existsResponse.ok) {
        const existsResult = await existsResponse.json()
        recordExists = existsResult.exists
      } else {
        recordExists = false
      }
    } catch (error) {
      recordExists = false
    }

    // 保存データを構築
    const savePayload = {
      sessionId,
      answers: data.answers || null,
      result: data.result || null,
      clickedServices: data.clickedServices || [],
      userAgent: data.userAgent || navigator.userAgent,
      prefecture: data.prefecture || null,
      currentStep: data.currentStep || null, // ステップ情報を追加
      updateType: data.updateType || 'full',
      isUpdate: recordExists // 既存レコードの有無を明示
    }

    // データベース保存実行（リトライ機能付き）
    let lastError: string = ''
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch('/api/save-v2-diagnosis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload)
        })

        if (response.ok) {
          const result = await response.json()
          
          return {
            success: true,
            id: result.id,
            message: result.message || 'データを正常に保存しました'
          }
        } else {
          const errorText = await response.text()
          lastError = `${response.status} - ${errorText}`
          console.error(`❌ V2診断データ保存失敗 (試行${attempt}):`, lastError)
          
          // 初回失敗時は新規作成で再試行
          if (attempt === 1 && savePayload.isUpdate) {
            savePayload.isUpdate = false
          }
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : '不明なエラー'
        console.error(`❌ V2診断データ保存例外 (試行${attempt}):`, lastError)
      }
    }
    
    // 全試行失敗
    return {
      success: false,
      error: `保存失敗 (2回試行): ${lastError}`
    }

  } catch (error) {
    console.error("V2診断保存処理でエラー:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラーが発生しました'
    }
  }
}

/**
 * 診断完了時の保存（診断ページから呼び出し）
 */
export async function saveV2DiagnosisCompleted(answers: any): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  console.log("診断完了時の保存開始")
  
  const result = await saveV2DiagnosisData({
    answers,
    updateType: 'diagnosis_completed'
  })

  return result
}

/**
 * 結果分析完了時の保存（結果ページから呼び出し）
 */
export async function saveV2ResultCompleted(answers: any, result: any): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  console.log("結果分析完了時の保存開始")
  
  const saveResult = await saveV2DiagnosisData({
    answers,
    result,
    updateType: 'result_completed'
  })

  return saveResult
}

/**
 * サービスクリック履歴のみの更新
 */
export async function saveV2ClickHistory(clickedServices: any[]): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  console.log("クリック履歴のみの更新開始")
  
  const result = await saveV2DiagnosisData({
    clickedServices,
    updateType: 'click_history_only'
  })

  return result
}

/**
 * セッションIDを取得（存在しない場合は生成）
 */
export function getOrCreateV2SessionId(): string {
  let sessionId = sessionStorage.getItem('v2_session_id')
  
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    sessionStorage.setItem('v2_session_id', sessionId)
    console.log("新規V2セッションID生成:", sessionId)
  } else {
    console.log("既存V2セッションID取得:", sessionId)
  }
  
  return sessionId
}

/**
 * V2診断セッションをクリア（新規診断開始時）
 */
export function clearV2Session(): void {
  console.log("V2セッションクリア開始")
  
  const keysToRemove = [
    'v2_session_id',
    'v2_answers', 
    'v2_result',
    'v2_clicked_services'
  ]
  
  keysToRemove.forEach(key => {
    sessionStorage.removeItem(key)
    console.log("クリア:", key)
  })
  
  // 保存フラグもクリア
  const allKeys = Object.keys(sessionStorage)
  allKeys.forEach(key => {
    if (key.startsWith('v2_saved_')) {
      sessionStorage.removeItem(key)
      console.log("保存フラグクリア:", key)
    }
  })
  
  console.log("V2セッションクリア完了")
}