import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { rsvpSchema } from "@/lib/rsvpSchema";

const DATA_FILE = path.join(process.cwd(), "data", "rsvps.json");
import { VALID_CODES } from "@/lib/inviteCodes";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  return (hasPlus ? "+" : "") + digits;
}

async function readAll() {
  try {
    return JSON.parse(await fs.readFile(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

async function writeAll(data: any[]) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const input = parsed.data;
    if (!VALID_CODES.has(input.code)) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const email = input.email ? normalizeEmail(input.email) : "";
    const phone = input.phone ? normalizePhone(input.phone) : "";
    if (!email && !phone) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const all = await readAll();
    const idx = all.findIndex((x: any) => {
      const xe = x.email ? normalizeEmail(x.email) : "";
      const xp = x.phone ? normalizePhone(x.phone) : "";
      return (email && xe === email) || (phone && xp === phone);
    });

    const now = new Date().toISOString();
    const entry = {
      ...input,
      email: email || undefined,
      phone: phone || undefined,
      id: idx >= 0 ? all[idx].id : crypto.randomUUID(),
      createdAt: idx >= 0 ? all[idx].createdAt : now,
      updatedAt: now,
    };

    if (idx >= 0) all[idx] = entry;
    else all.unshift(entry);

    await writeAll(all);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
