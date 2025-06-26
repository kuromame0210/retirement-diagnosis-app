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
import { getV3DiagnosisListForAdmin, getV3ServiceClickStats, getV3DiagnosisStats } from "@/lib/v3/database"

// サービスクリック統計のタイプ定義
interface ServiceClickStats {
  service_name: string
  service_url?: string
  click_count: number
  latest_click: string
}

export default async function DiagnosisList() {
  // V1/V2データを取得してからフィルタリング
  let allData: any[] = []
  let allError: any = null
  let totalCount: number | null = null
  
  // V3データを並列取得
  let v3Data: any[] = []
  let v3Stats: any = null
  let v3ServiceStats: any[] = []
  
  try {
    // レコード数を取得
    const { count: exactCount } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select("user_id", { count: 'exact', head: true })
    
    totalCount = exactCount
    
    // データ取得（clicked_servicesカラムありで試行）
    const { data, error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select(
        "user_id, q1, simple_type, final_type, updated_at, version_type, clicked_services",
        { count: 'exact' }
      )
      .order("updated_at", { ascending: false })
      .limit(500)
    
    if (error) {
      // clicked_servicesカラムが存在しない場合は、カラムなしで再試行
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .select(
          "user_id, q1, simple_type, final_type, updated_at, version_type",
          { count: 'exact' }
        )
        .order("updated_at", { ascending: false })
        .limit(500)
      
      if (fallbackError) throw fallbackError
      allData = fallbackData || []
    } else {
      allData = data || []
    }
  } catch (e) {
    allError = e
  }
  
  // V3データを並列取得
  try {
    const [v3List, v3Statistics, v3ServiceClicks] = await Promise.all([
      getV3DiagnosisListForAdmin(100),
      getV3DiagnosisStats(),
      getV3ServiceClickStats()
    ])
    
    v3Data = v3List.data
    v3Stats = v3Statistics
    v3ServiceStats = v3ServiceClicks
  } catch (v3Error) {
    console.error("V3データ取得エラー:", v3Error)
    // V3エラーは致命的ではないので続行
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
  
  allData?.forEach((row) => {
    // clicked_servicesカラムが存在し、かつ配列である場合のみ処理
    if (row.clicked_services && Array.isArray(row.clicked_services)) {
      row.clicked_services.forEach((service: any) => {
        const serviceName = service.name || 'Unknown Service'
        
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
    }
  })

  // クリック数順でソート
  const sortedServiceStats = Object.values(serviceClickStats)
    .sort((a, b) => b.click_count - a.click_count)

  // デバッグ情報（必要時のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log("Admin データ概要:", {
      totalCount,
      v1Count: v1Data?.length || 0,
      v2Count: v2Data?.length || 0,
      v3Count: v3Data?.length || 0,
      v3Data: v3Data?.slice(0, 2) // 最初の2件のサンプル
    })
  }

  return (
    <div className="space-y-8">
      {/* ページ制御ヘッダー */}
      <RefreshControls />

      {/* V3統計ダッシュボード */}
      {v3Stats && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-sm font-bold">V3</span>
            V3診断システム 統計
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-700">{v3Stats.totalDiagnoses}</div>
              <div className="text-sm text-emerald-600">総診断数</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">{v3Stats.completedDiagnoses}</div>
              <div className="text-sm text-blue-600">完了診断数</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">{v3Stats.averageQuestions}</div>
              <div className="text-sm text-yellow-600">平均回答数</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-700">{v3Stats.completionRate}%</div>
              <div className="text-sm text-purple-600">完了率</div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-700">{v3Stats.partialDiagnosisUsage}%</div>
              <div className="text-sm text-orange-600">途中診断利用率</div>
            </div>
          </div>
        </div>
      )}

      {/* V3診断データ */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-sm font-bold">V3</span>
          V3診断一覧（最新 100 件）
          <span className="text-sm font-normal text-gray-600">- {v3Data?.length || 0}件</span>
        </h2>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-emerald-100 text-xs">
              <tr>
                <th className="p-2">SessionID</th>
                <th className="p-2">Q1回答（抜粋）</th>
                <th className="p-2">回答数</th>
                <th className="p-2">完了状況</th>
                <th className="p-2">診断タイプ</th>
                <th className="p-2">途中診断回数</th>
                <th className="p-2">最終更新</th>
                <th className="p-2">詳細</th>
              </tr>
            </thead>
            <tbody>
              {v3Data && v3Data.length > 0 ? v3Data.map((row) => (
                <tr key={row.session_id} className="border-t border-emerald-200 hover:bg-emerald-50">
                  <td className="p-2 font-mono text-xs" title={row.session_id}>
                    {row.session_id.substring(0, 12)}...
                  </td>
                  <td className="p-2 text-xs">
                    {row.q1_text ? (
                      <div className="max-w-48 truncate text-gray-700" title={row.q1_text}>
                        {row.q1_text.substring(0, 50)}
                        {row.q1_text.length > 50 ? '...' : ''}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">未回答</span>
                    )}
                  </td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                      {row.completed_questions || 0}/{row.total_questions || 10}
                    </span>
                  </td>
                  <td className="p-2">
                    {row.is_completed ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        完了
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        進行中
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs font-medium">
                      {row.final_result?.resultType || 
                       (row.partial_results && Array.isArray(row.partial_results) && row.partial_results.length > 0 
                         ? row.partial_results[row.partial_results.length - 1]?.resultType 
                         : '未診断')}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    {Array.isArray(row.partial_results) ? row.partial_results.length : 0}回
                  </td>
                  <td className="p-2 text-xs">
                    {new Date(row.updated_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-2">
                    <Link
                      href={`/admin/v3/${row.session_id}`}
                      className="text-blue-600 hover:underline text-xs font-medium px-2 py-1 bg-blue-50 rounded"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">
                    {v3Data === null ? 'データ読み込み中...' : 'V3診断データがありません'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          ※ V3診断: 全テキスト回答形式、途中診断対応 | Q1回答で内容を把握可能
        </div>
      </div>

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