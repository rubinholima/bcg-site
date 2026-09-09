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
import type { LiveUsersResponse, PlatformInsightsResponse } from "@/lib/master-ops-types";
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
import { cup360 } from "@/lib/cup360-design-tokens";
import {
  formatLiveUserRole,
  OpsSection,
  PresenceStatusBadge,
  UserAvatar,
} from "./master-ops-ui";

export function MasterOperationsConsole() {
  const [live, setLive] = useState<LiveUsersResponse | null>(null);
  const [insights, setInsights] = useState<PlatformInsightsResponse | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "idle">("all");
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

  const filtered = useMemo(() => {
    const items = live?.items ?? [];
    if (statusFilter === "all") return items;
    return items.filter((i) => i.status === statusFilter);
  }, [live, statusFilter]);

  const kpis = {
    online: insights?.live.online ?? live?.online ?? 0,
    idle: insights?.live.idle ?? live?.idle ?? 0,
    activeToday: insights?.activeTodayUsers ?? 0,
    totalUsers: insights?.totalUsers ?? 0,
    activeTenants: insights?.activeTenantCount ?? 0,
  };

  return (
    <div className="space-y-4">
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
        <div className="space-y-4">
          <DashboardFilterBar className="border-0 bg-muted/20 p-3">
            <FilterBarField label="Buscar" className="sm:max-w-none sm:flex-[2]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nome, usuário, empresa, módulo…"
                  className="h-9 pl-9"
                />
              </div>
            </FilterBarField>
            <FilterBarField label="Status">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
              <div className="hidden xl:block overflow-x-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-10">Usuário</TableHead>
                      <TableHead className="h-10">Perfil</TableHead>
                      <TableHead className="h-10">Empresa</TableHead>
                      <TableHead className="h-10">Módulo / Página</TableHead>
                      <TableHead className="h-10">Sessão</TableHead>
                      <TableHead className="h-10">Última atividade</TableHead>
                      <TableHead className="h-10">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item) => (
                      <TableRow key={item.id} className="h-11">
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            <UserAvatar
                              name={item.user.name}
                              username={item.user.username}
                              status={item.status}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-sm">
                                {item.user.name || item.user.username}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                @{item.user.username}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatLiveUserRole(item.user.role)}</TableCell>
                        <TableCell className="text-sm max-w-[10rem] truncate">
                          {item.tenant?.name ?? "Grupo Master"}
                        </TableCell>
                        <TableCell className="max-w-[14rem]">
                          <p className="truncate text-sm">{item.currentModule ?? "—"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.currentPageTitle ?? item.currentPath ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">
                          {item.connectedDuration}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTimeDayMonYear(item.lastActivityAt)}
                        </TableCell>
                        <TableCell>
                          <PresenceStatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="xl:hidden space-y-2">
                {filtered.map((item) => (
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
                            <p className="font-medium truncate">
                              {item.user.name || item.user.username}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.tenant?.name ?? "Grupo Master"} · {formatLiveUserRole(item.user.role)}
                            </p>
                          </div>
                          <PresenceStatusBadge status={item.status} />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground truncate">
                          {item.currentModule ?? "Dashboard"}
                          {item.currentPageTitle ? ` · ${item.currentPageTitle}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Sessão: {item.connectedDuration}</span>
                          <span>{formatDateTimeDayMonYear(item.lastActivityAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </OpsSection>
    </div>
  );
}
