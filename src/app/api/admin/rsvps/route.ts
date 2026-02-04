import { NextResponse } from 'next/server';
import { google } from 'googleapis';

function getAuth() {
  const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64 ?? '';
  if (!b64) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON_B64');

  const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));

  return new google.auth.JWT({
    email: json.client_email,
    key: json.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

function getSheetInfo() {
  const spreadsheetId = process.env.GSHEET_ID ?? '';
  const tab = process.env.GSHEET_TAB ?? 'RSVP';
  if (!spreadsheetId) throw new Error('Missing GSHEET_ID');
  return { spreadsheetId, tab };
}

async function getAllRows(): Promise<string[][]> {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = getSheetInfo();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A1:Z`,
  });

  return (res.data.values as string[][]) ?? [];
}

type StoredRSVP = {
  id: string;
  createdAt: string;
  updatedAt: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  attending: boolean;
  adultPartner: boolean;
  children: {
    count: number; // kids_total
    ageRanges: { '0-3': number; '4-10': number; '11-17': number };
  };
  message?: string;
};

function toBoolYesNo(v: string) {
  const s = (v ?? '').toString().trim().toLowerCase();
  return s === 'yes' || s === 'true' || s === '1' || s === 'oui';
}

function toInt(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const attendingFilter = url.searchParams.get('attending'); // yes | no | null

    const values = await getAllRows();
    const rows = values.slice(1); // remove header

    // Indices 0-based: A..N
    const COL_ID = 0;
    const COL_CREATED = 1;
    const COL_UPDATED = 2;
    const COL_CODE = 3;
    const COL_NAME = 4;
    const COL_EMAIL = 5;
    const COL_PHONE = 6;
    const COL_ATTENDING = 7;
    const COL_PARTNER = 8;
    const COL_K03 = 9;
    const COL_K410 = 10;
    const COL_K1117 = 11;
    const COL_KTOTAL = 12;
    const COL_MESSAGE = 13;

    let items: StoredRSVP[] = rows
      .filter((r) => r && r.length > 0)
      .map((r) => {
        const attending = toBoolYesNo(String(r[COL_ATTENDING] ?? ''));
        const adultPartner = toBoolYesNo(String(r[COL_PARTNER] ?? ''));

        const k03 = toInt(r[COL_K03]);
        const k410 = toInt(r[COL_K410]);
        const k1117 = toInt(r[COL_K1117]);

        // kids_total = valeur sheet, sinon somme des tranches (fallback)
        const kidsTotalRaw = toInt(r[COL_KTOTAL]);
        const kidsTotal = kidsTotalRaw > 0 ? kidsTotalRaw : k03 + k410 + k1117;

        return {
          id: String(r[COL_ID] ?? ''),
          createdAt: String(r[COL_CREATED] ?? ''),
          updatedAt: String(r[COL_UPDATED] ?? ''),
          code: String(r[COL_CODE] ?? ''),
          name: String(r[COL_NAME] ?? ''),
          email: String(r[COL_EMAIL] ?? '') || undefined,
          phone: String(r[COL_PHONE] ?? '') || undefined,
          attending,
          adultPartner,
          children: {
            count: attending ? kidsTotal : 0,
            ageRanges: attending
              ? { '0-3': k03, '4-10': k410, '11-17': k1117 }
              : { '0-3': 0, '4-10': 0, '11-17': 0 },
          },
          message: String(r[COL_MESSAGE] ?? '') || undefined,
        };
      });

    // Filtre yes/no
    if (attendingFilter === 'yes') items = items.filter((x) => x.attending);
    if (attendingFilter === 'no') items = items.filter((x) => !x.attending);

    // Tri: plus récent en premier (updatedAt)
    items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('ADMIN RSVPS SHEETS ERROR:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
