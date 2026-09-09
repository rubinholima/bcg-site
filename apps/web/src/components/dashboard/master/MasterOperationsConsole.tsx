"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  Clock3,
  Radio,
  Search,
  Users,
  UserCheck,
} from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import type { LiveUserItem, LiveUsersResponse, PlatformInsightsResponse } from "@/lib/master-ops-types";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { DashboardFilterBar, FilterBarField } from "@/components/dashboard/cup360/DashboardFilterBar";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";
import {
  formatCompactActivityTime,
  formatCompactDisplayName,
  formatLiveUserRole,
  liveUserCompanyKey,
  liveUserCompanyLabel,
  OpsSection,
  PresenceStatusBadge,
  UserAvatar,
} from "./master-ops-ui";

function LiveUserDetail({ item }: { item: LiveUserItem }) {
  const fullName = item.user.name || item.user.username;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/15 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{fullName}</span>
        <span className="text-muted-foreground">@{item.user.username}</span>
        <PresenceStatusBadge status={item.status} />
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Perfil</dt>
          <dd>{formatLiveUserRole(item.user.role)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Empresa</dt>
          <dd>{liveUserCompanyLabel(item)}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Módulo</dt>
          <dd>{item.currentModule ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Página</dt>
          <dd className="truncate" title={item.currentPageTitle ?? item.currentPath ?? undefined}>
            {item.currentPageTitle ?? item.currentPath ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Sessão</dt>
          <dd>{item.connectedDuration}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Última atividade</dt>
          <dd>{formatDateTimeDayMonYear(item.lastActivityAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function CellTruncate({
  children,
  title,
  className,
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={cn("block truncate", className)} title={title}>
      {children}
    </span>
  );
}

export function MasterOperationsConsole() {
  const [live, setLive] = useState<LiveUsersResponse | null>(null);
  const [insights, setInsights] = useState<PlatformInsightsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "idle">("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : "";
      const [liveRes, insightsRes] = await Promise.all([
        authFetch(`/api/master/live-users${q}`),
        authFetch("/api/master/platform-insights"),
      ]);
      if (!liveRes.ok) throw new Error("Falha ao carregar usuários online.");
      if (!insightsRes.ok) throw new Error("Falha ao carregar métricas da plataforma.");
      setLive((await liveRes.json()) as LiveUsersResponse);
      setInsights((await insightsRes.json()) as PlatformInsightsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of live?.items ?? []) {
      const key = liveUserCompanyKey(item);
      map.set(key, liveUserCompanyLabel(item));
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [live]);

  const filtered = useMemo(() => {
    let items = live?.items ?? [];
    if (statusFilter !== "all") items = items.filter((i) => i.status === statusFilter);
    if (companyFilter !== "all") items = items.filter((i) => liveUserCompanyKey(i) === companyFilter);
    return items;
  }, [live, statusFilter, companyFilter]);

  const selected =
    filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (selectedId && !filtered.some((i) => i.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  const kpis = {
    online: insights?.live.online ?? live?.online ?? 0,
    idle: insights?.live.idle ?? live?.idle ?? 0,
    activeToday: insights?.activeTodayUsers ?? 0,
    totalUsers: insights?.totalUsers ?? 0,
    activeTenants: insights?.activeTenantCount ?? 0,
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-5 lg:gap-4">
        <KpiCard
          label="Usuários online agora"
          value={loading && !live ? "—" : kpis.online}
          hint="Atividade nos últimos 2 min"
          icon={Radio}
          tone="success"
        />
        <KpiCard
          label="Usuários ociosos"
          value={loading && !live ? "—" : kpis.idle}
          hint="Sessão ativa sem interação recente"
          icon={Clock3}
          tone="warning"
        />
        <KpiCard
          label="Usuários ativos hoje"
          value={loading && !insights ? "—" : kpis.activeToday}
          hint="Sessões com atividade registrada hoje"
          icon={UserCheck}
          tone="info"
        />
        <KpiCard
          label="Total de usuários"
          value={loading && !insights ? "—" : kpis.totalUsers}
          hint="Cadastro global da plataforma"
          icon={Users}
        />
        <KpiCard
          label="Empresas com usuários ativos"
          value={loading && !insights ? "—" : kpis.activeTenants}
          hint="Tenants com sessão online/ociosa"
          icon={Building2}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <OpsSection
        title="Operação ao vivo"
        description="Sessões ativas na plataforma — atualização automática a cada 15 segundos"
        action={
          live?.asOf ? (
            <span className={cup360.type.caption}>
              {formatDateTimeDayMonYear(live.asOf)}
            </span>
          ) : null
        }
      >
        <div className="min-w-0 space-y-4">
          <DashboardFilterBar className="border-0 bg-muted/20 p-3">
            <FilterBarField label="Buscar" className="min-w-0 sm:max-w-none sm:flex-[2]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome, usuário, empresa, módulo…"
                  className="h-9 min-w-0 pl-9"
                />
              </div>
            </FilterBarField>
            <FilterBarField label="Empresa" className="min-w-0 sm:flex-1">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Todas as empresas</option>
                {companyOptions.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </FilterBarField>
            <FilterBarField label="Status" className="min-w-0 sm:max-w-[9rem]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Todos</option>
                <option value="online">Online</option>
                <option value="idle">Ocioso</option>
              </select>
            </FilterBarField>
          </DashboardFilterBar>

          {loading && !live ? (
            <p className={cup360.type.caption}>Carregando presença…</p>
          ) : error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p>{error}</p>
              <button type="button" className="mt-2 text-primary underline" onClick={() => void load()}>
                Tentar novamente
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/50" />
              <p className={cup360.type.body}>Nenhum usuário ativo no momento.</p>
            </div>
          ) : (
            <>
              <div className="hidden xl:block min-w-0 w-full rounded-lg border border-border/60">
                <Table containerClassName="overflow-visible" className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[11%]" />
                    <col className="w-[14%]" />
                    <col className="w-[24%]" />
                    <col className="w-[8%]" />
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-2 text-xs">Usuário</TableHead>
                      <TableHead className="h-9 px-2 text-xs">Perfil</TableHead>
                      <TableHead className="h-9 px-2 text-xs">Empresa</TableHead>
                      <TableHead className="h-9 px-2 text-xs">Módulo / Página</TableHead>
                      <TableHead className="h-9 px-2 text-xs">Sessão</TableHead>
                      <TableHead className="h-9 px-2 text-xs">Atividade</TableHead>
                      <TableHead className="h-9 px-2 text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => {
                      const fullName = item.user.name || item.user.username;
                      const compactName = formatCompactDisplayName(item.user.name, item.user.username);
                      const roleLabel = formatLiveUserRole(item.user.role);
                      const company = liveUserCompanyLabel(item);
                      const moduleLine = item.currentModule ?? "—";
                      const pageLine = item.currentPageTitle ?? item.currentPath ?? "—";
                      const modulePageTitle = `${moduleLine} · ${pageLine}`;

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "h-10 cursor-pointer",
                            selected?.id === item.id && "bg-muted/40",
                          )}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <TableCell className="px-2 py-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <UserAvatar
                                name={item.user.name}
                                username={item.user.username}
                                status={item.status}
                              />
                              <div className="min-w-0">
                                <p
                                  className="truncate text-sm font-medium leading-tight"
                                  title={fullName}
                                >
                                  {compactName}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground leading-tight">
                                  @{item.user.username}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs" title={roleLabel}>
                            <CellTruncate>{roleLabel}</CellTruncate>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs" title={company}>
                            <CellTruncate>{company}</CellTruncate>
                          </TableCell>
                          <TableCell className="px-2 py-2 min-w-0">
                            <CellTruncate className="text-xs" title={modulePageTitle}>
                              {moduleLine}
                            </CellTruncate>
                            <CellTruncate className="text-[11px] text-muted-foreground" title={pageLine}>
                              {pageLine}
                            </CellTruncate>
                          </TableCell>
                          <TableCell className="px-2 py-2 text-xs tabular-nums whitespace-nowrap">
                            {item.connectedDuration}
                          </TableCell>
                          <TableCell
                            className="px-2 py-2 text-xs tabular-nums whitespace-nowrap text-muted-foreground"
                            title={formatDateTimeDayMonYear(item.lastActivityAt)}
                          >
                            {formatCompactActivityTime(item.lastActivityAt)}
                          </TableCell>
                          <TableCell className="px-2 py-2">
                            <PresenceStatusBadge status={item.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {selected ? (
                <div className="hidden xl:block">
                  <LiveUserDetail item={selected} />
                </div>
              ) : null}

              <div className="xl:hidden space-y-2">
                {filtered.map((item) => {
                  const fullName = item.user.name || item.user.username;
                  const compactName = formatCompactDisplayName(item.user.name, item.user.username);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-border/60 bg-muted/10 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          name={item.user.name}
                          username={item.user.username}
                          status={item.status}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium" title={fullName}>
                                {compactName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {liveUserCompanyLabel(item)} · {formatLiveUserRole(item.user.role)}
                              </p>
                            </div>
                            <PresenceStatusBadge status={item.status} />
                          </div>
                          <p
                            className="mt-2 truncate text-xs text-muted-foreground"
                            title={`${item.currentModule ?? "Dashboard"}${item.currentPageTitle ? ` · ${item.currentPageTitle}` : ""}`}
                          >
                            {item.currentModule ?? "Dashboard"}
                            {item.currentPageTitle ? ` · ${item.currentPageTitle}` : ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Sessão: {item.connectedDuration}</span>
                            <span title={formatDateTimeDayMonYear(item.lastActivityAt)}>
                              {formatCompactActivityTime(item.lastActivityAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </OpsSection>
    </div>
  );
}
