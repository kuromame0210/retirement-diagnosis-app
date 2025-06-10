import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { getJSTTimestamp } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { answers, result, sessionId, userAgent, prefecture } = body

    console.log("=== V2診断保存API開始 ===")
    console.log("Received data:", { answers, result, sessionId })

    // 必須データの検証
    if (!answers || !result || !sessionId) {
      console.error("❌ 必須データが不足:", { answers: !!answers, result: !!result, sessionId: !!sessionId })
      return NextResponse.json(
        { error: "必須データが不足しています" },
        { status: 400 }
      )
    }

    // 既存レコードのチェック（重複防止）
    const { data: existingRecord } = await supabase
      .from("diagnoses")
      .select("id")
      .eq("session_id", sessionId)
      .eq("app_version", "v2")
      .single()

    if (existingRecord) {
      console.log("✅ 既存のV2診断レコードが見つかりました:", existingRecord.id)
      return NextResponse.json({ 
        success: true, 
        id: existingRecord.id,
        message: "既存レコードを使用"
      })
    }

    // 新規レコード作成
    const timestamp = getJSTTimestamp()
    
    const diagnosisData = {
      session_id: sessionId,
      app_version: "v2",
      
      // V2固有の回答データ
      satisfaction: answers.satisfaction,
      timing: answers.timing,
      concerns: answers.concerns,
      demographics_age: answers.demographics?.age,
      demographics_job: answers.demographics?.job,
      experience: answers.experience,
      work_style: answers.work_style,
      income: answers.income,
      priorities: answers.priorities,
      personality: answers.personality,
      family: answers.family,
      preparation: answers.preparation,
      free_text: answers.freeText || null,
      
      // AI分析結果
      result_type: result.type,
      urgency_level: result.urgency,
      summary: result.summary,
      advice: result.advice,
      action_plan: result.actionPlan,
      service_recommendations: result.serviceRecommendations,
      
      // メタデータ
      user_agent: userAgent || null,
      prefecture: prefecture || null,
      created_at: timestamp,
      updated_at: timestamp,
    }

    console.log("保存するデータ:", diagnosisData)

    const { data, error } = await supabase
      .from("diagnoses")
      .insert(diagnosisData)
      .select("id")
      .single()

    if (error) {
      console.error("❌ Supabase保存エラー:", error)
      return NextResponse.json(
        { error: "データベース保存に失敗しました" },
        { status: 500 }
      )
    }

    console.log("✅ V2診断データ保存成功:", data.id)

    return NextResponse.json({
      success: true,
      id: data.id,
      message: "V2診断データが正常に保存されました"
    })

  } catch (error) {
    console.error("❌ V2診断保存API例外エラー:", error)
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    )
  }
}