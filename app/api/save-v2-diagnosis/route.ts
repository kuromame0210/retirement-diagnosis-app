import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { getJSTTimestamp } from "@/lib/storage"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { answers, result, sessionId, userAgent, prefecture, isInitialSave } = body

    console.log("=== V2診断保存API開始 ===")
    console.log("Received data:", { answers, result, sessionId, isInitialSave })
    console.log("Request body keys:", Object.keys(body))

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
      
      // 既存レコードを更新
      const timestamp = getJSTTimestamp()
      const updateData = {
        current_step: isInitialSave ? 1 : 4,
        version_type: 'v2',
        
        // 結果データ（診断完了時のみ更新）
        ...(result.type && {
          simple_type: result.type,
          simple_summary: result.summary,
          simple_advice: result.advice,
          final_type: `v2_${result.type}`,
        }),
        
        // 回答データ（診断完了時のみ更新）
        ...(answers.satisfaction && {
          q1: answers.satisfaction,
          q2: answers.night_thoughts || "",
          q3: answers.demographics?.age || "",
          q4: answers.demographics?.job || "",
          q5: answers.money_reality || "",
        }),
        
        // クリックしたサービス履歴を保存
        clicked_services: body.clickedServices || [],
        
        updated_at: timestamp,
      }
      
      console.log("既存レコード更新データ:", updateData)
      
      const { error: updateError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .update(updateData)
        .eq("user_id", sessionId)
      
      if (updateError) {
        console.error("❌ 既存レコード更新エラー:", updateError)
        return NextResponse.json(
          { error: "既存レコード更新に失敗しました", details: updateError.message },
          { status: 500 }
        )
      }
      
      console.log("✅ 既存V2レコード更新成功")
      return NextResponse.json({ 
        success: true, 
        id: existingRecord.user_id,
        message: "既存レコードを更新しました"
      })
    }

    // 新規レコード作成
    const timestamp = getJSTTimestamp()
    
    // 既存のテーブル構造に完全に合わせてV2データを保存
    const diagnosisData = {
      user_id: sessionId,
      current_step: isInitialSave ? 1 : 4, // 初期保存時は1、完了時は4
      version_type: 'v2', // 新しいカラム
      
      // 基本的なv2回答データ
      q1: answers.satisfaction || "",
      q2: answers.night_thoughts || "",
      q3: answers.demographics?.age || "",
      q4: answers.demographics?.job || "",
      q5: answers.money_reality || "",
      
      // 結果データ（既存フィールドのみ使用）
      simple_type: result.type || null,
      simple_summary: result.summary || null,
      simple_advice: result.advice || null,
      final_type: result.type ? `v2_${result.type}` : null,
      
      // クリックしたサービス履歴
      clicked_services: body.clickedServices || [],
      
      // メタデータ（user_agentカラムは存在しないため削除）
      created_at: timestamp,
      updated_at: timestamp,
    }

    console.log("保存するデータ:", diagnosisData)
    console.log("version_type設定値:", diagnosisData.version_type)
    console.log("final_type設定値:", diagnosisData.final_type)
    console.log("result.type元データ:", result.type)

    const { data, error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .insert(diagnosisData)
      .select("user_id")
      .single()

    if (error) {
      console.error("❌ Supabase保存エラー:", error)
      console.error("❌ エラーコード:", error.code)
      console.error("❌ エラーメッセージ:", error.message)
      console.error("❌ エラー詳細:", error.details)
      return NextResponse.json(
        { error: "データベース保存に失敗しました", details: error.message },
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