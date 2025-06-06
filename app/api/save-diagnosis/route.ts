import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

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

export async function POST(req: NextRequest) {
  try {
    const { session } = await req.json()
    const row = mapSessionToRow(session)
    console.log("row", {row})

    const { error } = await supabaseAdmin
      .from("career_user_diagnosis")
      .upsert(row, { onConflict: "user_id" })

    console.log("error", {error})

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error("[save-diagnosis]", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}