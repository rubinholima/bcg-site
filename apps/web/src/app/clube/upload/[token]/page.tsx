import Link from "next/link";
import type { Metadata } from "next";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { ClubPressUploadForm } from "@/components/press/ClubPressUploadForm";

async function getUploadPageData(
  token: string,
): Promise<{ tenant: { name: string; slug: string }; valid: boolean } | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/press/upload/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { tenant: { name: string; slug: string }; valid: boolean };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getUploadPageData(token);
  return {
    title: data?.valid ? `Enviar fotos — ${data.tenant.name}` : "Enviar fotos — imprensa",
  };
}

export default async function ClubPressUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getUploadPageData(token);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-white">
        <p className="text-lg opacity-80">Link de envio inválido.</p>
        <Link href="/" className="mt-4 text-sm font-medium text-amber-400">
          ← Início
        </Link>
      </div>
    );
  }

  if (!data.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-white">
        <p className="text-lg opacity-80">Este link de envio expirou.</p>
        <Link href={`/portfolio/${data.tenant.slug}`} className="mt-4 text-sm font-medium text-amber-400">
          Voltar ao site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="container mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">{data.tenant.name} — Imprensa</h1>
          <Link href={`/portfolio/${data.tenant.slug}`} className="text-sm text-amber-400">
            Voltar ao site
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <ClubPressUploadForm token={token} clubName={data.tenant.name} />
      </main>
    </div>
  );
}
