"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Shirt, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { HubStatCard } from "./HubStatCard";

interface CompanyDashboardStats {
  tenantName: string;
  tenantsCount: number;
  playersCount: number;
  usersCount: number;
  pagesCount: number;
}

export function CompanyHubInsights() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CompanyDashboardStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<CompanyDashboardStats>("/dashboard/company-stats")
      .then((res) => {
        if (!cancelled) setStats(res.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-border/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{stats.tenantName}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Resumo da sua empresa no sistema — indicadores do escopo do seu perfil.
          </p>
        </CardContent>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HubStatCard
          label="Empresas no escopo"
          value={stats.tenantsCount}
          icon={Users}
          accent="from-blue-500/10 to-blue-600/5 border-blue-500/20"
          iconClass="text-blue-600 dark:text-blue-400"
        />
        <HubStatCard
          label="Atletas cadastrados"
          value={stats.playersCount}
          icon={Shirt}
          accent="from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
        <HubStatCard
          label="Usuários vinculados"
          value={stats.usersCount}
          icon={Users}
          accent="from-violet-500/10 to-violet-600/5 border-violet-500/20"
          iconClass="text-violet-600 dark:text-violet-400"
        />
        <HubStatCard
          label="Páginas do site"
          value={stats.pagesCount}
          icon={FileText}
          accent="from-amber-500/10 to-amber-600/5 border-amber-500/20"
          iconClass="text-amber-600 dark:text-amber-400"
        />
      </div>
    </div>
  );
}
