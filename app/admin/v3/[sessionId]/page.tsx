/**
 * V3診断詳細ページ（管理画面）
 */

export const dynamic = 'force-dynamic'
export const revalidate = 0

import Link from "next/link"
import { getV3DiagnosisData } from "@/lib/v3/database"
import { V3_QUESTIONS } from "@/lib/v3/questions"

interface V3DetailPageProps {
  params: {
    sessionId: string
  }
}

export default async function V3DetailPage({ params }: V3DetailPageProps) {
  const { sessionId } = params
  
  let diagnosisData = null
  let error = null

  try {
    diagnosisData = await getV3DiagnosisData(sessionId)
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
    console.error('V3診断データ取得エラー:', e)
  }

  if (error || !diagnosisData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-bold text-red-800 mb-2">データ取得エラー</h1>
          <p className="text-red-700 mb-4">
            セッションID: {sessionId} のデータが見つかりません
          </p>
          <Link 
            href="/admin" 
            className="text-blue-600 hover:underline"
          >
            ← 管理画面に戻る
          </Link>
        </div>
      </div>
    )
  }

  // V3データベース構造に合わせて個別カラムから回答を構築
  const textAnswers: Record<string, any> = {}
  for (let i = 1; i <= 10; i++) {
    const questionField = `q${i}_text`
    const answeredAtField = `q${i}_answered_at`
    const questionKey = `q${i}_text`
    
    if (diagnosisData[questionField as keyof typeof diagnosisData]) {
      textAnswers[questionKey] = {
        questionId: questionKey,
        answer: diagnosisData[questionField as keyof typeof diagnosisData],
        answeredAt: diagnosisData[answeredAtField as keyof typeof diagnosisData] || diagnosisData.updated_at,
        characterCount: String(diagnosisData[questionField as keyof typeof diagnosisData] || '').length
      }
    }
  }
  const partialResults = diagnosisData.partial_results || []
  const finalResult = diagnosisData.final_result
  const clickedServices = diagnosisData.clicked_services || []

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500 text-white rounded-full text-sm font-bold">V3</span>
            診断詳細
          </h1>
          <Link 
            href="/admin" 
            className="text-blue-600 hover:underline text-sm"
          >
            ← 管理画面に戻る
          </Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">セッションID</div>
            <div className="font-mono text-xs">{diagnosisData.session_id}</div>
          </div>
          <div>
            <div className="text-gray-500">ユーザーID</div>
            <div className="font-mono text-xs">{diagnosisData.user_id}</div>
          </div>
          <div>
            <div className="text-gray-500">回答数</div>
            <div className="font-semibold">
              {diagnosisData.completed_questions}/{diagnosisData.total_questions}問
            </div>
          </div>
          <div>
            <div className="text-gray-500">完了状況</div>
            <div>
              {diagnosisData.is_completed ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  完了
                </span>
              ) : (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                  進行中
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mt-4 pt-4 border-t">
          <div>
            <div className="text-gray-500">開始日時</div>
            <div>{new Date(diagnosisData.started_at).toLocaleString("ja-JP")}</div>
          </div>
          <div>
            <div className="text-gray-500">最終更新</div>
            <div>{new Date(diagnosisData.updated_at).toLocaleString("ja-JP")}</div>
          </div>
          {diagnosisData.completed_at && (
            <div>
              <div className="text-gray-500">完了日時</div>
              <div>{new Date(diagnosisData.completed_at).toLocaleString("ja-JP")}</div>
            </div>
          )}
        </div>
      </div>

      {/* テキスト回答 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📝 テキスト回答</h2>
        <div className="space-y-6">
          {V3_QUESTIONS.map((question, index) => {
            const answer = textAnswers[question.id]
            const isAnswered = !!answer

            return (
              <div 
                key={question.id}
                className={`border rounded-lg p-4 ${
                  isAnswered ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isAnswered ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      {question.question}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`px-2 py-1 rounded ${
                        question.category === 'basic' ? 'bg-red-100 text-red-700' :
                        question.category === 'detailed' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {question.category === 'basic' ? '基本情報' :
                         question.category === 'detailed' ? '詳細分析' : '深層分析'}
                      </span>
                      {question.required && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">必須</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isAnswered ? (
                  <div className="space-y-2">
                    <div className="bg-white border border-green-200 rounded p-3">
                      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {answer.answer}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>回答日時: {new Date(answer.answeredAt).toLocaleString("ja-JP")}</span>
                      <span>文字数: {answer.characterCount}文字</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">未回答</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 途中診断履歴 */}
      {partialResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">⏱️ 途中診断履歴</h2>
          <div className="space-y-4">
            {partialResults.map((result: any, index: number) => (
              <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900">
                    途中診断 #{index + 1}
                  </h3>
                  <div className="text-sm text-blue-700">
                    {new Date(result.diagnosedAt).toLocaleString("ja-JP")}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                  <div>
                    <span className="text-gray-600">回答数:</span>
                    <span className="ml-1 font-medium">{result.answeredQuestions}問</span>
                  </div>
                  <div>
                    <span className="text-gray-600">信頼度:</span>
                    <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                      result.confidenceLevel === 'high' ? 'bg-green-100 text-green-800' :
                      result.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {result.confidenceLevel}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">診断タイプ:</span>
                    <span className="ml-1 font-medium">{result.resultType}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">緊急度:</span>
                    <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                      result.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                      result.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {result.urgencyLevel}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">サマリー:</div>
                    <div className="text-gray-800 text-sm">{result.summary}</div>
                  </div>
                  
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">推奨事項:</div>
                      <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
                        {result.recommendations.map((rec: string, i: number) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 最終診断結果 */}
      {finalResult && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 最終診断結果</h2>
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-sm">
              <div>
                <span className="text-gray-600">診断タイプ:</span>
                <span className="ml-1 font-medium">{finalResult.resultType}</span>
              </div>
              <div>
                <span className="text-gray-600">信頼度:</span>
                <span className="ml-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                  {finalResult.confidenceLevel}
                </span>
              </div>
              <div>
                <span className="text-gray-600">緊急度:</span>
                <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                  finalResult.urgencyLevel === 'high' ? 'bg-red-100 text-red-800' :
                  finalResult.urgencyLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {finalResult.urgencyLevel}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">総合サマリー:</div>
                <div className="text-gray-800 text-sm leading-relaxed">{finalResult.summary}</div>
              </div>

              {finalResult.actionPlan && finalResult.actionPlan.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">アクションプラン:</div>
                  <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1">
                    {finalResult.actionPlan.map((action: string, i: number) => (
                      <li key={i}>{action}</li>
                    ))}
                  </ol>
                </div>
              )}

              {finalResult.longTermStrategy && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">長期戦略:</div>
                  <div className="text-gray-800 text-sm leading-relaxed">{finalResult.longTermStrategy}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* サービスクリック履歴 */}
      {clickedServices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 サービスクリック履歴</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">サービス名</th>
                  <th className="p-3 text-left">クリック日時</th>
                  <th className="p-3 text-left">診断段階</th>
                  <th className="p-3 text-left">診断タイプ</th>
                  <th className="p-3 text-left">URL</th>
                </tr>
              </thead>
              <tbody>
                {clickedServices.map((service: any, index: number) => (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="p-3 font-medium">{service.serviceName}</td>
                    <td className="p-3">{new Date(service.clickedAt).toLocaleString("ja-JP")}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {service.diagnosisStage}
                      </span>
                    </td>
                    <td className="p-3">{service.resultTypeWhenClicked || '-'}</td>
                    <td className="p-3">
                      {service.serviceUrl && service.serviceUrl !== '#' ? (
                        <a 
                          href={service.serviceUrl} 
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* デバイス情報 */}
      {diagnosisData.device_info && Object.keys(diagnosisData.device_info).length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📱 デバイス情報</h2>
          <div className="bg-gray-50 rounded p-4">
            <pre className="text-xs text-gray-700 overflow-x-auto">
              {JSON.stringify(diagnosisData.device_info, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}