"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Globe2, MonitorSmartphone, Search, UserRound } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import type { LiveUserItem, LiveUsersResponse } from "@/lib/master-ops-types";
import { formatRoleSlug } from "@/lib/platform-roles";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardFilterBar, FilterBarField } from "@/components/dashboard/cup360/DashboardFilterBar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: LiveUserItem["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        status === "online"
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-amber-500/15 text-amber-400",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          status === "online" ? "bg-emerald-400" : "bg-amber-400",
        )}
      />
      {status === "online" ? "Online" : "Ocioso"}
    </span>
  );
}

function UserDetail({ item }: { item: LiveUserItem }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={item.status} />
        <span className="font-semibold">{item.user.name || item.user.username}</span>
        <span className="text-muted-foreground">@{item.user.username}</span>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Perfil</dt><dd>{formatRoleSlug(item.user.role ?? "user")}</dd></div>
        <div><dt className="text-muted-foreground">Empresa</dt><dd>{item.tenant?.name ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Módulo</dt><dd>{item.currentModule ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Página</dt><dd>{item.currentPageTitle ?? item.currentPath ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Sessão iniciada</dt><dd>{formatDateTimeDayMonYear(item.startedAt)}</dd></div>
        <div><dt className="text-muted-foreground">Conectado há</dt><dd>{item.connectedDuration}</dd></div>
        <div><dt className="text-muted-foreground">Última atividade</dt><dd>{formatDateTimeDayMonYear(item.lastActivityAt)}</dd></div>
        <div><dt className="text-muted-foreground">Dispositivo</dt><dd>{[item.deviceLabel, item.browserLabel].filter(Boolean).join(" · ") || "—"}</dd></div>
      </dl>
    </div>
  );
}

export function MasterLiveUsersPanel() {
  const [data, setData] = useState<LiveUsersResponse | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "idle">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await authFetch(`/api/master/live-users${query ? `?q=${encodeURIComponent(query)}` : ""}`);
      if (!res.ok) throw new Error("Falha ao carregar usuários online.");
      setData((await res.json()) as LiveUsersResponse);
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
    const items = data?.items ?? [];
    if (statusFilter === "all") return items;
    return items.filter((i) => i.status === statusFilter);
  }, [data, statusFilter]);

  const selected = filtered.find((i) => i.id === selectedId) ?? filtered[0] ?? null;

  return (
    <Card className="min-w-0 rounded-xl shadow-md overflow-hidden">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-500" />
            Usuários online agora
          </CardTitle>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-400">
              {data?.online ?? 0} online
            </span>
            <span className="rounded-full bg-amber-500/15 px-3 py-1 text-amber-400">
              {data?.idle ?? 0} ociosos
            </span>
          </div>
        </div>
        <DashboardFilterBar>
          <FilterBarField label="Buscar" className="sm:max-w-none sm:flex-[2]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nome, usuário, empresa, módulo…"
                className="pl-9"
              />
            </div>
          </FilterBarField>
          <FilterBarField label="Status">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Todos</option>
              <option value="online">Online</option>
              <option value="idle">Ocioso</option>
            </select>
          </FilterBarField>
        </DashboardFilterBar>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <p className="text-sm text-muted-foreground py-6">Carregando presença…</p>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
            <p>{error}</p>
            <button type="button" className="mt-2 underline" onClick={() => void load()}>
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">Nenhum usuário ativo no momento.</p>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Módulo / Página</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conectado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn("cursor-pointer", selected?.id === item.id && "bg-muted/40")}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <TableCell>
                        <div className="font-medium">{item.user.name || item.user.username}</div>
                        <div className="text-xs text-muted-foreground">@{item.user.username}</div>
                      </TableCell>
                      <TableCell>{formatRoleSlug(item.user.role ?? "user")}</TableCell>
                      <TableCell>{item.tenant?.name ?? "—"}</TableCell>
                      <TableCell>
                        <div>{item.currentModule ?? "—"}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[16rem]">
                          {item.currentPageTitle ?? item.currentPath}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={item.status} /></TableCell>
                      <TableCell>{item.connectedDuration}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="lg:hidden space-y-3">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors",
                    selected?.id === item.id ? "border-primary/40 bg-muted/30" : "border-border/60",
                  )}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.user.name || item.user.username}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.tenant?.name ?? "Grupo Master"} · {item.currentPageTitle ?? item.currentModule ?? "Dashboard"}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{formatRoleSlug(item.user.role ?? "user")}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{item.connectedDuration}</span>
                    {item.deviceLabel ? (
                      <span className="inline-flex items-center gap-1"><MonitorSmartphone className="h-3.5 w-3.5" />{item.deviceLabel}</span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {selected ? <UserDetail item={selected} /> : null}
          </>
        )}
        {data?.asOf ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
            <Globe2 className="h-3.5 w-3.5" />
            Atualizado {formatDateTimeDayMonYear(data.asOf)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
