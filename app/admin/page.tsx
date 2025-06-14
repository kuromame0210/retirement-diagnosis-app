export const dynamic = 'force-dynamic'   // これだけで常に最新
export const revalidate = 0                // キャッシュを完全無効化
export const fetchCache = 'force-no-store' // fetchキャッシュも無効化
export const runtime = 'nodejs'            // Edge Runtimeキャッシュを回避

// レスポンスヘッダーでクライアントサイドキャッシュも無効化
export async function generateMetadata() {
  return {
    other: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }
}

// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"
import RefreshControls from "./components/RefreshControls"

// サービスクリック統計のタイプ定義
interface ServiceClickStats {
  service_name: string
  service_url?: string
  click_count: number
  latest_click: string
}

export default async function DiagnosisList() {
  // 全データを取得してからフィルタリング
  let allData: any[] = []
  let allError: any = null
  let totalCount: number | null = null
  
  try {
    const queryTimestamp = Date.now()
    console.log("🔥 最新版 - データベースクエリ開始...")
    console.log("🔄 Timestamp fix applied - キャッシュクリア済み")
    console.log("🕐 クエリタイムスタンプ:", queryTimestamp, new Date(queryTimestamp).toISOString())
    
    // 正確な全レコード数を確認（キャッシュ無効化）
    const { count: exactCount } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select("user_id", { count: 'exact', head: true })
    
    // 実際のデータも取得して件数を比較
    const { data: allRecords } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select("user_id, version_type, created_at")
      .order("created_at", { ascending: false })
    
    totalCount = exactCount
    
    console.log("🔍 データベースレコード数検証:")
    console.log("  - COUNT(user_id)での件数:", exactCount)
    console.log("  - 実際取得したレコード数:", allRecords?.length || 0)
    console.log("  - レコード数一致:", exactCount === (allRecords?.length || 0))
    
    if (allRecords && allRecords.length > 0) {
      console.log("  - 最新レコード作成日:", allRecords[0]?.created_at)
      console.log("  - 最古レコード作成日:", allRecords[allRecords.length - 1]?.created_at)
      
      // version_type別の件数
      const v1Count = allRecords.filter(r => r.version_type !== 'v2').length
      const v2Count = allRecords.filter(r => r.version_type === 'v2').length
      console.log("  - V1データ件数:", v1Count)
      console.log("  - V2データ件数:", v2Count)
      console.log("  - 合計:", v1Count + v2Count)
    }
    
    // まずclicked_servicesカラムありで試行（キャッシュ回避のためタイムスタンプ追加）
    const timestamp = new Date().getTime()
    console.log("🔄 クエリ実行タイムスタンプ:", timestamp)
    
    const { data, error, count: queryCount } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select(
        "user_id, q1, simple_type, final_type, updated_at, version_type, clicked_services",
        { count: 'exact' }
      )
      .order("updated_at", { ascending: false })
      .limit(500) // 制限を緩和してすべてのデータを確実に取得
    
    console.log("クエリ結果:", { 
      dataLength: data?.length || 0, 
      queryCount: queryCount,
      hasError: !!error 
    })
    
    if (error) {
      // clicked_servicesカラムが存在しない場合は、カラムなしで再試行
      console.warn("clicked_servicesカラムが存在しません:", error.message)
      console.warn("エラーコード:", error.code)
      console.warn("エラー詳細:", error.details)
      const { data: fallbackData, error: fallbackError, count: fallbackCount } = await supabaseAdmin
        .from("career_user_diagnosis")
        .select(
          "user_id, q1, simple_type, final_type, updated_at, version_type",
          { count: 'exact' }
        )
        .order("updated_at", { ascending: false })
        .limit(500) // フォールバック時も制限を緩和
      
      console.log("フォールバッククエリ結果:", { 
        dataLength: fallbackData?.length || 0, 
        fallbackCount: fallbackCount,
        hasError: !!fallbackError 
      })
      
      if (fallbackError) throw fallbackError
      allData = fallbackData || []
    } else {
      allData = data || []
    }
  } catch (e) {
    allError = e
  }
  
  if (allError) throw allError

  // version_typeカラムを使った確実なフィルタリング
  const v1DataRaw = allData?.filter(row => row.version_type !== 'v2') || []
  const v2DataRaw = allData?.filter(row => row.version_type === 'v2') || []
  
  // V1データを更新日時順でソート（最新100件）
  const v1Data = v1DataRaw.sort((a, b) => {
    const dateA = new Date(a.updated_at)
    const dateB = new Date(b.updated_at)
    return dateB.getTime() - dateA.getTime() // 降順（最新が先頭）
  }).slice(0, 100)
  
  // V2データを更新日時順でソート（最新100件）
  const v2Data = v2DataRaw.sort((a, b) => {
    const dateA = new Date(a.updated_at)
    const dateB = new Date(b.updated_at)
    return dateB.getTime() - dateA.getTime() // 降順（最新が先頭）
  }).slice(0, 100)

  // サービスクリック統計を集計
  const serviceClickStats: Record<string, ServiceClickStats> = {}
  
  console.log("クリック統計集計開始")
  console.log("処理対象データ数:", allData?.length || 0)
  
  allData?.forEach((row, index) => {
    console.log(`データ${index + 1}:`, {
      user_id: row.user_id,
      version_type: row.version_type,
      clicked_services: row.clicked_services,
      clicked_services_type: typeof row.clicked_services,
      clicked_services_length: Array.isArray(row.clicked_services) ? row.clicked_services.length : 'not array'
    })
    
    // clicked_servicesカラムが存在し、かつ配列である場合のみ処理
    if (row.clicked_services && Array.isArray(row.clicked_services)) {
      console.log(`データ${index + 1}のクリック履歴を処理:`, row.clicked_services)
      
      row.clicked_services.forEach((service: any) => {
        const serviceName = service.name || 'Unknown Service'
        console.log('サービス処理中:', serviceName)
        
        if (!serviceClickStats[serviceName]) {
          serviceClickStats[serviceName] = {
            service_name: serviceName,
            service_url: service.url,
            click_count: 0,
            latest_click: row.updated_at
          }
        }
        
        serviceClickStats[serviceName].click_count++
        
        // より新しいクリック時刻を保持
        if (new Date(row.updated_at) > new Date(serviceClickStats[serviceName].latest_click)) {
          serviceClickStats[serviceName].latest_click = row.updated_at
        }
      })
    } else {
      console.log(`データ${index + 1}: クリック履歴なしまたは無効`, {
        clicked_services: row.clicked_services,
        type: typeof row.clicked_services
      })
    }
  })
  
  console.log("集計結果:", serviceClickStats)
  console.log("集計されたサービス数:", Object.keys(serviceClickStats).length)

  // クリック数順でソート
  const sortedServiceStats = Object.values(serviceClickStats)
    .sort((a, b) => b.click_count - a.click_count)

  console.log("🔍 データ分析:")
  console.log("  - データベース総件数:", totalCount)
  console.log("  - 取得データ件数:", allData?.length || 0)
  console.log("  - V1データ件数 (ソート前/後):", v1DataRaw?.length || 0, "/", v1Data?.length || 0)
  console.log("  - V2データ件数 (ソート前/後):", v2DataRaw?.length || 0, "/", v2Data?.length || 0)
  
  // データ不整合の詳細分析
  if (allData && totalCount && allData.length !== totalCount) {
    console.warn("⚠️ データ不整合検出:")
    console.warn("  - DB総件数:", totalCount)
    console.warn("  - 取得件数:", allData.length)
    console.warn("  - 差分:", Math.abs((totalCount || 0) - allData.length))
  }
  console.log("V2データの詳細:", v2Data)
  console.log("V2データの最新3件のupdated_at:", v2Data.slice(0, 3).map(d => ({ id: d.user_id, updated_at: d.updated_at })))
  console.log("全データのversion_type一覧:", allData?.map(row => `${row.user_id}: ${row.version_type}`))
  console.log("V2データのfinal_type一覧:", v2DataRaw?.map(row => ({ id: row.user_id, final_type: row.final_type, simple_type: row.simple_type })))
  console.log("診断エラーのV2データ:", allData?.filter(row => row.version_type === 'v2' && row.final_type?.includes('診断エラー')))
  console.log("V2データサンプル:", v2Data?.[0])
  console.log("最新3件のデータ詳細:", allData?.slice(0, 3).map(row => ({
    user_id: row.user_id, 
    version_type: row.version_type, 
    final_type: row.final_type
  })))

  return (
    <div className="space-y-8">
      {/* ページ制御ヘッダー */}
      <RefreshControls />

      {/* サービスクリック統計 */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">📊</span>
          サービスクリック統計
        </h2>
        <div className="bg-purple-50 border border-purple-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-purple-100 text-xs">
              <tr>
                <th className="p-2">順位</th>
                <th className="p-2">サービス名</th>
                <th className="p-2">クリック数</th>
                <th className="p-2">最終クリック日時</th>
                <th className="p-2">リンク</th>
              </tr>
            </thead>
            <tbody>
              {sortedServiceStats.length > 0 ? sortedServiceStats.map((stat, index) => (
                <tr key={stat.service_name} className="border-t border-purple-200 hover:bg-purple-50">
                  <td className="p-2 font-bold text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      index === 0 ? 'bg-yellow-400 text-yellow-900' :
                      index === 1 ? 'bg-gray-300 text-gray-700' :
                      index === 2 ? 'bg-orange-300 text-orange-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {index + 1}位
                    </span>
                  </td>
                  <td className="p-2 font-medium">{stat.service_name}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold">
                      {stat.click_count}回
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(stat.latest_click).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-2">
                    {stat.service_url ? (
                      <a
                        href={stat.service_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-xs"
                      >
                        開く
                      </a>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    サービスクリックデータがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          ※ 過去200件の診断データから集計（重複クリックも含む）
          {sortedServiceStats.length === 0 && (
            <div className="mt-1 text-orange-600">
              ⚠️ サービスクリックデータがありません。データベースにclicked_servicesカラムが必要です。
            </div>
          )}
        </div>
      </div>

      {/* V2診断データ */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold">V2</span>
          V2診断一覧（最新 100 件）
        </h2>
        <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-green-100 text-xs">
              <tr>
                <th className="p-2">UserID</th>
                <th className="p-2">Q1（月曜日の感情）</th>
                <th className="p-2">簡易タイプ</th>
                <th className="p-2">V2診断タイプ</th>
                <th className="p-2">最終更新</th>
                <th className="p-2">詳細</th>
              </tr>
            </thead>
            <tbody>
              {v2Data && v2Data.length > 0 ? v2Data.map((row) => (
                <tr key={row.user_id} className="border-t border-green-200 hover:bg-green-50">
                  <td className="p-2 font-mono text-xs">{row.user_id}</td>
                  <td className="p-2">{row.q1}</td>
                  <td className="p-2">{row.simple_type}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      {row.final_type}
                    </span>
                  </td>
                  <td className="p-2">
                    {new Date(row.updated_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-2">
                    <Link
                      href={`/admin/v2/${row.user_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      開く
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    V2診断データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* V1診断データ */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-bold">V1</span>
          V1診断一覧（最新 100 件）
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-blue-100 text-xs">
              <tr>
                <th className="p-2">UserID</th>
                <th className="p-2">Q1</th>
                <th className="p-2">簡易タイプ</th>
                <th className="p-2">最終タイプ</th>
                <th className="p-2">最終更新</th>
                <th className="p-2">詳細</th>
              </tr>
            </thead>
            <tbody>
              {v1Data.map((row) => (
                <tr key={row.user_id} className="border-t border-blue-200 hover:bg-blue-50">
                  <td className="p-2">{row.user_id}</td>
                  <td className="p-2">{row.q1}</td>
                  <td className="p-2">{row.simple_type}</td>
                  <td className="p-2">{row.final_type}</td>
                  <td className="p-2">
                    {new Date(row.updated_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-2">
                    <Link
                      href={`/admin/${row.user_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      開く
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}