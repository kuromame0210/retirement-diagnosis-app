import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { UAParser } from "ua-parser-js"
import { getJSTTimestamp } from "@/lib/utils/timestamp"

/* ───────── IP & Geo を取得 ───────── */
function getClientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for")
  return fwd ? fwd.split(",")[0].trim() : "0.0.0.0"
}

function getGeo(req: NextRequest) {
  // Vercel Edge が自動で付ける地理ヘッダー
  return {
    country: req.headers.get("x-vercel-ip-country") ?? null,
    region:  req.headers.get("x-vercel-ip-country-region") ?? null,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      sessionId, 
      answers, 
      result, 
      clickedServices, 
      userAgent, 
      prefecture,
      currentStep,
      updateType, 
      isUpdate,
      checkOnly 
    } = body


    // 存在確認のみのリクエストの場合
    if (checkOnly) {
      if (!sessionId) {
        return NextResponse.json({ exists: false })
      }

      const { data: existingRecord } = await supabaseAdmin
        .from("career_user_diagnosis")
        .select("user_id")
        .eq("user_id", sessionId)
        .single()

      return NextResponse.json({ exists: !!existingRecord })
    }

    // 必須データの検証
    if (!sessionId) {
      return NextResponse.json(
        { error: "セッションIDが必要です" },
        { status: 400 }
      )
    }
    
    // クリック履歴のみの更新の場合
    if (updateType === 'click_history_only') {
      
      if (!clickedServices) {
        console.error("❌ クリック履歴が不足")
        return NextResponse.json(
          { error: "クリック履歴が不足しています" },
          { status: 400 }
        )
      }
      
      // クリック履歴のみを更新
      
      const { error: updateError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .update({
          clicked_services: clickedServices
        })
        .eq("user_id", sessionId)
      
      if (updateError) {
        console.error("❌ クリック履歴更新エラー:", updateError)
        return NextResponse.json(
          { error: "クリック履歴更新に失敗しました", details: updateError.message },
          { status: 500 }
        )
      }
      return NextResponse.json({ 
        success: true, 
        id: sessionId,
        message: "クリック履歴を更新しました"
      })
    }

    // 更新タイプに応じた必須データ検証
    if (updateType === 'diagnosis_completed') {
      if (!answers) {
        console.error("❌ 診断完了時に回答データが不足")
        return NextResponse.json(
          { error: "回答データが必要です" },
          { status: 400 }
        )
      }
    } else if (updateType === 'result_completed') {
      if (!answers || !result) {
        console.error("❌ 結果完了時に必要なデータが不足:", { answers: !!answers, result: !!result })
        return NextResponse.json(
          { error: "回答データと結果データが必要です" },
          { status: 400 }
        )
      }
    } else if (updateType === 'diagnosis_started' || updateType === 'session_update') {
      // セッション作成・更新時は最小限のデータでOK
    }

    // 既存レコードの確認（isUpdateフラグまたは自動判定）
    let recordExists = isUpdate
    if (isUpdate === undefined) {
      const { data: existingRecord, error: selectError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .select("user_id")
        .eq("user_id", sessionId)
        .single()
      
      if (selectError) {
        recordExists = false
      } else {
        recordExists = !!existingRecord
      }
    }

    if (recordExists) {
      
      // 更新データを構築（既存スキーマに完全準拠）
      const updateData: any = {
        version_type: 'v2',
        updated_at: getJSTTimestamp(), // V1と同じくJSTタイムスタンプを明示設定
        client_ip: getClientIp(request) // V1と同じくIPアドレス取得
      }

      // current_stepの設定（V2セッションからの値を優先）
      if (currentStep !== null && currentStep !== undefined) {
        updateData.current_step = currentStep // V2セッションからの実際のステップ値を使用
      } else if (updateType === 'diagnosis_started') {
        updateData.current_step = 1 // 診断開始段階
      } else if (updateType === 'diagnosis_completed') {
        updateData.current_step = 2 // 診断完了段階
      } else if (updateType === 'result_completed') {
        updateData.current_step = 4 // 最終完了段階
      }

      // 回答データの保存（診断完了時または結果完了時）
      if (answers && (updateType === 'diagnosis_completed' || updateType === 'result_completed')) {
        updateData.q1 = answers.satisfaction || ""
        updateData.q2 = answers.night_thoughts || ""
        updateData.q3 = answers.demographics?.age || ""
        updateData.q4 = answers.demographics?.job || ""
        updateData.q5 = answers.money_reality || ""
        
        // V2専用データをtext_inputにJSON保存
        updateData.text_input = JSON.stringify({
          breaking_point: answers.breaking_point || [],
          escape_plan: answers.escape_plan || "",
          ideal_future: answers.ideal_future || "",
          skill_confidence: answers.skill_confidence || "",
          relationship_reality: answers.relationship_reality || "",
          action_readiness: answers.action_readiness || "",
          freeText: answers.freeText || ""
        })
      }

      // 結果データの保存（結果完了時のみ）
      if (result && updateType === 'result_completed') {
        updateData.simple_type = result.type
        updateData.simple_urgency = result.urgency
        updateData.simple_summary = result.summary
        updateData.simple_advice = result.advice
        updateData.needs_detail = true // V2は詳細診断
        updateData.final_type = `v2_${result.type}`
        updateData.final_urgency = result.urgency
        updateData.final_situation = result.summary
        updateData.final_action1 = result.actionPlan?.[0] || null
        updateData.final_action2 = result.actionPlan?.[1] || null
        updateData.final_long_strategy = result.actionPlan?.[2] || null
      }

      // クリック履歴の保存（V1と同じく常に設定）
      updateData.clicked_services = clickedServices || []

      // デバイス情報の保存（V1と同じくUAParser使用）
      if (userAgent) {
        const uaParser = new UAParser(userAgent)
        const device = uaParser.getDevice()
        const os = uaParser.getOS()
        const browser = uaParser.getBrowser()
        
        updateData.device_type = device.type ?? "desktop"
        updateData.device_os = os.name ?? null
        updateData.device_browser = browser.name ?? null
      }

      // 地域情報の保存（V1と同じく）
      if (prefecture) {
        const geo = getGeo(request)
        updateData.country_code = geo.country
        updateData.region_code = geo.region || prefecture
      }
      
      const { error: updateError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .update(updateData)
        .eq("user_id", sessionId)
      
      if (updateError) {
        console.error("❌ 既存レコード更新エラー:", updateError)
        
        // 更新失敗の場合は新規作成にフォールバック
        recordExists = false
      } else {
        console.log("🎯 [DB Update]", {
          userId: sessionId,
          step: updateData.current_step,
          updatedAt: updateData.updated_at
        })
        
        return NextResponse.json({ 
          success: true, 
          id: sessionId,
          message: "既存レコードを更新しました"
        })
      }
    }

    // 新規レコード作成（既存スキーマに完全準拠）
    
    /* --- IP / Geo / Device 情報取得（V1と同じ） --- */
    const ip = getClientIp(request)
    const geo = getGeo(request)
    const uaParser = new UAParser(userAgent || "")
    const device = uaParser.getDevice()
    const os = uaParser.getOS()
    const browser = uaParser.getBrowser()
    
    const diagnosisData: any = {
      user_id: sessionId,
      version_type: 'v2',
      client_ip: ip,
      country_code: geo.country,
      region_code: geo.region || prefecture,
      device_type: device.type ?? "desktop",
      device_os: os.name ?? null,
      device_browser: browser.name ?? null,
      created_at: getJSTTimestamp(), // V1と同じく明示的に設定
      updated_at: getJSTTimestamp()  // V1と同じく明示的に設定
    }

    // current_stepの設定（V2セッションからの値を優先）
    if (currentStep !== null && currentStep !== undefined) {
      diagnosisData.current_step = currentStep // V2セッションからの実際のステップ値を使用
    } else if (updateType === 'diagnosis_started') {
      diagnosisData.current_step = 1 // 診断開始段階
    } else if (updateType === 'diagnosis_completed') {
      diagnosisData.current_step = 2 // 診断完了段階
    } else if (updateType === 'result_completed') {
      diagnosisData.current_step = 4 // 最終完了段階
    } else {
      diagnosisData.current_step = 1 // デフォルト：初期段階
    }

    // 回答データの保存
    if (answers) {
      diagnosisData.q1 = answers.satisfaction || ""
      diagnosisData.q2 = answers.night_thoughts || ""
      diagnosisData.q3 = answers.demographics?.age || ""
      diagnosisData.q4 = answers.demographics?.job || ""
      diagnosisData.q5 = answers.money_reality || ""
      
      // V2専用データをtext_inputにJSON保存
      diagnosisData.text_input = JSON.stringify({
        breaking_point: answers.breaking_point || [],
        escape_plan: answers.escape_plan || "",
        ideal_future: answers.ideal_future || "",
        skill_confidence: answers.skill_confidence || "",
        relationship_reality: answers.relationship_reality || "",
        action_readiness: answers.action_readiness || "",
        freeText: answers.freeText || ""
      })
    }

    // 結果データの保存
    if (result) {
      diagnosisData.simple_type = result.type
      diagnosisData.simple_urgency = result.urgency
      diagnosisData.simple_summary = result.summary
      diagnosisData.simple_advice = result.advice
      diagnosisData.needs_detail = true // V2は詳細診断
      diagnosisData.final_type = `v2_${result.type}`
      diagnosisData.final_urgency = result.urgency
      diagnosisData.final_situation = result.summary
      diagnosisData.final_action1 = result.actionPlan?.[0] || null
      diagnosisData.final_action2 = result.actionPlan?.[1] || null
      diagnosisData.final_long_strategy = result.actionPlan?.[2] || null
    }

    // クリック履歴の保存（V1と同じく常に設定）
    diagnosisData.clicked_services = clickedServices || []


    const { data, error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .insert(diagnosisData)
      .select("user_id")
      .single()

    if (error) {
      console.error("❌ 新規レコード作成エラー:", error)
      
      // より詳細なエラー情報をログ出力
      console.error("作成失敗データ:", JSON.stringify(diagnosisData, null, 2))
      console.error("エラー詳細:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      
      return NextResponse.json(
        { 
          error: "新規レコード作成に失敗しました", 
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log("🎯 [DB Create]", {
      userId: data.user_id,
      step: diagnosisData.current_step,
      createdAt: diagnosisData.created_at
    })

    return NextResponse.json({
      success: true,
      id: data.user_id,
      message: "新規レコードを作成しました"
    })

  } catch (error) {
    console.error("❌ V2診断保存API例外エラー:", error)
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    )
  }
}