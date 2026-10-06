"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ANALISE_DESEMPENHO_BASE, useAnaliseDesempenhoQuery } from "./AnaliseDesempenhoFilters";

const ITEMS = [
  { href: "", label: "Visão geral" },
  { href: "/sessoes", label: "Partidas" },
  { href: "/treinos", label: "Treinos" },
  { href: "/adversarios", label: "Adversários" },
  { href: "/pre-jogo", label: "Pré-jogo" },
  { href: "/materiais", label: "Clips / materiais" },
] as const;

export function AnaliseDesempenhoHubNav() {
  const pathname = usePathname();
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";
  const base = ANALISE_DESEMPENHO_BASE;

  return (
    <nav className="mt-3 flex flex-wrap gap-2 border-b border-border/60 pb-3">
      {ITEMS.map((item) => {
        const href = `${base}${item.href}${suffix}`;
        const active =
          item.href === ""
            ? pathname === base || pathname === `${base}/`
            : pathname.startsWith(`${base}${item.href}`);
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
