"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ANALISE_DESEMPENHO_BASE, useAnaliseDesempenhoQuery } from "./AnaliseDesempenhoFilters";

const ITEMS = [
  { href: "", label: "Visão geral" },
  { href: "/sessoes", label: "Partidas" },
  { href: "/sessoes?status=live", label: "Ao vivo" },
  { href: "/sessoes?status=review", label: "Pós-jogo" },
  { href: "/treinos", label: "Treinos" },
  { href: "/adversarios", label: "Adversários" },
  { href: "/pre-jogo", label: "Pré-jogo" },
  { href: "/materiais", label: "Clips / materiais" },
] as const;

export function AnaliseDesempenhoHubNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { qs } = useAnaliseDesempenhoQuery();
  const base = ANALISE_DESEMPENHO_BASE;
  const sessionStatus = searchParams.get("status");

  function hrefFor(itemHref: string) {
    const [path, extraQuery] = itemHref.split("?");
    const params = new URLSearchParams(qs);
    if (extraQuery) {
      for (const part of extraQuery.split("&")) {
        const [k, v] = part.split("=");
        if (k) params.set(k, v ?? "");
      }
    }
    if (path === "/sessoes" && !extraQuery) params.delete("status");
    const q = params.toString();
    return `${base}${path}${q ? `?${q}` : ""}`;
  }

  return (
    <nav className="mt-3 flex flex-wrap gap-2 border-b border-border/60 pb-3">
      {ITEMS.map((item) => {
        const href = hrefFor(item.href);
        const pathOnly = item.href.split("?")[0];
        const wantStatus =
          item.href.includes("status=live") ? "live" : item.href.includes("status=review") ? "review" : null;
        const active =
          item.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(`${base}${pathOnly}`) &&
              (pathOnly === "/sessoes"
                ? wantStatus
                  ? sessionStatus === wantStatus
                  : !sessionStatus || (sessionStatus !== "live" && sessionStatus !== "review")
                : true);
        return (
          <Link
            key={item.href || "home"}
            href={href}
            className={cn(
              "min-h-[36px] rounded-md px-3 py-2 text-xs font-medium sm:text-sm",
              active
                ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
