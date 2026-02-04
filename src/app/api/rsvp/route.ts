import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { rsvpSchema } from '@/lib/rsvpSchema';

const DATA_FILE = path.join(process.cwd(), 'data', 'rsvps.json');
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

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function writeAll(data: any[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
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

    // si pas présent, on force famille à 0
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

    const email = normalizedInput.email ? normalizeEmail(input.email) : '';
    const phone = normalizedInput.phone ? normalizePhone(input.phone) : '';
    if (!email && !phone) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const all = await readAll();
    const idx = all.findIndex((x: any) => {
      const xe = x.email ? normalizeEmail(x.email) : '';
      const xp = x.phone ? normalizePhone(x.phone) : '';
      return (email && xe === email) || (phone && xp === phone);
    });

    const now = new Date().toISOString();
    const entry = {
      ...normalizedInput,
      email: email || undefined,
      phone: phone || undefined,
      id: idx >= 0 ? all[idx].id : crypto.randomUUID(),
      createdAt: idx >= 0 ? all[idx].createdAt : now,
      updatedAt: now,
    };

    if (idx >= 0) all[idx] = entry;
    else all.unshift(entry);

    await writeAll(all);

    return NextResponse.json({
      ok: true,
      message: 'Réponse enregistrée ✅ Merci !',
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
