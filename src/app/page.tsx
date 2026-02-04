"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type ApiResponse =
  | { ok: true; message: string }
  | { ok: false; message: string; issues?: { path: string; message: string }[] };

export default function Home() {
  const [code, setCode] = useState("");

  const [adultPartner, setAdultPartner] = useState(false);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState({ "0-3": 0, "4-10": 0, "11-17": 0 });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  useEffect(() => {
    const c = new URL(window.location.href).searchParams.get("code");
    setCode(c ? c.trim() : "");
  }, []);

  const hasCode = useMemo(() => code.length > 0, [code]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);

    const payload = {
      code, // invisible, mais envoyé
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      attending: true,
      adultPartner,
      children: {
        count: childrenCount,
        ageRanges: childrenAges,
      },
      message: String(form.get("message") ?? ""),
    };

    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await res.json()) as ApiResponse;
    setResult(json);
    setLoading(false);

    if (json.ok) e.currentTarget.reset();
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10">
      <div className="mx-auto max-w-xl space-y-6">
        {/* Flyer (pas immense) */}
        <div className="flex justify-center">
          <a
            href="/images/flyer-40ans.jpg"
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <div className="max-w-sm overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-black/40 transition-transform group-hover:scale-[1.01]">
              <Image
                src="/images/flyer-40ans.jpg"
                alt="Invitation 40 ans"
                width={900}
                height={500}
                priority
                className="h-auto w-full object-contain"
              />
            </div>
          </a>
        </div>

        {/* ✅ Pas de code => juste flyer */}
        {!hasCode ? null : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/30">
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Nom">
                <input name="name" required className="input" placeholder="Prénom Nom" />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email (recommandé)">
                  <input name="email" type="email" className="input" placeholder="toi@mail.com" />
                </Field>
                <Field label="Portable (optionnel)">
                  <input name="phone" className="input" placeholder="+33 6 12 34 56 78" />
                </Field>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked disabled />
                  <span>Moi</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={adultPartner}
                    onChange={(e) => setAdultPartner(e.target.checked)}
                  />
                  <span>Mon/ma conjoint(e)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={childrenCount > 0}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        setChildrenCount(0);
                        setChildrenAges({ "0-3": 0, "4-10": 0, "11-17": 0 });
                      } else {
                        setChildrenCount(1);
                      }
                    }}
                  />
                  <span>Des enfants</span>
                </label>

                {childrenCount > 0 && (
                  <div className="pt-2 space-y-3">
                    <Field label="Nombre d’enfants">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={childrenCount}
                        onChange={(e) => setChildrenCount(Number(e.target.value))}
                        className="input"
                      />
                    </Field>

                    <Field label="Tranches d’âge">
                      {(["0-3", "4-10", "11-17"] as const).map((k) => (
                        <div key={k} className="flex items-center gap-3">
                          <span className="w-20 text-white/70">{k} ans</span>
                          <input
                            type="number"
                            min={0}
                            value={childrenAges[k]}
                            onChange={(e) =>
                              setChildrenAges({ ...childrenAges, [k]: Number(e.target.value) })
                            }
                            className="input w-28"
                          />
                        </div>
                      ))}
                    </Field>
                  </div>
                )}
              </div>

              <Field label="Message (optionnel)">
                <textarea name="message" rows={3} className="input" placeholder="Un petit mot ?" />
              </Field>

              <button
                disabled={loading}
                className="mt-2 rounded-xl bg-red-500 px-4 py-3 font-bold text-black transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Envoi..." : "Valider"}
              </button>
            </form>

            {result && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="font-bold">{result.ok ? "✅ Ok" : "❌ Oups"}</div>
                <div className="mt-1 text-white/80">{result.message}</div>
              </div>
            )}

            <style jsx global>{`
              .input {
                width: 100%;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.12);
                background: rgba(0, 0, 0, 0.35);
                padding: 10px 12px;
                outline: none;
                color: white;
              }
              .input:focus {
                border-color: rgba(239, 68, 68, 0.8);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
              }
            `}</style>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-white/70">{label}</span>
      {children}
    </label>
  );
}
