'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

type ApiResponse =
  | { ok: true; message: string }
  | {
      ok: false;
      message: string;
      issues?: { path: string; message: string }[];
    };

export default function Home() {
  const [code, setCode] = useState('');
  const [attending, setAttending] = useState<'yes' | 'no' | ''>('');
  const [adultPartner, setAdultPartner] = useState(false);
  const [childrenCount, setChildrenCount] = useState(0);
  const [childrenAges, setChildrenAges] = useState({
    '0-3': 0,
    '4-10': 0,
    '11-17': 0,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  const [errors, setErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    const c = new URL(window.location.href).searchParams.get('code');
    setCode(c ? c.trim() : '');
  }, []);

  const hasCode = useMemo(() => code.length > 0, [code]);

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function isValidPhone(phone: string) {
    // accepte 06…, +33…, espaces autorisés
    return /^(\+33|0)[1-9](\s?\d{2}){4}$/.test(phone);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // reset UI
    setResult(null);
    setErrors({});
    setLoading(false);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();
    const message = String(form.get('message') ?? '').trim();

    // --- validation ---
    const newErrors: { email?: string; phone?: string } = {};

    if (!email && !phone) {
      newErrors.email = 'Mets au moins un email ou un téléphone';
      newErrors.phone = 'Mets au moins un email ou un téléphone';
    }

    if (email && !isValidEmail(email)) {
      newErrors.email = 'Email invalide (ex: toi@mail.com)';
    }

    if (phone && !isValidPhone(phone)) {
      newErrors.phone =
        'Téléphone invalide (ex: 06 12 34 56 78 ou +33 6 12 34 56 78)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    const isAttending = attending === 'yes';

    // --- payload ---
    const payload = {
      code, // invisible mais envoyé
      name,
      email,
      phone,
      attending: isAttending,
      adultPartner: isAttending ? adultPartner : false,
      children: isAttending
        ? { count: childrenCount, ageRanges: childrenAges }
        : { count: 0, ageRanges: { '0-3': 0, '4-10': 0, '11-17': 0 } },
      message,
    };

    if (!attending) {
      setResult({
        ok: false,
        message: 'Choisis d’abord si tu viens (Oui/Non) 🙂',
      });
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // ✅ lecture robuste: évite le crash si la réponse n'est pas JSON
      const text = await res.text();
      let json: any = null;

      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      // ✅ normalisation de la réponse (même si le back renvoie juste {ok:true})
      const ok = res.ok && (json?.ok ?? true) !== false;
      const messageFromApi =
        typeof json?.message === 'string' && json.message.trim().length > 0
          ? json.message
          : ok
            ? 'Réponse enregistrée ✅'
            : 'Erreur serveur 😬';

      setResult(
        ok
          ? { ok: true, message: messageFromApi }
          : { ok: false, message: messageFromApi }
      );

      if (ok) {
        formEl.reset();
        setAdultPartner(false);
        setChildrenCount(0);
        setChildrenAges({ '0-3': 0, '4-10': 0, '11-17': 0 });
      }
    } catch (err) {
      console.error('RSVP submit failed:', err);
      setResult({ ok: false, message: 'Erreur réseau, réessaie 👀' });
    } finally {
      setLoading(false);
    }
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
            Vous connaissez vous, vous ?
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Nom">
                <input
                  name="name"
                  required
                  className="input"
                  placeholder="Prénom Nom"
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    className={`input ${errors.email ? 'inputError' : ''}`}
                    placeholder="toi@email.com"
                    onChange={() =>
                      setErrors((e) => ({ ...e, email: undefined }))
                    }
                  />
                  {errors.email && <p className="errorText">{errors.email}</p>}
                </Field>
                <Field label="Téléphone">
                  <input
                    name="phone"
                    className={`input ${errors.phone ? 'inputError' : ''}`}
                    placeholder="06 12 34 56 78"
                    onChange={() =>
                      setErrors((e) => ({ ...e, phone: undefined }))
                    }
                  />
                  {errors.phone && <p className="errorText">{errors.phone}</p>}
                </Field>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
                <div className="font-bold">Présence</div>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="attending"
                    checked={attending === 'yes'}
                    onChange={() => setAttending('yes')}
                  />
                  <span>Oui</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="attending"
                    checked={attending === 'no'}
                    onChange={() => {
                      setAttending('no');
                      // reset famille si non
                      setAdultPartner(false);
                      setChildrenCount(0);
                      setChildrenAges({ '0-3': 0, '4-10': 0, '11-17': 0 });
                    }}
                  />
                  <span>Non</span>
                </label>
              </div>

              {attending === 'yes' ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-3">
                  <div className="font-bold">Qui vient ?</div>

                  <div className="text-white/80">1 adulte (toi)</div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={adultPartner}
                      onChange={(e) => setAdultPartner(e.target.checked)}
                    />
                    <span>Conjoint(e)</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={childrenCount > 0}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setChildrenCount(0);
                          setChildrenAges({ '0-3': 0, '4-10': 0, '11-17': 0 });
                        } else {
                          setChildrenCount(1);
                        }
                      }}
                    />
                    <span>Enfants</span>
                  </label>

                  {childrenCount > 0 && (
                    <div className="pt-2 space-y-3">
                      <Field label="Nombre d’enfants">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={childrenCount}
                          onChange={(e) =>
                            setChildrenCount(Number(e.target.value))
                          }
                          className="input"
                        />
                      </Field>
                      <Field label="Tranches d’âge">
                        {(['0-3', '4-10', '11-17'] as const).map((k) => (
                          <div key={k} className="flex items-center gap-3">
                            <span className="w-20 text-white/70">{k} ans</span>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={childrenAges[k]}
                              onChange={(e) =>
                                setChildrenAges({
                                  ...childrenAges,
                                  [k]: Number(e.target.value),
                                })
                              }
                              className="input w-28"
                            />
                          </div>
                        ))}
                      </Field>
                    </div>
                  )}
                </div>
              ) : null}

              <Field label="Message (optionnel)">
                <textarea
                  name="message"
                  rows={3}
                  className="input"
                  placeholder="Un petit mot ?"
                />
              </Field>

              <button
                disabled={loading}
                className="mt-2 rounded-xl bg-red-500 px-4 py-3 font-bold text-black transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? 'Envoi...' : 'Valider'}
              </button>
            </form>
            {result && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="font-bold">
                  {result.ok ? '🎉 Merci !' : '⚠️ Il y a un souci'}
                </div>
                <div className="mt-1 text-white/80">
                  {result.message ?? (result.ok ? 'Merci !' : '')}
                </div>
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
              .inputError {
                border-color: rgba(239, 68, 68, 0.9);
                box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.25);
              }
              .errorText {
                font-size: 0.85rem;
                color: rgb(248, 113, 113);
              }
            `}</style>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-white/70">{label}</span>
      {children}
    </label>
  );
}
