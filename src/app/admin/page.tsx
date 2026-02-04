'use client';

import { useEffect, useMemo, useState } from 'react';

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
    ageRanges: { '0-3': number; '4-10': number; '11-17': number };
  };
  message?: string;
};

function kidsCountFromAges(children?: {
  ageRanges?: { '0-3': number; '4-10': number; '11-17': number };
}) {
  const a = children?.ageRanges;
  return (a?.['0-3'] ?? 0) + (a?.['4-10'] ?? 0) + (a?.['11-17'] ?? 0);
}

function formatKids(children?: {
  count: number;
  ageRanges?: { '0-3': number; '4-10': number; '11-17': number };
}) {
  const count = children?.count ?? 0;
  if (count <= 0) return { label: '👶 Aucun', detail: '' };

  const r = children?.ageRanges;
  const parts: string[] = [];

  if (r) {
    if ((r['0-3'] ?? 0) > 0) parts.push(`0–3: ${r['0-3']}`);
    if ((r['4-10'] ?? 0) > 0) parts.push(`4–10: ${r['4-10']}`);
    if ((r['11-17'] ?? 0) > 0) parts.push(`11–17: ${r['11-17']}`);
  }

  if (parts.length === 0)
    return { label: `👶 ${count} enfant(s)`, detail: 'âge non précisé' };
  return { label: `👶 ${count} enfant(s)`, detail: parts.join(' · ') };
}

export default function AdminPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [items, setItems] = useState<StoredRSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr(null);

      const url =
        filter === 'yes'
          ? '/api/admin/rsvps?attending=yes'
          : filter === 'no'
            ? '/api/admin/rsvps?attending=no'
            : '/api/admin/rsvps';

      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Fetch admin failed');

      const json = (await res.json()) as { items: StoredRSVP[] };
      if (!cancelled) setItems(json.items ?? []);
      if (!cancelled) setLoading(false);
    }

    load().catch((e) => {
      if (!cancelled) {
        setErr(e?.message ?? 'Erreur');
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const btnBase =
    'border border-white/15 px-3 py-2 rounded-xl font-extrabold text-xs bg-black/30 hover:bg-white/5 transition';
  const btnActive = 'bg-red-500 border-red-500 text-black hover:bg-red-400';

  const stats = useMemo(() => {
    return items.reduce(
      (acc, x) => {
        if (!x.attending) return acc;

        acc.adults += 1 + (x.adultPartner ? 1 : 0);

        const ageRanges = x.children?.ageRanges;
        const kids =
          (ageRanges?.['0-3'] ?? 0) +
          (ageRanges?.['4-10'] ?? 0) +
          (ageRanges?.['11-17'] ?? 0);

        acc.kidsTotal += kids;

        if (ageRanges) {
          acc.kidsByAge['0-3'] += ageRanges['0-3'] ?? 0;
          acc.kidsByAge['4-10'] += ageRanges['4-10'] ?? 0;
          acc.kidsByAge['11-17'] += ageRanges['11-17'] ?? 0;
        }

        acc.totalPeople += 1 + (x.adultPartner ? 1 : 0) + kids;

        return acc;
      },
      {
        totalPeople: 0,
        adults: 0,
        kidsTotal: 0,
        kidsByAge: { '0-3': 0, '4-10': 0, '11-17': 0 } as Record<
          '0-3' | '4-10' | '11-17',
          number
        >,
      }
    );
  }, [items]);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold">
              Admin <span className="text-red-500">RSVP</span>
            </h1>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total personnes"
                value={stats.totalPeople}
                accent
              />
              <StatCard label="Adultes" value={stats.adults} />
              <StatCard label="Enfants" value={stats.kidsTotal} />
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <div className="text-xs font-bold text-white/60">
                  Enfants par tranche
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">0–3</span>
                    <span className="font-extrabold">
                      {stats.kidsByAge['0-3']}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">4–10</span>
                    <span className="font-extrabold">
                      {stats.kidsByAge['4-10']}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">11–17</span>
                    <span className="font-extrabold">
                      {stats.kidsByAge['11-17']}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {err && <p className="mt-2 text-red-400">{err}</p>}
          </div>

          <div className="flex gap-2">
            <button
              className={`btn ${filter === 'all' ? 'btnActive' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tout
            </button>
            <button
              className={`btn ${filter === 'yes' ? 'btnActive' : ''}`}
              onClick={() => setFilter('yes')}
            >
              Oui
            </button>
            <button
              className={`btn ${filter === 'no' ? 'btnActive' : ''}`}
              onClick={() => setFilter('no')}
            >
              Non
            </button>
            <button className={btnBase} onClick={refresh} type="button">
              Refresh
            </button>
            <button
              className={`${btnBase} border-red-500/40`}
              onClick={logout}
              type="button"
            >
              Logout
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
                const kids = kidsCountFromAges(x.children);
                const kidsInfo = formatKids(x.children);
                return (
                  <tr
                    key={x.id}
                    className="border-b border-white/5 last:border-b-0"
                  >
                    <td className="p-3 font-semibold">{x.name}</td>
                    <td className="p-3 text-white/70">
                      <div>{x.email ?? '-'}</div>
                      <div>{x.phone ?? '-'}</div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`tag ${x.attending ? 'tagYes' : 'tagNo'}`}
                      >
                        {x.attending ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td className="p-3 text-white/70">
                      <td className="p-3 text-white/70">
                        <div>🧑 {adults} adulte(s)</div>
                        <div>
                          {kidsInfo.label}
                          {kidsInfo.detail ? (
                            <span className="text-white/50">
                              {' '}
                              — {kidsInfo.detail}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </td>
                    <td className="p-3 text-white/60">
                      {x.updatedAt
                        ? new Date(x.updatedAt).toLocaleString('fr-FR')
                        : '-'}
                    </td>
                    <td className="p-3 text-white/70">{x.message ?? ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {loading && <div className="p-4 text-white/60">Chargement…</div>}
          {!loading && items.length === 0 && (
            <div className="p-4 text-white/60">Aucune réponse.</div>
          )}
        </div>
      </div>
    </main>
  );
}
function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className="text-xs font-bold text-white/60">{label}</div>
      <div
        className={`mt-2 text-3xl font-extrabold ${accent ? 'text-red-500' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
