"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Page } from "@/types/page";
import type { HomeContentBlock } from "@/types/home-content";
import { GroupPublicHeader } from "@/components/home/GroupPublicHeader";
import { PublicFooter } from "@/components/portfolio/PublicFooter";
import { EmailServersSection } from "@/components/portfolio/modules/EmailServersSection";
import { findEmailServersBlock } from "@/lib/email-servers";
import { resolveFontFamily } from "@/lib/page-fonts";
import type { Lang } from "@/lib/home-copy";

const LANG_KEY = "bcg_lang";

interface EmailServerHubClientProps {
  groupHome: Page | null;
  groupName: string;
  initialBlock: HomeContentBlock | null;
}

export function EmailServerHubClient({
  groupHome,
  groupName,
  initialBlock,
}: EmailServerHubClientProps) {
  const [lang, setLang] = useState<Lang>("pt");

  useEffect(() => {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === "pt" || stored === "en") setLang(stored);
  }, []);

  const setLangAndStore = (l: Lang) => {
    setLang(l);
    localStorage.setItem(LANG_KEY, l);
  };

  const blocks = (groupHome?.content?.blocks ?? []) as HomeContentBlock[];
  const headerBlock = blocks.find((b) => b.type === "header");
  const footerBlock = blocks.find((b) => b.type === "footer");
  const emailBlock = initialBlock ?? findEmailServersBlock(blocks);
  const theme = groupHome?.content?.theme ?? {};
  const pageFont = resolveFontFamily(undefined, theme);

  return (
    <div
      className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100"
      style={{
        fontFamily: pageFont || undefined,
        color: (theme.textColor as string)?.trim() || undefined,
      }}
    >
      <GroupPublicHeader
        groupName={groupName}
        headerBlock={headerBlock}
        lang={lang}
        onLangChange={setLangAndStore}
      />

      <main className="flex flex-1 flex-col">
        <div className="border-b border-white/5 bg-zinc-900/40 px-4 py-3 sm:px-6">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <Link
              href="/"
              className="min-h-[44px] shrink-0 text-sm font-medium text-zinc-400 hover:text-zinc-100"
            >
              ← {lang === "pt" ? "Início" : "Home"}
            </Link>
          </div>
        </div>

        {emailBlock ? (
          <EmailServersSection block={emailBlock} lang={lang} hubMode showTitle />
        ) : (
          <div className="container mx-auto flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
            <p className="max-w-md text-sm text-zinc-500">
              {lang === "pt"
                ? "Configure o módulo «Servidores de e-mail» em Dashboard → Páginas → Home do Grupo e adicione as organizações."
                : "Configure the «Email servers» module in Dashboard → Pages → Group Home and add organizations."}
            </p>
            <Link
              href="/dashboard/paginas/group-home/editar"
              className="mt-4 text-sm text-amber-400 hover:text-amber-300"
            >
              {lang === "pt" ? "Abrir editor" : "Open editor"}
            </Link>
          </div>
        )}
      </main>

      <PublicFooter
        block={footerBlock}
        theme={theme}
        defaultText={groupName}
        accentColor={(theme.accentColor as string)?.trim()}
      />
    </div>
  );
}
