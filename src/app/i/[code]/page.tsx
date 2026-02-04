import { redirect } from "next/navigation";
import { VALID_CODES } from "@/lib/inviteCodes";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const clean = (code ?? "").trim();

  // code inconnu => flyer only
  if (!clean || !VALID_CODES.has(clean)) redirect("/");

  // code connu => on passe le code en query (mais on ne l'affiche pas)
  redirect(`/?code=${encodeURIComponent(clean)}`);
}
