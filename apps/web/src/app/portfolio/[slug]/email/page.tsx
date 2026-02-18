import Link from "next/link";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { EmailInboxClient } from "./EmailInboxClient";
import { EmailNotFoundRedirect } from "./EmailNotFoundRedirect";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";
import { buildBackendUrl } from "@/lib/apiProxy";

async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    const res = await fetch(buildBackendUrl(`/public/page-by-slug/${encodeURIComponent(slug)}`), {
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
  return { title: `E-mail — ${name}` };
}

export default async function PortfolioEmailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    return <EmailNotFoundRedirect slug={slug} />;
  }

  const tenant = page.tenant;
  const blocks = (page.content?.blocks ?? []) as HomeContentBlock[];
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");
  const tenantName = tenant?.name ?? slug;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <PortfolioFavicon slug={slug} logoUrl={tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenantName}
        logoUrl={tenant?.logoUrl}
        headerBlock={headerBlock}
        lang="pt"
      />

      <main className="flex flex-1 flex-col min-h-0">
        <div className="shrink-0 border-b border-white/5 bg-zinc-900/50 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-[5rem] shrink-0 sm:w-28">
              <Link href={`/portfolio/${slug}`} className="text-sm font-medium text-zinc-400 hover:text-zinc-100">
                ← Voltar
              </Link>
            </div>
            <h1 className="min-w-0 flex-1 text-center text-lg font-semibold text-zinc-100 sm:text-xl">
              E-mail — {tenantName}
            </h1>
            <div className="min-w-[5rem] shrink-0 sm:w-28" />
          </div>
        </div>
        <EmailInboxClient tenantSlug={slug} />
      </main>

      <footer
        className="shrink-0 border-t border-white/5 px-4 py-4 sm:px-6"
        style={{
          backgroundColor: (footerBlock?.config?.backgroundColor as string)?.trim() || undefined,
          color: (footerBlock?.config?.footerTextColor as string)?.trim() || undefined,
        }}
      >
        <div className="container mx-auto flex flex-col items-center gap-2 text-center text-sm">
          <span>{tenantName}</span>
          <Link href="/" className="text-amber-400 hover:text-amber-300">
            Boston City Group
          </Link>
        </div>
      </footer>
    </div>
  );
}
