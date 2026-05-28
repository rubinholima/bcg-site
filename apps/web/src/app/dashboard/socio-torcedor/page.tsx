"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Ticket,
  Users,
  Heart,
  TrendingUp,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { SocioFilters } from "./SocioFilters";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
}

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  newThisMonth: number;
  byPlan: { planName: string; count: number }[];
}

export default function SocioTorcedorPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canAccessModule("socio_torcedor") && !authLoading) return;
    if (!tenantId) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<DashboardStats>(`/socio/dashboard/stats?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setStats(data ?? null))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading, tenantId]);

  if (!canAccessModule("socio_torcedor") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo Sócio Torcedor.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">
            Voltar ao dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      </div>

      <SocioFilters basePath="/dashboard/socio-torcedor" tenantId={tenantId} />

      {!tenantId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Ticket className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Selecione um clube para ver o dashboard e gerenciar sócios.</p>
            <p className="text-sm mt-1">Planos, benefícios e métricas são configurados por clube.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : stats ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de sócios
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalMembers}</div>
                <p className="text-xs text-muted-foreground mt-1">Todos os planos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ativos
                </CardTitle>
                <Heart className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeMembers}</div>
                <p className="text-xs text-muted-foreground mt-1">Status ativo</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Novos este mês
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.newThisMonth}</div>
                <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Planos ativos
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.byPlan.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Com sócios</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por plano</CardTitle>
                <CardDescription>
                  Quantidade de sócios em cada plano do clube
                </CardDescription>
              </CardHeader>
              <CardContent>
                {stats.byPlan.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum sócio cadastrado ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.byPlan.map((p) => {
                      const pct =
                        stats.totalMembers > 0
                          ? Math.round((p.count / stats.totalMembers) * 100)
                          : 0;
                      return (
                        <div key={p.planName} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium truncate">{p.planName}</span>
                              <span className="text-muted-foreground">
                                {p.count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary/70 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações rápidas</CardTitle>
                <CardDescription>
                  Gerencie planos, benefícios e cadastro de sócios
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Link
                  href={`/dashboard/socio-torcedor/planos?tenantId=${encodeURIComponent(tenantId)}`}
                >
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2" />
                    Planos e perks
                  </Button>
                </Link>
                <Link
                  href={`/dashboard/socio-torcedor/socios?tenantId=${encodeURIComponent(tenantId)}`}
                >
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Cadastro de sócios
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Não foi possível carregar as métricas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
