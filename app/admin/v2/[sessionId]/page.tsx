export const dynamic = 'force-dynamic'

import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"

export default async function V2DiagnosisDetail({ params }: { params: { sessionId: string } }) {
  const { data, error } = await supabaseAdmin
    .from("career_user_diagnosis")
    .select("*")
    .eq("user_id", params.sessionId)
    .like("final_type", "v2_%")
    .single()

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">エラー</h1>
        <p className="text-red-600">診断データが見つかりません: {error.message}</p>
        <Link href="/admin" className="text-blue-600 hover:underline mt-4 inline-block">
          一覧に戻る
        </Link>
      </div>
    )
  }

  // final_dataからV2固有データを取得
  let finalData: any = {}
  let actionPlan = []
  let serviceRecommendations = []

  try {
    if (data.final_data) {
      finalData = typeof data.final_data === 'string' ? JSON.parse(data.final_data) : data.final_data
      actionPlan = finalData.actionPlan || []
      serviceRecommendations = finalData.serviceRecommendations || []
    }
  } catch (parseError) {
    console.error("final_data JSON解析エラー:", parseError)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">V2診断詳細</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          一覧に戻る
        </Link>
      </div>

      {/* 基本情報 */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">基本情報</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-medium text-gray-700">ユーザーID:</label>
            <p className="font-mono text-sm">{data.user_id}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">診断タイプ:</label>
            <p>{data.final_type}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">作成日時:</label>
            <p>{new Date(data.created_at).toLocaleString("ja-JP")}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">更新日時:</label>
            <p>{new Date(data.updated_at).toLocaleString("ja-JP")}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">都道府県:</label>
            <p>{data.prefecture || "未設定"}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">ユーザーエージェント:</label>
            <p className="text-xs break-all">{data.user_agent || "未設定"}</p>
          </div>
        </div>
      </div>

      {/* 回答データ */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">V2 パーソナル回答データ</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="font-medium text-gray-700">Q1（月曜日の感情）:</label>
            <p className="mt-1">{data.q1}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q2（夜の思考）:</label>
            <p className="mt-1">{data.q2}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q3（年代）:</label>
            <p className="mt-1">{data.q3}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q4（職種）:</label>
            <p className="mt-1">{data.q4}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q5（お金の現実）:</label>
            <p className="mt-1">{data.q5}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q6（転職への本音）:</label>
            <p className="mt-1">{data.q6}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q7（理想の働き方）:</label>
            <p className="mt-1">{data.q7}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q8（スキル自信）:</label>
            <p className="mt-1">{data.q8}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q9（人間関係）:</label>
            <p className="mt-1">{data.q9}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">Q10（転職覚悟）:</label>
            <p className="mt-1">{data.q10}</p>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          {/* V2固有データ表示 */}
          {finalData.breaking_point && Array.isArray(finalData.breaking_point) && finalData.breaking_point.length > 0 && (
            <div>
              <label className="font-medium text-gray-700">「もう無理かも」と思った瞬間:</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {finalData.breaking_point.map((point: string, index: number) => (
                  <span key={index} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {finalData.urgency && (
            <div>
              <label className="font-medium text-gray-700">AI分析による緊急度:</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mt-1 ${
                finalData.urgency === 'high' ? 'bg-red-100 text-red-800' :
                finalData.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {finalData.urgency}
              </span>
            </div>
          )}
          
          {finalData.freeText && (
            <div>
              <label className="font-medium text-gray-700">フリーテキスト（詳細状況）:</label>
              <div className="mt-1 p-4 bg-gray-50 rounded-lg border">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{finalData.freeText}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 診断結果 */}
      <div className="bg-white border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">診断結果</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-gray-700">簡易診断タイプ:</label>
              <p className="mt-1 text-lg font-semibold">{data.simple_type}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">最終診断タイプ:</label>
              <p className="mt-1 text-lg font-semibold">{data.final_type}</p>
            </div>
          </div>
          
          <div>
            <label className="font-medium text-gray-700">状況分析:</label>
            <p className="mt-1 leading-relaxed">{data.summary}</p>
          </div>
          
          <div>
            <label className="font-medium text-gray-700">アドバイス:</label>
            <p className="mt-1 leading-relaxed">{data.advice}</p>
          </div>
          
          {actionPlan.length > 0 && (
            <div>
              <label className="font-medium text-gray-700">アクションプラン:</label>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {actionPlan.map((action: string, index: number) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* サービス推奨 */}
      {serviceRecommendations.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">推奨サービス TOP5</h2>
          <div className="space-y-4">
            {serviceRecommendations.map((service: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                      {service.rank}
                    </span>
                    <div>
                      <h3 className="font-semibold">{service.name}</h3>
                      <p className="text-sm text-gray-600">{service.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    service.priority === 'high' ? 'bg-red-100 text-red-800' :
                    service.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {service.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{service.description}</p>
                <p className="text-sm text-blue-700">
                  <strong>推奨理由:</strong> {service.reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}