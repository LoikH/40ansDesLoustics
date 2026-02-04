import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { rsvpSchema } from '@/lib/rsvpSchema';
import { VALID_CODES } from '@/lib/inviteCodes';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return (hasPlus ? '+' : '') + digits;
}

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

async function appendRow(row: (string | number)[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = getSheetInfo();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:Z`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function updateRow(rowIndex1Based: number, row: (string | number)[]) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const { spreadsheetId, tab } = getSheetInfo();

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowIndex1Based}:Z${rowIndex1Based}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

/**
 * Colonnes attendues (ligne 1 = header) :
 * A id
 * B createdAt
 * C updatedAt
 * D code
 * E name
 * F email
 * G phone
 * H attending (yes/no)
 * I adultPartner (yes/no)
 * J kids_0_3
 * K kids_4_10
 * L kids_11_17
 * M kids_total
 * N message
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = rsvpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: 'Données invalides' },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // ✅ Normalisation enfants: count = somme des tranches d'âge
    const ages = input.children?.ageRanges ?? {
      '0-3': 0,
      '4-10': 0,
      '11-17': 0,
    };
    const kidsCount =
      (ages['0-3'] ?? 0) + (ages['4-10'] ?? 0) + (ages['11-17'] ?? 0);

    const attending = Boolean(input.attending);

    const normalizedInput = {
      ...input,
      adultPartner: attending ? Boolean(input.adultPartner) : false,
      children: attending
        ? { count: kidsCount, ageRanges: ages }
        : { count: 0, ageRanges: { '0-3': 0, '4-10': 0, '11-17': 0 } },
    };

    if (!VALID_CODES.has(normalizedInput.code)) {
      return NextResponse.json(
        { ok: false, message: 'Code d’invitation invalide 😬' },
        { status: 403 }
      );
    }

    const email = normalizedInput.email
      ? normalizeEmail(normalizedInput.email)
      : '';
    const phone = normalizedInput.phone
      ? normalizePhone(normalizedInput.phone)
      : '';

    if (!email && !phone) {
      return NextResponse.json(
        { ok: false, message: 'Email ou téléphone requis' },
        { status: 400 }
      );
    }

    // Lire toutes les lignes (pour dédoublonnage email OU téléphone)
    const values = await getAllRows();
    const rows = values.slice(1); // sans header

    // Indices 0-based
    const COL_ID = 0; // A
    const COL_CREATED = 1; // B
    const COL_EMAIL = 5; // F
    const COL_PHONE = 6; // G

    let matchRowIndex1Based: number | null = null;
    let existingId = '';
    let existingCreatedAt = '';

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] ?? [];
      const re = String(r[COL_EMAIL] ?? '')
        .trim()
        .toLowerCase();
      const rp = String(r[COL_PHONE] ?? '').trim();

      if ((email && re === email) || (phone && rp === phone)) {
        matchRowIndex1Based = i + 2; // +1 header, +1 1-based
        existingId = String(r[COL_ID] ?? '');
        existingCreatedAt = String(r[COL_CREATED] ?? '');
        break;
      }
    }

    const now = new Date().toISOString();

    const id = existingId || crypto.randomUUID();
    const createdAt = existingCreatedAt || now;

    const kids03 = normalizedInput.children.ageRanges['0-3'] ?? 0;
    const kids410 = normalizedInput.children.ageRanges['4-10'] ?? 0;
    const kids1117 = normalizedInput.children.ageRanges['11-17'] ?? 0;
    const kidsTotal = normalizedInput.children.count ?? 0;

    const row: (string | number)[] = [
      id,
      createdAt,
      now,
      normalizedInput.code ?? '',
      normalizedInput.name ?? '',
      email,
      phone,
      attending ? 'yes' : 'no',
      normalizedInput.adultPartner ? 'yes' : 'no',
      kids03,
      kids410,
      kids1117,
      kidsTotal,
      normalizedInput.message ?? '',
    ];

    if (matchRowIndex1Based) {
      await updateRow(matchRowIndex1Based, row);
      return NextResponse.json({
        ok: true,
        message: 'Réponse mise à jour ✅ Merci !',
      });
    }

    await appendRow(row);
    return NextResponse.json({
      ok: true,
      message: 'Réponse enregistrée ✅ Merci !',
    });
  } catch (err) {
    console.error('RSVP SHEETS ERROR:', err);
    return NextResponse.json(
      { ok: false, message: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
