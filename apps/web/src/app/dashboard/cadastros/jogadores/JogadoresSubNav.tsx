"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { useAuth } from "@/context/AuthContext";

const BASE_LINKS = [
  { href: "/dashboard/cadastros/jogadores", label: DASHBOARD_LABELS.atletas },
  { href: "/dashboard/cadastros/jogadores/arquivo", label: "Atletas desligados" },
  {
    href: "/dashboard/cadastros/jogadores/negociados",
    label: "Atletas negociados",
    moduleSlug: "cad_jogadores_negociados" as const,
  },
] as const;

interface JogadoresSubNavProps {
  active: (typeof BASE_LINKS)[number]["href"];
}

export function JogadoresSubNav({ active }: JogadoresSubNavProps) {
  const { canAccessModule } = useAuth();
  const links = BASE_LINKS.filter(
    (link) => !("moduleSlug" in link) || canAccessModule(link.moduleSlug),
  );

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            active === link.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
