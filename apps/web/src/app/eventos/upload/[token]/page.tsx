import Link from "next/link";
import type { Metadata } from "next";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { EventUploadForm } from "./EventUploadForm";

async function getUploadPageData(token: string): Promise<{ event: { id: string; name: string; slug: string }; valid: boolean } | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/events/upload/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { event: { id: string; name: string; slug: string }; valid: boolean };
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
    title: data?.valid ? `Enviar fotos — ${data.event.name}` : "Enviar fotos",
  };
}

export default async function EventUploadPage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getUploadPageData(token);

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg opacity-80">Link de envio inválido.</p>
        <Link href="/" className="mt-4 text-sm font-medium text-amber-400 hover:opacity-90">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  if (!data.valid) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg opacity-80">Este link de envio expirou.</p>
        <p className="mt-2 text-center text-sm text-zinc-400">Peça um novo link ao organizador do evento.</p>
        <Link href={`/eventos/${data.event.slug}`} className="mt-4 text-sm font-medium text-amber-400 hover:opacity-90">
          Ver página do evento
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="container mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold leading-tight sm:text-xl">{data.event.name}</h1>
          <Link
            href={`/eventos/${data.event.slug}`}
            className="min-h-11 inline-flex items-center text-sm text-amber-400 hover:opacity-90"
          >
            Página do evento
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <EventUploadForm token={token} eventName={data.event.name} />
      </main>
    </div>
  );
}
