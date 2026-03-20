import Link from "next/link";
import type { Metadata } from "next";
import { getPublicImageUrl } from "@/lib/media-url";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { GalleryJournalistClient } from "./GalleryJournalistClient";

type EventPhoto = { id: string; url: string; caption: string | null; sortOrder: number };

async function getGalleryByToken(token: string): Promise<{ event: { name: string; slug: string }; photos: EventPhoto[] } | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/events/gallery/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { event: { name: string; slug: string }; photos: EventPhoto[] };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getGalleryByToken(token);
  return {
    title: data ? `Galeria — ${data.event.name}` : "Galeria de fotos",
  };
}

export default async function EventGalleryTokenPage({
  params,
}: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getGalleryByToken(token);

  if (!data || data.photos.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-zinc-950 text-white">
        <p className="text-lg opacity-80">
          Link inválido ou expirado. Entre em contato para obter um novo link.
        </p>
        <Link href="/" className="mt-4 text-sm font-medium text-amber-400 hover:opacity-90">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">{data.event.name} — Galeria (imprensa)</h1>
          <div className="flex flex-wrap gap-4">
            <Link href="/imprensa" className="text-sm text-amber-400 hover:opacity-90">
              Central de imprensa
            </Link>
            <Link
              href={`/eventos/${data.event.slug}`}
              className="text-sm text-amber-400/90 hover:opacity-90"
            >
              Página do evento
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-white">
              Início
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 py-8">
        <GalleryJournalistClient
          eventSlug={data.event.slug}
          photos={data.photos.map((photo) => ({
            id: photo.id,
            fullUrl: getPublicImageUrl(photo.url) || photo.url,
            caption: photo.caption,
          }))}
        />
      </main>
    </div>
  );
}
