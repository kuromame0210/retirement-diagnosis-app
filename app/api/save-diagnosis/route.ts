import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { UAParser } from "ua-parser-js"

// 日本時間（JST）のタイムスタンプを取得する関数
const getJSTTimestamp = (): string => {
  // PostgreSQLのtimestamptz型は自動的にUTCで保存されるため
  // データベース側でタイムゾーン変換を行う
  return new Date().toISOString()
}

// Supabase/PostgreSQL用のJST変換SQL関数
const getJSTTimestampSQL = () => {
  return `timezone('Asia/Tokyo', now())`
}

/* ───────── ① 追加：IP & Geo を取得 ───────── */
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


/* セッションJSON → テーブル行へマッピング */
function mapSessionToRow(s: any) {
  return {
    user_id:              s.userId,
    current_step:         s.currentStep,

    /* 基本診断 */
    q1: s.basicAnswers?.q1,
    q2: s.basicAnswers?.q2,
    q3: s.basicAnswers?.q3,
    q4: s.basicAnswers?.q4,
    q5: s.basicAnswers?.q5,

    /* テキスト入力 */
    text_input: s.textInput,

    /* チャット（最大５ターン） */
    chat_q1: s.chatHistory?.[0]?.question,
    chat_a1: s.chatHistory?.[0]?.answer,
    chat_q2: s.chatHistory?.[1]?.question,
    chat_a2: s.chatHistory?.[1]?.answer,
    chat_q3: s.chatHistory?.[2]?.question,
    chat_a3: s.chatHistory?.[2]?.answer,
    chat_q4: s.chatHistory?.[3]?.question,
    chat_a4: s.chatHistory?.[3]?.answer,
    chat_q5: s.chatHistory?.[4]?.question,
    chat_a5: s.chatHistory?.[4]?.answer,

    /* クリック履歴（先頭５件）*/
    ...(s.clickedServices || []).slice(0, 5).reduce((acc: any, cur: any, i: number) => {
      acc[`click${i + 1}_id`] = cur.id
      acc[`click${i + 1}_at`] = cur.clickedAt
      return acc
    }, {}),

    /* クリック履歴をJSONとしても保存 */
    clicked_services: s.clickedServices || [],

    /* 簡易診断 */
    simple_type:    s.simpleResult?.type,
    simple_urgency: s.simpleResult?.urgency,
    simple_summary: s.simpleResult?.summary,
    simple_advice:  s.simpleResult?.advice,
    needs_detail:   s.simpleResult?.needsDetailedAnalysis,

    /* 最終診断（抜粋） */
    final_type:          s.finalResult?.finalType,
    final_urgency:       s.finalResult?.urgencyLevel,
    final_situation:     s.finalResult?.currentSituation,
    final_action1:       s.finalResult?.recommendedActions?.[0]?.action,
    final_action2:       s.finalResult?.recommendedActions?.[1]?.action,
    final_long_strategy: s.finalResult?.longTermStrategy,
  }
}

/* ───────── ③ POST ハンドラ ───────── */
export async function POST(req: NextRequest) {
  try {
    const { session } = await req.json()
    if (!session?.userId) {
      return NextResponse.json({ error: "missing userId" }, { status: 400 })
    }

    console.log("[save-diagnosis] Processing userId:", session.userId)
    console.log("[save-diagnosis] Session timestamps:", {
      startedAt: session.startedAt,
      updatedAt: session.updatedAt,
      completedAt: session.completedAt
    })
    
    // デバッグ：現在時刻との比較
    const now = new Date()
    const sessionStarted = new Date(session.startedAt)
    console.log("[save-diagnosis] Time comparison:", {
      serverNow: now.toISOString(),
      sessionStarted: sessionStarted.toISOString(),
      timeDiffHours: (now.getTime() - sessionStarted.getTime()) / (1000 * 60 * 60)
    })

    /* --- 既存ユーザーチェック --- */
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("career_user_diagnosis")
      .select("user_id, current_step, updated_at")
      .eq("user_id", session.userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("[save-diagnosis] Error checking existing user:", checkError)
      throw checkError
    }

    if (existingUser) {
      console.log("[save-diagnosis] Existing user found:", {
        userId: existingUser.user_id,
        currentStep: existingUser.current_step,
        lastUpdated: existingUser.updated_at
      })
      
      // 既存ユーザーの場合は更新のみ（重要なデータのみ）
      const updateData = {
        current_step: session.currentStep,
        version_type: 'v1', // v1診断として明示
        updated_at: session.updatedAt, // セッションのタイムスタンプをそのまま使用
        // クリックしたサービス履歴を更新
        clicked_services: session.clickedServices || [],
        // 診断結果がある場合のみ更新
        ...(session.simpleResult && {
          simple_type: session.simpleResult.type,
          simple_urgency: session.simpleResult.urgency,
          simple_summary: session.simpleResult.summary,
          simple_advice: session.simpleResult.advice,
          needs_detail: session.simpleResult.needsDetailedAnalysis,
        }),
        ...(session.finalResult && {
          final_type: session.finalResult.finalType,
          final_urgency: session.finalResult.urgencyLevel,
          final_situation: session.finalResult.currentSituation,
          final_action1: session.finalResult.recommendedActions?.[0]?.action,
          final_action2: session.finalResult.recommendedActions?.[1]?.action,
          final_long_strategy: session.finalResult.longTermStrategy,
        }),
      }

      const { error: updateError } = await supabaseAdmin
        .from("career_user_diagnosis")
        .update(updateData)
        .eq("user_id", session.userId)

      if (updateError) throw updateError
      
      console.log("[save-diagnosis] Existing user updated successfully")
      return NextResponse.json({ ok: true, action: "updated" })
    }

    /* --- 新規ユーザーの場合：フル作成 --- */
    console.log("[save-diagnosis] New user, creating full record")

    /* --- 追加部分: IP / Geo / Device --- */
    const ip  = getClientIp(req)
    const geo = getGeo(req)
    const uaParser = new UAParser(req.headers.get("user-agent") || "")
    const device   = uaParser.getDevice()
    const os       = uaParser.getOS()
    const browser  = uaParser.getBrowser()

    /* --- 既存マッピング + 追加入力 --- */
    const row = {
      ...mapSessionToRow(session),

      version_type:   'v1', // v1診断として明示
      client_ip:     ip,
      country_code:  geo.country,
      region_code:   geo.region,

      device_type:    device.type ?? "desktop",
      device_os:      os.name    ?? null,
      device_browser: browser.name ?? null,
      
      // セッションのタイムスタンプをそのまま使用（ローカルストレージと同じ）
      created_at: session.startedAt,
      updated_at: session.updatedAt,
    }

    const { error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .insert(row)   // 新規の場合はinsert

    if (error) throw error
    
    console.log("[save-diagnosis] New user created successfully")
    return NextResponse.json({ ok: true, action: "created" })
  } catch (e: any) {
    console.error("[save-diagnosis]", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}