import Link from "next/link";
import type { Metadata } from "next";
import { getPublicImageUrl } from "@/lib/media-url";
import { SmartImage } from "@/components/common/SmartImage";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";

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
          <h1 className="text-xl font-semibold">{data.event.name} — Galeria de fotos</h1>
          <div className="flex gap-4">
            <Link
              href={`/eventos/${data.event.slug}`}
              className="text-sm text-amber-400 hover:opacity-90"
            >
              Ver página do evento
            </Link>
            <Link href="/" className="text-sm text-muted-foreground hover:text-white">
              Boston City Group
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <p className="mb-6 text-sm text-muted-foreground">
          Clique em uma foto para abrir em tamanho original e baixar.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {data.photos.map((photo) => (
            <a
              key={photo.id}
              href={getPublicImageUrl(photo.url) || photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-900"
            >
              <SmartImage
                src={getPublicImageUrl(photo.url) || photo.url}
                alt={photo.caption ?? ""}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
              />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs text-white line-clamp-2">{photo.caption}</p>
                </div>
              )}
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
