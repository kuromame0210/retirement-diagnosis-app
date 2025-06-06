export const dynamic = 'force-dynamic'   // これだけで常に最新

// src/app/admin/page.tsx
import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"

export default async function DiagnosisList() {
  const { data, error } = await supabaseAdmin
    .from("career_user_diagnosis")
    .select(
      "user_id, q1, simple_type, final_type, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(200)

  if (error) throw error

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">ユーザー診断一覧（最新 200 件）</h2>
      <table className="w-full border text-left bg-white">
        <thead className="bg-gray-100 text-xs">
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
          {data.map((row) => (
            <tr key={row.user_id} className="border-t hover:bg-gray-50">
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
  )
}