"use client";

import { useEffect, useMemo, useState } from "react";

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
    count: number;
    ageRanges: { "0-3": number; "4-10": number; "11-17": number };
  };
  message?: string;
};

function formatKids(children?: {
  count: number;
  ageRanges?: { "0-3": number; "4-10": number; "11-17": number };
}) {
  const count = children?.count ?? 0;
  if (count <= 0) return { label: "👶 Aucun", detail: "" };

  const r = children?.ageRanges;
  const parts: string[] = [];

  if (r) {
    if ((r["0-3"] ?? 0) > 0) parts.push(`0–3: ${r["0-3"]}`);
    if ((r["4-10"] ?? 0) > 0) parts.push(`4–10: ${r["4-10"]}`);
    if ((r["11-17"] ?? 0) > 0) parts.push(`11–17: ${r["11-17"]}`);
  }

  if (parts.length === 0) return { label: `👶 ${count} enfant(s)`, detail: "âge non précisé" };
  return { label: `👶 ${count} enfant(s)`, detail: parts.join(" · ") };
}

export default function AdminPage() {
  const [filter, setFilter] = useState<"all" | "yes" | "no">("all");
  const [items, setItems] = useState<StoredRSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      const url =
        filter === "yes"
          ? "/api/admin/rsvps?attending=yes"
          : filter === "no"
            ? "/api/admin/rsvps?attending=no"
            : "/api/admin/rsvps";

      const res = await fetch(url, {
  cache: "no-store",
  headers: {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN}`,
  },
});
      if (!res.ok) throw new Error("Fetch admin failed");

      const json = (await res.json()) as { items: StoredRSVP[] };
      if (!cancelled) setItems(json.items ?? []);
      if (!cancelled) setLoading(false);
    }

    load().catch((e) => {
      if (!cancelled) {
        setErr(e?.message ?? "Erreur");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filter]);

  const totalPeople = useMemo(() => {
    return items.reduce((acc, x) => {
      if (!x.attending) return acc;
      const adults = 1 + (x.adultPartner ? 1 : 0);
      const kids = x.children?.count ?? 0;
      return acc + adults + kids;
    }, 0);
  }, [items]);

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">
              Admin <span className="text-red-500">RSVP</span>
            </h1>
            <p className="mt-2 text-white/70">
              {loading ? "Chargement..." : `${items.length} réponse(s)`} — total personnes (selon filtre) ≈{" "}
              <span className="font-bold text-white">{totalPeople}</span>
            </p>
            {err && <p className="mt-2 text-red-400">{err}</p>}
          </div>

          <div className="flex gap-2">
            <button className={`btn ${filter === "all" ? "btnActive" : ""}`} onClick={() => setFilter("all")}>
              Tout
            </button>
            <button className={`btn ${filter === "yes" ? "btnActive" : ""}`} onClick={() => setFilter("yes")}>
              Oui
            </button>
            <button className={`btn ${filter === "no" ? "btnActive" : ""}`} onClick={() => setFilter("no")}>
              Non
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/70">
              <tr>
                <th className="p-3">Nom</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Présence</th>
                <th className="p-3">Famille</th>
                <th className="p-3">Maj</th>
                <th className="p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((x) => {
                const adults = 1 + (x.adultPartner ? 1 : 0);
                const kidsInfo = formatKids(x.children);
                return (
                  <tr key={x.id} className="border-b border-white/5 last:border-b-0">
                    <td className="p-3 font-semibold">{x.name}</td>
                    <td className="p-3 text-white/70">
                      <div>{x.email ?? "-"}</div>
                      <div>{x.phone ?? "-"}</div>
                    </td>
                    <td className="p-3">
                      <span className={`tag ${x.attending ? "tagYes" : "tagNo"}`}>
                        {x.attending ? "Oui" : "Non"}
                      </span>
                    </td>
                    <td className="p-3 text-white/70">
		      <td className="p-3 text-white/70">
  		        <div>🧑 {adults} adulte(s)</div>
			  <div>
			    {kidsInfo.label}
			    {kidsInfo.detail ? <span className="text-white/50"> — {kidsInfo.detail}</span> : null}
			  </div>
			</td>
		    </td>
                    <td className="p-3 text-white/60">
                      {x.updatedAt ? new Date(x.updatedAt).toLocaleString("fr-FR") : "-"}
                    </td>
                    <td className="p-3 text-white/70">{x.message ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && <div className="p-4 text-white/60">Chargement…</div>}
          {!loading && items.length === 0 && <div className="p-4 text-white/60">Aucune réponse.</div>}
        </div>

        <style jsx global>{`
          .btn {
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 10px 12px;
            border-radius: 14px;
            font-weight: 800;
            font-size: 12px;
            background: rgba(0, 0, 0, 0.35);
          }
          .btnActive {
            background: #ff2b2b;
            border-color: #ff2b2b;
            color: #000;
          }
          .tag {
            border-radius: 10px;
            padding: 4px 8px;
            font-size: 12px;
            font-weight: 900;
          }
          .tagYes {
            background: #ff2b2b;
            color: #000;
          }
          .tagNo {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
          }
        `}</style>
      </div>
    </main>
  );
}
