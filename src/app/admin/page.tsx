"use client";

export const dynamic = "force-dynamic";

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

async function fetchRsvps(attending?: "yes" | "no") {
  const url = attending ? `/api/admin/rsvps?attending=${attending}` : "/api/admin/rsvps";
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  return (await res.json()) as { count: number; items: StoredRSVP[] };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: { attending?: "yes" | "no" };
}) {
  const attending = searchParams?.attending;
  const data = await fetchRsvps(attending);

  const totalGuests = data.items.reduce((acc, x) => acc + (x.attending ? 1 + x.guests : 0), 0);

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">
              Admin <span className="text-red-500">RSVP</span>
            </h1>
            <p className="mt-2 text-white/70">
              {data.count} réponse(s) — total personnes (oui) ≈{" "}
              <span className="font-bold text-white">{totalGuests}</span>
            </p>
          </div>

          <div className="flex gap-2">
            <a className={`btn ${!attending ? "btnActive" : ""}`} href="/admin">Tout</a>
            <a className={`btn ${attending === "yes" ? "btnActive" : ""}`} href="/admin?attending=yes">YES</a>
            <a className={`btn ${attending === "no" ? "btnActive" : ""}`} href="/admin?attending=no">NO</a>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 text-white/70">
              <tr>
                <th className="p-3">Nom</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Présence</th>
                <th className="p-3">+ invités</th>
                <th className="p-3">Maj</th>
                <th className="p-3">Message</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((x) => (
                <tr key={x.id} className="border-b border-white/5 last:border-b-0">
                  <td className="p-3 font-semibold">{x.name}</td>
                  <td className="p-3 text-white/70">
                    <div>{x.email ?? "-"}</div>
                    <div>{x.phone ?? "-"}</div>
                  </td>
                  <td className="p-3">
                    <span className={`tag ${x.attending ? "tagYes" : "tagNo"}`}>
                      {x.attending ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="p-3">{x.attending ? x.guests : "-"}</td>
                  <td className="p-3 text-white/60">
                    {new Date(x.updatedAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="p-3 text-white/70">{x.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-white/50">
          Dédoublonnage via email/portable → une seule réponse par personne.
        </p>

        <style jsx global>{`
          body { background: #0b0b0b; color: #f5f5f5; }
          .btn {
            border: 1px solid rgba(255,255,255,0.15);
            padding: 10px 12px;
            border-radius: 14px;
            font-weight: 800;
            font-size: 12px;
            background: rgba(0,0,0,0.35);
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
          .tagYes { background: #ff2b2b; color: #000; }
          .tagNo { background: rgba(255,255,255,0.1); color: #fff; }
        `}</style>
      </div>
    </main>
  );
}
