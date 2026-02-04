import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LoginClient />
    </Suspense>
  );
}

function Loading() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="text-white/70">Chargement…</div>
    </main>
  );
}

