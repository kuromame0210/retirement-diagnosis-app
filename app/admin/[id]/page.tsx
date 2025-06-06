export const dynamic = 'force-dynamic'   // これだけで常に最新

// src/app/admin/[id]/page.tsx
import { supabaseAdmin } from "@/lib/supabase"
import { PREF_MAP } from "@/lib/prefecture"

export default async function DiagnosisDetail({
  params,
}: {
  params: { id: string }
}) {
  const { data, error } = await supabaseAdmin
    .from("career_user_diagnosis")
    .select("*")
    .eq("user_id", params.id)
    .single()

  const prefName =
    data.country_code === 'JP'
      ? PREF_MAP[(data.region_code || '').padStart(2, '0')] ?? '不明'
      : data.country_code ?? '不明'

  if (error || !data) return <div>データが見つかりません</div>

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">ユーザー詳細</h2>

      <section className="bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">メタ情報</h3>
        <p>user_id: {data.user_id}</p>
        <p>current_step: {data.current_step}</p>
        <p>
          updated_at: {new Date(data.updated_at).toLocaleString("ja-JP")}
        </p>
      </section>

      <section className="bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">基本診断</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>Q1: {data.q1}</li>
          <li>Q2: {data.q2}</li>
          <li>Q3: {data.q3}</li>
          <li>Q4: {data.q4}</li>
          <li>Q5: {data.q5}</li>
        </ul>
      </section>

      <section className="bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">AI チャット</h3>
        {[1, 2, 3, 4, 5].map((n) => (
          <div key={n} className="mb-4">
            <p className="text-blue-700">Q{n}: {data[`chat_q${n}`]}</p>
            <p className="text-gray-700 ml-4">A{n}: {data[`chat_a${n}`]}</p>
          </div>
        ))}
      </section>

      <section className="bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">クリックしたサービス</h3>
        <ul className="list-disc ml-5 space-y-1">
          {[1, 2, 3, 4, 5].map((n) => {
            const id = data[`click${n}_id`]
            if (!id) return null
            return (
              <li key={n}>
                {id} (
                {new Date(data[`click${n}_at`]).toLocaleString("ja-JP")})
              </li>
            )
          })}
        </ul>
      </section>

      <section className="bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">最終診断</h3>
        <p>タイプ: {data.final_type}</p>
        <p>緊急度: {data.final_urgency}</p>
        <p className="mt-2 whitespace-pre-line">
          現状: {data.final_situation}
        </p>
        <p className="mt-2">アクション1: {data.final_action1}</p>
        <p>アクション2: {data.final_action2}</p>
        <p className="mt-2 whitespace-pre-line">
          長期戦略: {data.final_long_strategy}
        </p>
      </section>

      <section className="bg-white p-4 rounded border">
        <h3 className="font-semibold mb-2">アクセス情報</h3>
        <p>IP アドレス: {data.client_ip ?? "—"}</p>
        <p>国コード&nbsp;&nbsp;&nbsp;: {data.country_code ?? "—"}</p>
        <p>都道府県: {prefName}</p>
        <div className="mt-2">
          <p>デバイス: {data.device_type ?? "—"}</p>
          <p>OS&nbsp;&nbsp;&nbsp;&nbsp;: {data.device_os ?? "—"}</p>
          <p>ブラウザ: {data.device_browser ?? "—"}</p>
        </div>
      </section>

    </div>
  )
}