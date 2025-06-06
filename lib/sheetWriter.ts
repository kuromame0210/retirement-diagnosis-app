// src/lib/sheetWriter.ts
import { google } from 'googleapis'

const scopes = ['https://www.googleapis.com/auth/spreadsheets']
const sheetId = process.env.GOOGLE_SHEET_ID!

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  undefined,
  process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes
)
const sheets = google.sheets({ version: 'v4', auth })

export async function appendRow(values: (string | number | null)[]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'シート1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [values] },
  })
}
