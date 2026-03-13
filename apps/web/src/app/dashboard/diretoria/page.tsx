"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Shirt,
  Ticket,
  TrendingUp,
  Loader2,
  Brain,
  Briefcase,
  MapPin,
  ExternalLink,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getPublicImageUrl } from "@/lib/media-url";

interface TenantProfileStats {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  kindName: string;
  kindId: string;
  isFootballClub: boolean;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  playersCount: number;
  sociosCount: number;
  sociosActiveCount: number;
  psychologistsCount: number;
  technicalStaffCount: number;
  marketingPostsScheduled: number;
  employeesCount: number;
  productsCount: number;
  suppliersCount: number;
  purchaseOrdersCount: number;
  purchaseRequisitionsCount: number;
  totalGastoMes: number;
  pagamentosARealizar: number;
}

interface DiretoriaDashboard {
  summary: {
    totalTenants: number;
    clubsCount: number;
    empresasCount: number;
    totalPlayers: number;
    totalSocios: number;
    totalSociosActive: number;
    totalPsychologists: number;
    totalEmployees: number;
    totalGastoMes: number;
    totalPagamentosARealizar: number;
    newTenantsThisMonth: number;
    newPlayersThisMonth: number;
    newSociosThisMonth: number;
  };
  clubs: TenantProfileStats[];
  empresas: TenantProfileStats[];
  chartClubs: { name: string; jogadores: number; socios: number }[];
  chartEmpresas: { name: string; gastoMes: number; pagamentosPendentes: number }[];
  chartGrowth: { month: string; novosJogadores: number; novosSocios: number; gastoMes: number }[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatCurrency(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatCurrencyCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return formatCurrency(v);
}

export default function DiretoriaPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [data, setData] = useState<DiretoriaDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canAccessModule("diretoria") && !authLoading) return;
    setLoading(true);
    api
      .get<DiretoriaDashboard>("/diretoria/dashboard")
      .then(({ data: d }) => setData(d ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading]);

  if (!canAccessModule("diretoria") && !authLoading) {
    router.replace("/403");
    return null;
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { summary, clubs, empresas, chartClubs, chartEmpresas, chartGrowth } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Dashboard gerencial
            </h1>
            <p className="text-muted-foreground text-sm">
              Visão por tipo: clubes (futebol) e empresas — indicadores pertinentes a cada perfil
            </p>
          </div>
        </div>
      </div>

      {/* KPIs — Resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Building2 className="h-7 w-7 text-amber-500/80" />
              <span className="text-xl font-bold">{summary.totalTenants}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total</p>
            <p className="text-[10px] text-muted-foreground">{summary.clubsCount} clubes · {summary.empresasCount} empresas</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Shirt className="h-7 w-7 text-blue-500/80" />
              <span className="text-xl font-bold">{summary.totalPlayers}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Jogadores</p>
            {summary.newPlayersThisMonth > 0 && (
              <p className="text-[10px] text-emerald-500">+{summary.newPlayersThisMonth} este mês</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Ticket className="h-7 w-7 text-violet-500/80" />
              <span className="text-xl font-bold">{summary.totalSociosActive}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sócios ativos</p>
            {summary.newSociosThisMonth > 0 && (
              <p className="text-[10px] text-emerald-500">+{summary.newSociosThisMonth} este mês</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Briefcase className="h-7 w-7 text-cyan-500/80" />
              <span className="text-xl font-bold">{summary.totalEmployees}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Colaboradores</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <DollarSign className="h-7 w-7 text-emerald-500/80" />
              <span className="text-lg font-bold">{formatCurrency(summary.totalGastoMes)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Gasto este mês</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <FileText className="h-7 w-7 text-amber-600/80" />
              <span className="text-lg font-bold">{formatCurrency(summary.totalPagamentosARealizar)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">A pagar</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Brain className="h-7 w-7 text-rose-500/80" />
              <span className="text-xl font-bold">{summary.totalPsychologists}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Psicólogos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-7 w-7 text-emerald-500/80" />
              <span className="text-xl font-bold">{summary.newTenantsThisMonth}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Novas este mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {chartClubs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clubes — Jogadores e sócios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartClubs} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="jogadores" name="Jogadores" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="socios" name="Sócios" fill="hsl(263 70% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        {chartEmpresas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Empresas — Gastos e pendências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartEmpresas} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" height={45} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v) => formatCurrency(Number(v ?? 0))} />
                    <Bar dataKey="gastoMes" name="Gasto mês" fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pagamentosPendentes" name="A pagar" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crescimento (6 meses)</CardTitle>
            <p className="text-xs text-muted-foreground">Jogadores, sócios e gastos</p>
          </CardHeader>
          <CardContent>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartGrowth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorJogadores" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSocios" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(263 70% 50%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(263 70% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGasto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 76% 36%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} yAxisId="left" />
                  <YAxis orientation="right" tick={{ fontSize: 10 }} yAxisId="right" tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} formatter={(v, name) => [name === "gastoMes" ? formatCurrency(Number(v ?? 0)) : v, name === "novosJogadores" ? "Jogadores" : name === "novosSocios" ? "Sócios" : "Gasto"]} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="novosJogadores" name="Jogadores" stroke="hsl(var(--primary))" fill="url(#colorJogadores)" />
                  <Area yAxisId="left" type="monotone" dataKey="novosSocios" name="Sócios" stroke="hsl(263 70% 50%)" fill="url(#colorSocios)" />
                  <Area yAxisId="right" type="monotone" dataKey="gastoMes" name="Gasto" stroke="hsl(142 76% 36%)" fill="url(#colorGasto)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clubes (Futebol) */}
      {clubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shirt className="h-5 w-5" />
              Clubes (Futebol)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Jogadores, sócios, comissão técnica, psicólogos e marketing — dados pertinentes a clubes
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {clubs.map((t) => (
                <Link key={t.tenantId} href={`/dashboard/empresas/${t.tenantId}/edit`}>
                  <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-4 p-4">
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {t.logoUrl ? (
                            <img src={getPublicImageUrl(t.logoUrl) || t.logoUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Shirt className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{t.tenantName}</h3>
                          <p className="text-xs text-muted-foreground">{t.kindName}</p>
                          {(t.city || t.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {[t.city, t.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold text-primary">{t.playersCount}</span>
                          <p className="text-[10px] text-muted-foreground">Jogadores</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold text-violet-500">{t.sociosActiveCount}</span>
                          <p className="text-[10px] text-muted-foreground">Sócios</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold">{t.technicalStaffCount}</span>
                          <p className="text-[10px] text-muted-foreground">Comissão</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold">{t.psychologistsCount}</span>
                          <p className="text-[10px] text-muted-foreground">Psic.</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 pb-4 text-xs text-muted-foreground">
                        <span>Desde {formatDate(t.createdAt)}</span>
                        <span className="flex items-center gap-1 text-primary">Ver <ExternalLink className="h-3 w-3" /></span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empresas (não-futebol) */}
      {empresas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Empresas (Construtoras, Imobiliárias, etc.)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Fornecedores, produtos, ordens de compra, gastos e pagamentos a realizar — dados pertinentes a empresas
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {empresas.map((t) => (
                <Link key={t.tenantId} href={`/dashboard/empresas/${t.tenantId}/edit`}>
                  <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-4 p-4">
                        <div className="shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {t.logoUrl ? (
                            <img src={getPublicImageUrl(t.logoUrl) || t.logoUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold truncate">{t.tenantName}</h3>
                          <p className="text-xs text-muted-foreground">{t.kindName}</p>
                          {(t.city || t.country) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {[t.city, t.country].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 px-4 pb-4">
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold">{t.suppliersCount}</span>
                          <p className="text-[10px] text-muted-foreground">Fornec.</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold">{t.productsCount}</span>
                          <p className="text-[10px] text-muted-foreground">Produtos</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold text-emerald-600">{formatCurrencyCompact(t.totalGastoMes)}</span>
                          <p className="text-[10px] text-muted-foreground">Gasto mês</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/50">
                          <span className="text-sm font-bold text-amber-600">{formatCurrencyCompact(t.pagamentosARealizar)}</span>
                          <p className="text-[10px] text-muted-foreground">A pagar</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 pb-4 text-xs text-muted-foreground">
                        <span>{t.employeesCount} colaboradores · {t.purchaseOrdersCount} OPs</span>
                        <span className="flex items-center gap-1 text-primary">Ver <ExternalLink className="h-3 w-3" /></span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
