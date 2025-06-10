export const dynamic = 'force-dynamic'

import { supabaseAdmin } from "@/lib/supabase"
import Link from "next/link"

export default async function V2DiagnosisDetail({ params }: { params: { sessionId: string } }) {
  const { data, error } = await supabaseAdmin
    .from("diagnoses")
    .select("*")
    .eq("session_id", params.sessionId)
    .eq("app_version", "v2")
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

  // JSONデータの解析
  let concerns = []
  let priorities = []
  let actionPlan = []
  let serviceRecommendations = []

  try {
    concerns = typeof data.concerns === 'string' ? JSON.parse(data.concerns) : data.concerns || []
    priorities = typeof data.priorities === 'string' ? JSON.parse(data.priorities) : data.priorities || []
    actionPlan = typeof data.action_plan === 'string' ? JSON.parse(data.action_plan) : data.action_plan || []
    serviceRecommendations = typeof data.service_recommendations === 'string' ? JSON.parse(data.service_recommendations) : data.service_recommendations || []
  } catch (parseError) {
    console.error("JSON解析エラー:", parseError)
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
            <label className="font-medium text-gray-700">セッションID:</label>
            <p className="font-mono text-sm">{data.session_id}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">バージョン:</label>
            <p>{data.app_version}</p>
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
        <h2 className="text-lg font-semibold mb-4">回答データ</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="font-medium text-gray-700">仕事の満足度:</label>
            <p className="mt-1">{data.satisfaction}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">転職を考え始めた時期:</label>
            <p className="mt-1">{data.timing}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">年代:</label>
            <p className="mt-1">{data.demographics_age}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">職種:</label>
            <p className="mt-1">{data.demographics_job}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">転職経験:</label>
            <p className="mt-1">{data.experience}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">理想の働き方:</label>
            <p className="mt-1">{data.work_style}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">現在の年収:</label>
            <p className="mt-1">{data.income}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">性格・働き方タイプ:</label>
            <p className="mt-1">{data.personality}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">家族構成:</label>
            <p className="mt-1">{data.family}</p>
          </div>
          <div>
            <label className="font-medium text-gray-700">準備状況:</label>
            <p className="mt-1">{data.preparation}</p>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div>
            <label className="font-medium text-gray-700">主なストレス要因:</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {concerns.map((concern: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  {concern}
                </span>
              ))}
            </div>
          </div>
          
          <div>
            <label className="font-medium text-gray-700">重視する優先事項:</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {priorities.map((priority: string, index: number) => (
                <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {priority}
                </span>
              ))}
            </div>
          </div>
          
          {data.free_text && (
            <div>
              <label className="font-medium text-gray-700">フリーテキスト（詳細状況）:</label>
              <div className="mt-1 p-4 bg-gray-50 rounded-lg border">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{data.free_text}</p>
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
              <label className="font-medium text-gray-700">診断タイプ:</label>
              <p className="mt-1 text-lg font-semibold">{data.result_type}</p>
            </div>
            <div>
              <label className="font-medium text-gray-700">緊急度:</label>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                data.urgency_level === 'high' ? 'bg-red-100 text-red-800' :
                data.urgency_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {data.urgency_level}
              </span>
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