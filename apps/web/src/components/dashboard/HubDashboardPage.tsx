"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export interface HubDashboardLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  moduleSlug: string | null;
}

interface HubDashboardPageProps {
  title: string;
  subtitle: string;
  hubId: string;
  links: HubDashboardLink[];
  /** Bloco visual opcional (KPIs, gráficos, agenda) entre o hero e os atalhos */
  children?: React.ReactNode;
}

export function HubDashboardPage({ title, subtitle, hubId, links, children }: HubDashboardPageProps) {
  const { canAccessModule, canAccessDashboard } = useAuth();

  const visibleLinks = links.filter((link) => {
    if (!link.moduleSlug) return true;
    if (link.moduleSlug === "emails" && canAccessDashboard) return true;
    return canAccessModule(link.moduleSlug);
  });

  return (
    <div className="w-full min-w-0 max-w-full space-y-8">
      <div className="dashboard-hero-gradient rounded-2xl border border-border/80 p-6 md:p-8 shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">{subtitle}</p>
      </div>

      {children}

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Atalhos</h2>
        {visibleLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum módulo liberado neste departamento para o seu perfil.
          </p>
        ) : (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleLinks.map(({ title: linkTitle, description, href, icon: Icon }) => (
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
    </div>
  );
}
