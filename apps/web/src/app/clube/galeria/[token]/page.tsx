import Link from "next/link";
import type { Metadata } from "next";
import { getPublicImageUrl } from "@/lib/media-url";
import { getServerBackendBaseUrl } from "@/lib/apiProxy";
import { GalleryJournalistClient } from "@/app/eventos/gallery/[token]/GalleryJournalistClient";

type PressPhoto = { id: string; url: string; caption: string | null; matchLabel: string | null };

async function getGalleryByToken(
  token: string,
): Promise<{ tenant: { name: string; slug: string }; photos: PressPhoto[] } | null> {
  try {
    const base = getServerBackendBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/public/press/gallery/${encodeURIComponent(token)}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as { tenant: { name: string; slug: string }; photos: PressPhoto[] };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getGalleryByToken(token);
  return { title: data ? `Galeria — ${data.tenant.name}` : "Galeria de imprensa" };
}

export default async function ClubPressGalleryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getGalleryByToken(token);

  if (!data || data.photos.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-white">
        <p className="text-lg opacity-80">Link inválido, expirado ou sem fotos.</p>
        <Link href="/" className="mt-4 text-sm text-amber-400">
          ← Início
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">{data.tenant.name} — Galeria (imprensa)</h1>
          <Link href={`/portfolio/${data.tenant.slug}`} className="text-sm text-amber-400">
            Voltar ao site
          </Link>
        </div>
      </header>
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <GalleryJournalistClient
          eventSlug={data.tenant.slug}
          photos={data.photos.map((p) => ({
            id: p.id,
            fullUrl: getPublicImageUrl(p.url) || p.url,
            caption: p.matchLabel || p.caption,
          }))}
        />
      </main>
    </div>
  );
}
