export const dynamic = 'force-dynamic'   // これだけで常に最新

// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"

export default async function DiagnosisList() {
  // V1診断データ取得
  const { data: v1Data, error: v1Error } = await supabaseAdmin
    .from("career_user_diagnosis")
    .select(
      "user_id, q1, simple_type, final_type, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(100)

  if (v1Error) throw v1Error

  // V2診断データ取得
  const { data: v2Data, error: v2Error } = await supabaseAdmin
    .from("diagnoses")
    .select(
      "session_id, satisfaction, result_type, urgency_level, updated_at"
    )
    .eq("app_version", "v2")
    .order("updated_at", { ascending: false })
    .limit(100)

  if (v2Error) throw v2Error

  return (
    <div className="space-y-8">
      {/* V2診断データ */}
      <div>
        <h2 className="text-xl font-bold mb-4">V2診断一覧（最新 100 件）</h2>
        <div className="bg-green-50 border border-green-200 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-green-100 text-xs">
              <tr>
                <th className="p-2">SessionID</th>
                <th className="p-2">満足度</th>
                <th className="p-2">診断タイプ</th>
                <th className="p-2">緊急度</th>
                <th className="p-2">最終更新</th>
                <th className="p-2">詳細</th>
              </tr>
            </thead>
            <tbody>
              {v2Data.map((row) => (
                <tr key={row.session_id} className="border-t border-green-200 hover:bg-green-50">
                  <td className="p-2 font-mono text-xs">{row.session_id}</td>
                  <td className="p-2">{row.satisfaction}</td>
                  <td className="p-2">{row.result_type}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      row.urgency_level === 'high' ? 'bg-red-100 text-red-800' :
                      row.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {row.urgency_level}
                    </span>
                  </td>
                  <td className="p-2">
                    {new Date(row.updated_at).toLocaleString("ja-JP")}
                  </td>
                  <td className="p-2">
                    <Link
                      href={`/admin/v2/${row.session_id}`}
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

      {/* V1診断データ */}
      <div>
        <h2 className="text-xl font-bold mb-4">V1診断一覧（最新 100 件）</h2>
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