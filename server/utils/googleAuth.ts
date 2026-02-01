import { google } from "googleapis";

function getCredentials() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!b64) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_B64");
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json);
}

export function getSheetsClient() {
  const credentials = getCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return google.sheets({ version: "v4", auth });
}
