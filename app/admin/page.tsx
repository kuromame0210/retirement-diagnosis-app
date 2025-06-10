export const dynamic = 'force-dynamic'   // これだけで常に最新

// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"

export default async function DiagnosisList() {
  // 全データを取得してからフィルタリング
  const { data: allData, error: allError } = await supabaseAdmin
    .from("career_user_diagnosis")
    .select(
      "user_id, q1, simple_type, final_type, updated_at, version_type"
    )
    .order("updated_at", { ascending: false })
    .limit(200) // 十分な数を取得
    
  if (allError) throw allError

  // version_typeカラムを使った確実なフィルタリング
  const v1Data = allData?.filter(row => row.version_type !== 'v2') || []
  const v2Data = allData?.filter(row => row.version_type === 'v2') || []

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