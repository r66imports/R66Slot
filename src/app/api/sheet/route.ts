import { NextResponse } from "next/server";
import { getSheetsClient } from "../../../../server/utils/googleAuth";

export async function GET() {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID!;
    if (!spreadsheetId) return NextResponse.json({ error: "Missing GOOGLE_SHEET_ID" }, { status: 400 });
    const range = "Sheet1!A1:Z100";
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const rows = resp.data.values || [];
    return NextResponse.json({ rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
