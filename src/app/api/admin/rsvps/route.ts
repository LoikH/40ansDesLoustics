import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.join(process.cwd(), "data", "rsvps.json");

type StoredRSVP = {
  id: string;
  createdAt: string;
  updatedAt: string;
  dedupeKey: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  attending: boolean;
  guests: number;
  message?: string;
};

async function readAll(): Promise<StoredRSVP[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as StoredRSVP[];
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const attending = url.searchParams.get("attending"); // "yes" | "no" | null

  const all = await readAll();

  const filtered =
    attending === "yes"
      ? all.filter((x) => x.attending)
      : attending === "no"
        ? all.filter((x) => !x.attending)
        : all;

  return NextResponse.json({ count: filtered.length, items: filtered });
}
