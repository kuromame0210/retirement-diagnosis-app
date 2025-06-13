export const dynamic = 'force-dynamic'   // これだけで常に最新

// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"

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
  
  try {
    // まずclicked_servicesカラムありで試行
    const { data, error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select(
        "user_id, q1, simple_type, final_type, updated_at, version_type, clicked_services"
      )
      .order("updated_at", { ascending: false })
      .limit(200)
    
    if (error) {
      // clicked_servicesカラムが存在しない場合は、カラムなしで再試行
      console.warn("clicked_servicesカラムが存在しません:", error.message)
      console.warn("エラーコード:", error.code)
      console.warn("エラー詳細:", error.details)
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .select(
          "user_id, q1, simple_type, final_type, updated_at, version_type"
        )
        .order("updated_at", { ascending: false })
        .limit(200)
      
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
  const v1Data = allData?.filter(row => row.version_type !== 'v2') || []
  const v2Data = allData?.filter(row => row.version_type === 'v2') || []

  // サービスクリック統計を集計
  const serviceClickStats: Record<string, ServiceClickStats> = {}
  
  allData?.forEach(row => {
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

  console.log("全データ件数:", allData?.length || 0)
  console.log("V1データ件数:", v1Data?.length || 0)
  console.log("V2データ件数:", v2Data?.length || 0)
  console.log("全データのversion_type一覧:", allData?.map(row => `${row.user_id}: ${row.version_type}`))
  console.log("V2データサンプル:", v2Data?.[0])
  console.log("最新3件のデータ詳細:", allData?.slice(0, 3).map(row => ({
    user_id: row.user_id, 
    version_type: row.version_type, 
    final_type: row.final_type
  })))

  return (
    <div className="space-y-8">
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