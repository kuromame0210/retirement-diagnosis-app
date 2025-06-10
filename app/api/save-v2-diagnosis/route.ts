import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
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

    // 既存レコードのチェック（career_user_diagnosisテーブルでセッションIDベース）
    const { data: existingRecord } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select("user_id")
      .eq("user_id", sessionId)
      .single()

    if (existingRecord) {
      console.log("✅ 既存のV2診断レコードが見つかりました:", existingRecord.user_id)
      return NextResponse.json({ 
        success: true, 
        id: existingRecord.user_id,
        message: "既存レコードを使用"
      })
    }

    // 新規レコード作成
    const timestamp = getJSTTimestamp()
    
    // 既存のcareer_user_diagnosisテーブル構造に合わせてV2データを保存
    const diagnosisData = {
      user_id: sessionId,
      
      // 既存のフィールドにV2データをマッピング
      q1: answers.satisfaction || "",
      q2: answers.night_thoughts || "",
      q3: answers.demographics?.age || "",
      q4: answers.demographics?.job || "",
      q5: answers.money_reality || "",
      q6: answers.escape_plan || "",
      q7: answers.ideal_future || "",
      q8: answers.skill_confidence || "",
      q9: answers.relationship_reality || "",
      q10: answers.action_readiness || "",
      
      // 結果データ
      simple_type: result.type,
      final_type: `v2_${result.type}`,
      summary: result.summary,
      advice: result.advice,
      
      // JSON形式で保存
      final_data: JSON.stringify({
        version: "v2",
        actionPlan: result.actionPlan,
        serviceRecommendations: result.serviceRecommendations,
        urgency: result.urgency,
        freeText: answers.freeText,
        breaking_point: answers.breaking_point
      }),
      
      // メタデータ
      user_agent: userAgent || null,
      prefecture: prefecture || null,
      created_at: timestamp,
      updated_at: timestamp,
    }

    console.log("保存するデータ:", diagnosisData)

    const { data, error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .insert(diagnosisData)
      .select("user_id")
      .single()

    if (error) {
      console.error("❌ Supabase保存エラー:", error)
      return NextResponse.json(
        { error: "データベース保存に失敗しました" },
        { status: 500 }
      )
    }

    console.log("✅ V2診断データ保存成功:", data.user_id)

    return NextResponse.json({
      success: true,
      id: data.user_id,
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