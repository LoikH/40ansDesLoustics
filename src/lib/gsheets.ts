import { google } from 'googleapis';

type Row = (string | number | boolean | null)[];

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ?? '';
  if (!b64) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON_B64');

  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));

  return new google.auth.JWT({
    email: json.client_email,
    key: json.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function sheetInfo() {
  const spreadsheetId = process.env.GSHEET_ID ?? '';
  const tab = process.env.GSHEET_TAB ?? 'RSVP';
  if (!spreadsheetId) throw new Error('Missing GSHEET_ID');
  return { spreadsheetId, tab };
}

export async function getAllRows(): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = sheetInfo();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:Z`,
  });

  return (res.data.values as string[][]) ?? [];
}

export async function appendRow(row: Row) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = sheetInfo();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

export async function updateRow(rowIndex1Based: number, row: Row) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = sheetInfo();

  // rowIndex1Based inclut la ligne 1 (header). Ex: 2 = 1ère data row.
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowIndex1Based}:Z${rowIndex1Based}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}
