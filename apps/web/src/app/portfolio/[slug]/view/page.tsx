import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import { PortfolioFavicon } from "@/components/portfolio/PortfolioFavicon";
import { PublicPortfolioHeader } from "@/components/portfolio/PublicPortfolioHeader";

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

/** Só permite http/https para iframe (evita javascript: etc). */
function isAllowedUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  return t.startsWith("https://") || t.startsWith("http://");
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ url?: string; label?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { label } = await searchParams;
  const page = await getPageBySlug(slug);
  const name = page?.tenant?.name ?? slug;
  const title = [label?.trim(), name].filter(Boolean).join(" — ") || name;
  return { title };
}

export default async function PortfolioViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ url?: string; label?: string; lang?: string }>;
}) {
  const { slug } = await params;
  const { url: urlParam, label = "", lang: langParam } = await searchParams;
  const lang = langParam === "en" ? "en" : "pt";
  const url = (urlParam ?? "").trim();

  // Se o link for do WorkMail (awsapps.com), a AWS bloqueia iframe. Redireciona para nossa página de e-mail (inbox via API).
  if (url && url.includes("awsapps.com")) {
    redirect(`/portfolio/${slug}/email`);
  }

  const page = await getPageBySlug(slug);
  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <p>Página não encontrada.</p>
        <Link href="/" className="ml-2 text-amber-400 hover:underline">← Home</Link>
      </div>
    );
  }

  const tenant = page.tenant;
  const blocks = (page.content?.blocks ?? []) as HomeContentBlock[];
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");

  const labelStr = (label ?? "").trim();
  const allowed = isAllowedUrl(url);
  const tenantName = tenant?.name ?? slug;
  const pageTitle = [labelStr, tenantName].filter(Boolean).join(" — ") || tenantName;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <PortfolioFavicon slug={slug} logoUrl={tenant?.logoUrl} />
      <PublicPortfolioHeader
        slug={slug}
        tenantName={tenantName}
        logoUrl={tenant?.logoUrl}
        headerBlock={headerBlock}
        lang={lang}
      />

      {/* Título centralizado + Voltar; depois iframe ou aviso */}
      <main className="flex flex-1 flex-col min-h-0">
        <div className="shrink-0 border-b border-white/5 bg-zinc-900/50 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-[5rem] shrink-0 sm:w-28">
              <Link
                href={`/portfolio/${slug}`}
                className="text-sm font-medium text-zinc-400 hover:text-zinc-100"
              >
                ← Voltar
              </Link>
            </div>
            <h1 className="min-w-0 flex-1 text-center text-lg font-semibold text-zinc-100 sm:text-xl">
              {pageTitle}
            </h1>
            <div className="flex min-w-[5rem] shrink-0 sm:w-28" />
          </div>
        </div>
        {allowed && (
          <div className="shrink-0 border-b border-white/5 bg-zinc-900/30 px-4 py-2 text-center text-xs text-zinc-500 sm:px-6">
            Se não carregar: o site (ex.: AWS) pode bloquear incorporação. Para e-mail dentro do nosso ambiente seria necessária integração com a API AWS WorkMail.
            {" "}
            <a href={url} className="text-amber-400 hover:text-amber-300">Ir para o site</a>
          </div>
        )}
        <div className="relative flex-1 min-h-0">
          {allowed ? (
            <iframe
              src={url}
              title={pageTitle}
              className="absolute inset-0 h-full w-full border-0 bg-zinc-950"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-zinc-400">
              <p>{url ? "Link não permitido para exibição interna." : "Nenhum link informado."}</p>
              <Link href={`/portfolio/${slug}`}>
                <Button variant="outline" size="sm">Voltar à página</Button>
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Rodapé igual ao portfólio */}
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
