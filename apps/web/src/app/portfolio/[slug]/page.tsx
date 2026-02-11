import Link from "next/link";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { BlockRenderer } from "@/components/portfolio/modules/BlockRenderer";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(`${apiUrl}/public/page-by-slug/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as Page;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  const name = page?.tenant?.name ?? slug;
  const logoUrl = page?.tenant?.logoUrl;
  // Favicon: sempre o logo do clube/empresa (nunca trocar por outro)
  const iconUrl = logoUrl ? getPublicImageUrl(logoUrl) : "/favicon.ico";
  return {
    title: name,
    description: page ? `Página oficial — ${name}` : undefined,
    icons: { icon: iconUrl },
  };
}

const GENERIC_BLOCK_TYPES = [
  "header",
  "footer",
  "section",
  "text",
  "custom",
  "proximos_jogos",
  "times_categorias",
  "noticias",
  "calendario",
  "tabela",
  "patrocinadores",
  "galeria",
  "sobre",
  "servicos",
  "produtos",
  "equipe",
  "clientes",
  "contato",
  "hero",
  "highlights",
  "what",
  "founder",
  "how",
  "cta",
  "logo_carousel",
];

function sortBlocks(blocks: HomeContentBlock[]): HomeContentBlock[] {
  return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
}

export default async function PortfolioSlugPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const { lang: langParam } = await searchParams;
  const lang = langParam === "en" ? "en" : "pt";

  const page = await getPageBySlug(slug);

  if (!page?.content?.blocks?.length) {
    return (
      <>
        <PortfolioFavicon slug={slug} logoUrl={page?.tenant?.logoUrl} />
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
          <p className="text-lg text-zinc-400">
            {page ? "Esta página ainda não tem conteúdo. Edite em Dashboard → Páginas." : "Perfil em breve / Profile coming soon"}
          </p>
          <Link href="/" className="mt-4 text-sm font-medium text-amber-400 hover:text-amber-300">
            ← Voltar / Back
          </Link>
        </div>
      </>
    );
  }

  const tenant = page.tenant;
  const blocks = sortBlocks(page.content.blocks);
  const contentBlocks = blocks.filter((b) => {
    const t = String(b.type ?? "").toLowerCase();
    if (t === "header" || t === "footer") return false;
    return GENERIC_BLOCK_TYPES.some((k) => String(k).toLowerCase() === t);
  });
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <PortfolioFavicon slug={slug} logoUrl={tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenant?.name ?? slug}
        logoUrl={tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
      />

      {/* Módulos no meio */}
      <main>
        {contentBlocks.map((block) => (
          <BlockRenderer key={block.id} block={block} slug={slug} lang={lang} page={page} />
        ))}

        {/* Rodapé fixo: cor de fundo e texto do bloco footer */}
        <footer
          className="border-t border-white/5 px-4 py-6"
          style={{
            backgroundColor: (footerBlock?.config?.backgroundColor as string)?.trim() || undefined,
            color: (footerBlock?.config?.footerTextColor as string)?.trim() || undefined,
          }}
        >
          <div className="container mx-auto flex flex-col items-center gap-2 text-center text-sm">
            <span>{tenant?.name ?? slug}</span>
            <Link href="/" className="text-amber-400 hover:text-amber-300">
              Boston City Group
            </Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
