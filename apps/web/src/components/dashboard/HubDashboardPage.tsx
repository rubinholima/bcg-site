"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import {
  DashboardDeptHeader,
  DashboardDeptSearch,
} from "@/components/dashboard/DashboardDeptHeader";

export interface HubDashboardLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  moduleSlug: string | null;
}

interface HubDashboardPageProps {
  /** Rótulo roxo (ex.: Depto Adm) */
  section: string;
  sectionIcon?: LucideIcon;
  /** Título principal (ex.: Dash) */
  title: string;
  subtitle: string;
  hubId: string;
  links: HubDashboardLink[];
  stats?: Array<{ value: React.ReactNode; label: string }>;
  searchPlaceholder?: string;
  children?: React.ReactNode;
}

export function HubDashboardPage({
  section,
  sectionIcon = Sparkles,
  title,
  subtitle,
  hubId,
  links,
  stats,
  searchPlaceholder = "Buscar atalho…",
  children,
}: HubDashboardPageProps) {
  const { canAccessModule, canAccessDashboard } = useAuth();
  const [search, setSearch] = useState("");

  const visibleLinks = links.filter((link) => {
    if (!link.moduleSlug) return true;
    if (link.moduleSlug === "emails" && canAccessDashboard) return true;
    return canAccessModule(link.moduleSlug);
  });

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleLinks;
    return visibleLinks.filter(
      (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q),
    );
  }, [visibleLinks, search]);

  const headerStats = stats ?? [
    { value: filteredLinks.length, label: "Atalhos" },
    { value: visibleLinks.length, label: "Módulos" },
  ];

  return (
    <>
      <DashboardDeptHeader
        section={section}
        sectionIcon={sectionIcon}
        title={title}
        description={subtitle}
        stats={headerStats}
        variant="hero"
        toolbar={
          <DashboardDeptSearch value={search} onChange={setSearch} placeholder={searchPlaceholder} />
        }
      />

      {children}

      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Atalhos</h2>
        {filteredLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {visibleLinks.length === 0
              ? "Nenhum módulo liberado neste departamento para o seu perfil."
              : "Nenhum atalho encontrado para esta busca."}
          </p>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredLinks.map(({ title: linkTitle, description, href, icon: Icon }) => (
              <Link key={href} href={href} className="group block min-w-0">
                <Card className="h-full min-w-0 overflow-hidden rounded-xl border shadow-md transition-shadow hover:shadow-lg">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="min-w-0 pr-2">
                      <CardTitle className="text-base">{linkTitle}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">{description}</CardDescription>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/80">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
                      Abrir <ArrowRight className="h-3.5 w-3 transition-transform group-hover:translate-x-0.5" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {canAccessModule("relatorios") && (
        <Card className="rounded-xl border-dashed">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Relatórios</CardTitle>
              <CardDescription>Indicadores e exportações deste departamento</CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link
              href={`/dashboard/relatorios?hub=${hubId}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver relatórios do departamento
              <ArrowRight className="h-3.5 w-3" />
            </Link>
          </CardContent>
        </Card>
      )}
    </>
  );
}
