"use client";

import { useState, useEffect, useCallback } from "react";
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
  Wallet,
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
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
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

interface DiretoriaOmieFinanceiro {
  geradoEm: string;
  tenantsComIntegracao: number;
  empresas: {
    tenantId: string;
    tenantName: string;
    receberAberto: number;
    pagarAberto: number;
    ok: boolean;
    erroReceber?: string;
    erroPagar?: string;
    avisoReceber?: string;
    avisoPagar?: string;
    comprasValorMes: number;
    comprasPendentes: number;
    okCompras: boolean;
    erroCompras?: string;
    avisoCompras?: string;
  }[];
  totais: {
    receberAberto: number;
    pagarAberto: number;
    liquido: number;
    linhasOk: number;
  };
  chartPorEmpresa: { name: string; receber: number; pagar: number; liquido: number }[];
  chartComprasPorEmpresa: { name: string; valorMes: number; pendentes: number }[];
  totaisCompras: { valorMes: number; pendentes: number; linhasOk: number };
  chartComprasPorMes: { month: string; valor: number }[];
}

function formatDate(iso: string): string {
  return formatDateDayMonYear(iso);
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
  const [error, setError] = useState<string | null>(null);

  const [omieFin, setOmieFin] = useState<DiretoriaOmieFinanceiro | null>(null);
  const [omieLoading, setOmieLoading] = useState(true);
  const [omieErr, setOmieErr] = useState<string | null>(null);

  const fetchOmieFinanceiro = useCallback(() => {
    setOmieErr(null);
    setOmieLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    api
      .get<DiretoriaOmieFinanceiro>("/diretoria/omie-financeiro", { signal: controller.signal })
      .then(({ data: d }) => {
        setOmieFin(d ?? null);
        setOmieErr(null);
      })
      .catch((err) => {
        setOmieFin(null);
        setOmieErr(err?.message || "Não foi possível carregar os dados consolidados.");
      })
      .finally(() => {
        clearTimeout(timeout);
        setOmieLoading(false);
      });
  }, []);

  const fetchDashboard = useCallback(() => {
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    api
      .get<DiretoriaDashboard>("/diretoria/dashboard", { signal: controller.signal })
      .then(({ data: d }) => {
        setData(d ?? null);
        setError(null);
      })
      .catch((err) => {
        setData(null);
        setError(err?.message || "Erro ao carregar o relatório. Verifique se a API está online.");
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!canAccessModule("diretoria") && !authLoading) return;
    fetchDashboard();
  }, [canAccessModule, authLoading, fetchDashboard]);

  useEffect(() => {
    if (!canAccessModule("diretoria") && !authLoading) return;
    fetchOmieFinanceiro();
  }, [canAccessModule, authLoading, fetchOmieFinanceiro]);

  if (!canAccessModule("diretoria") && !authLoading) {
    router.replace("/403");
    return null;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-destructive text-center max-w-md">{error}</p>
        <Button onClick={fetchDashboard}>Tentar novamente</Button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, clubs, empresas, chartClubs, chartGrowth } = data;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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

      {/* Fluxo de caixa — a receber / a pagar em aberto */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-emerald-500" />
              Fluxo de caixa
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              A consolidação pode levar alguns minutos com muitas empresas.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={fetchOmieFinanceiro} disabled={omieLoading}>
            {omieLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Atualizando…
              </>
            ) : (
              "Atualizar"
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {omieErr && (
            <p className="text-sm text-destructive">
              {omieErr}
              {omieErr.includes("aborted") || omieErr.includes("Abort")
                ? " — tempo esgotado. Tente atualizar de novo."
                : ""}
            </p>
          )}
          {omieLoading && !omieFin && !omieErr && (
            <div className="flex items-center gap-2 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando totais…
            </div>
          )}
          {omieFin && omieFin.tenantsComIntegracao === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma empresa com integração configurada. Cadastre as credenciais na edição da empresa.
            </p>
          )}
          {omieFin && omieFin.tenantsComIntegracao > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-muted/40 border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">A receber (em aberto)</p>
                    <p className="text-xl font-bold text-emerald-500 tabular-nums">
                      {formatCurrency(omieFin.totais.receberAberto)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {omieFin.totais.linhasOk} de {omieFin.empresas.length} empresa(s) OK
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/40 border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">A pagar (em aberto)</p>
                    <p className="text-xl font-bold text-rose-400 tabular-nums">
                      {formatCurrency(omieFin.totais.pagarAberto)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/40 border-border">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Saldo sintético (rec. − pag.)</p>
                    <p
                      className={`text-xl font-bold tabular-nums ${omieFin.totais.liquido >= 0 ? "text-sky-400" : "text-amber-500"}`}
                    >
                      {formatCurrency(omieFin.totais.liquido)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">Indicativo.</p>
                  </CardContent>
                </Card>
              </div>
              {omieFin.totais.linhasOk < omieFin.empresas.length && (
                <p className="text-xs text-amber-600 dark:text-amber-400/90">
                  Algumas empresas não retornaram receber e pagar; os totais acima são parciais.
                </p>
              )}
              {omieFin.empresas.some((e) => !e.ok) && (
                <div className="rounded-md border border-border bg-muted/30 p-3 text-xs space-y-2">
                  <p className="font-medium text-foreground">Empresas com erro na consulta</p>
                  <ul className="list-disc pl-4 text-muted-foreground space-y-1">
                    {omieFin.empresas
                      .filter((e) => !e.ok)
                      .map((e) => (
                        <li key={e.tenantId}>
                          <span className="text-foreground">{e.tenantName}</span>
                          {e.erroReceber && <span className="block">Receber: {e.erroReceber}</span>}
                          {e.erroPagar && <span className="block">Pagar: {e.erroPagar}</span>}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {omieFin.empresas.some((e) => e.avisoReceber || e.avisoPagar) && (
                <p className="text-[11px] text-muted-foreground">
                  Em alto volume de títulos, as somas podem ser parciais.
                </p>
              )}
              {omieFin.chartPorEmpresa.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
                  <div className="lg:col-span-2 space-y-2 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">A receber e a pagar por empresa</h3>
                    <div className="h-[280px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={omieFin.chartPorEmpresa}
                          margin={{ top: 10, right: 10, left: 0, bottom: 50 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                            angle={-35}
                            textAnchor="end"
                            height={45}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                            tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              color: "hsl(var(--foreground))",
                            }}
                            formatter={(v) => formatCurrency(Number(v ?? 0))}
                          />
                          <Legend />
                          <Bar dataKey="receber" name="A receber" fill="hsl(142 76% 42%)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pagar" name="A pagar" fill="hsl(350 70% 50%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">Saldo por empresa</h3>
                    <div className="h-[280px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={omieFin.chartPorEmpresa}
                          margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" horizontal={false} />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                            tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={88}
                            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              color: "hsl(var(--foreground))",
                            }}
                            formatter={(v) => formatCurrency(Number(v ?? 0))}
                          />
                          <Bar dataKey="liquido" name="Saldo" radius={[0, 4, 4, 0]}>
                            {omieFin.chartPorEmpresa.map((e, i) => (
                              <Cell
                                key={i}
                                fill={e.liquido >= 0 ? "hsl(199 89% 48%)" : "hsl(38 92% 50%)"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1 — Compras (inalterado: 6 meses + por empresa) */}
        <div className="space-y-6 min-w-0">
          {!omieFin && omieLoading ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compras</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          ) : omieFin && omieFin.tenantsComIntegracao > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pedidos de compra — últimos 6 meses</CardTitle>
                  <CardDescription>
                    Valor por mês conforme a data de inclusão do pedido, somando empresas com integração ativa.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {omieLoading ? (
                    <div className="flex items-center justify-center gap-2 text-muted-foreground h-[200px]">
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                      Carregando…
                    </div>
                  ) : (
                    <div className="h-[220px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={omieFin.chartComprasPorMes ?? []}
                          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                          <YAxis
                            tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                            tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              color: "hsl(var(--foreground))",
                            }}
                            formatter={(v) => formatCurrency(Number(v ?? 0))}
                          />
                          <Bar dataKey="valor" name="Pedidos" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
              {(omieFin.chartComprasPorEmpresa?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pedidos no mês corrente — por empresa</CardTitle>
                    <CardDescription>Valor total e pendentes no mês de referência.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {omieLoading ? (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground h-[180px]">
                        <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                        Carregando…
                      </div>
                    ) : (
                      <div className="h-[240px] w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={omieFin.chartComprasPorEmpresa}
                            margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-800" />
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                              angle={-35}
                              textAnchor="end"
                              height={44}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                              tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                color: "hsl(var(--foreground))",
                              }}
                              formatter={(v) => formatCurrency(Number(v ?? 0))}
                            />
                            <Legend />
                            <Bar dataKey="valorMes" name="No mês" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="pendentes" name="Pendentes" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compras</CardTitle>
              </CardHeader>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma empresa com integração configurada.
              </CardContent>
            </Card>
          )}
          {omieErr && !omieLoading && (
            <p className="text-xs text-destructive px-1">{omieErr}</p>
          )}
        </div>

        {/* 2 — Clubes */}
        {chartClubs.length > 0 ? (
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
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Clubes — Jogadores e sócios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-20 text-center">Sem clubes no recorte.</p>
            </CardContent>
          </Card>
        )}

        {/* 3 — Crescimento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crescimento (6 meses)</CardTitle>
            <CardDescription>Jogadores, sócios e gasto em ordens de compra.</CardDescription>
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
