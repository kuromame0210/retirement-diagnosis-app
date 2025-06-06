// src/app/api/log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { appendRow } from '@/lib/sheetWriter'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    /* 期待する body 例
       {
         time: "2025-06-02T12:34:00Z",
         userId: "uuid-xxxx",
         currentStep: 3,
         label: "next_question",
         answers: "{\"q1\":\"quit\"}"
       }
    */

    await appendRow([
      body.time,
      body.userId,
      body.currentStep ?? '',
      body.label ?? '',
      body.answers ?? '',
    ])

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Sheets append error', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
