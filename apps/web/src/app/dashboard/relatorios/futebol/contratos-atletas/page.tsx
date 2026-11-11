"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import {
  EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS,
  buildAthleteContractReportBody,
  type AthleteContractReportFilterState,
} from "@/lib/athlete-contract-report-filters";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { ContratosAtletasReportFilters } from "@/components/dashboard/futebol/relatorios/ContratosAtletasReportFilters";

type ReportRow = {
  id: string;
  playerName: string;
  category: string | null;
  contractType: string | null;
  status: string;
  endDate: string | null;
  daysUntilExpiry: number | null;
  signatureStatus: string | null;
  federativeStatus?: string | null;
};

type PlayerOpt = { id: string; name: string; category?: string | null };
type TypeOpt = { id: string; name: string };
type UserOpt = { id: string; cognitoSub?: string | null; name?: string | null; username: string };

function ContratosAtletasContent() {
  const sp = useSearchParams();
  const tenantId = sp.get("tenantId") ?? "";
  const [preset, setPreset] = useState<string>("expiring_30");
  const [filters, setFilters] = useState<AthleteContractReportFilterState>({
    ...EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS,
  });
  const [sortBy, setSortBy] = useState("endDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerOpt[]>([]);
  const [types, setTypes] = useState<TypeOpt[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    setOptionsLoading(true);
    void Promise.all([
      api.get<PlayerOpt[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<TypeOpt[]>(`/tenants/${tenantId}/athlete-contract-types`),
      api.get<UserOpt[]>("/users"),
    ])
      .then(([p, t, u]) => {
        setPlayers(Array.isArray(p.data) ? p.data : []);
        setTypes(Array.isArray(t.data) ? t.data.filter((x) => (x as { active?: boolean }).active !== false) : []);
        setUsers(Array.isArray(u.data) ? u.data : []);
      })
      .catch(() => {
        setPlayers([]);
        setTypes([]);
        setUsers([]);
      })
      .finally(() => setOptionsLoading(false));
  }, [tenantId]);

  const run = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const body = buildAthleteContractReportBody(preset, filters, {
        sortBy,
        sortDir,
        offset,
        limit: 50,
      });
      const { data } = await api.post<{ rows: ReportRow[]; total?: number }>(
        `/tenants/${tenantId}/athlete-contracts/report`,
        body,
      );
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch (e) {
      setRows([]);
      setTotal(0);
      setError(e instanceof Error ? e.message : "Erro ao carregar relatório.");
    } finally {
      setLoading(false);
    }
  }, [tenantId, preset, filters, sortBy, sortDir, offset]);

  useEffect(() => {
    void run();
  }, [run]);

  function clearFilters() {
    setFilters({ ...EMPTY_ATHLETE_CONTRACT_REPORT_FILTERS });
    setOffset(0);
  }

  function exportCsv() {
    const header = ["Atleta", "Categoria", "Tipo", "Status", "Federação", "Fim", "Dias", "Assinatura"];
    const lines = rows.map((r) =>
      [
        r.playerName,
        r.category ?? "",
        r.contractType ?? "",
        r.status,
        r.federativeStatus ?? "",
        r.endDate?.slice(0, 10) ?? "",
        r.daysUntilExpiry ?? "",
        r.signatureStatus ?? "",
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([`\uFEFF${[header.join(","), ...lines].join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contratos-atletas.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <ContratosAtletasReportFilters
        tenantId={tenantId}
        preset={preset}
        onPresetChange={(v) => {
          setPreset(v);
          setOffset(0);
        }}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setOffset(0);
        }}
        players={players}
        types={types}
        users={users}
        loadingOptions={optionsLoading}
        onApply={() => void run()}
        onClear={clearFilters}
        applying={loading}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="endDate">Ordenar: fim</option>
          <option value="playerName">Ordenar: atleta</option>
          <option value="daysUntilExpiry">Ordenar: dias</option>
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>
        <Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          Exportar CSV
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <a href={`/dashboard/relatorios/futebol/contratos-atletas/tipos?tenantId=${tenantId}`}>
            Tipos de contrato
          </a>
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="text-xs text-muted-foreground">
        Total: {total} · Página {Math.floor(offset / 50) + 1}
        {total > offset + 50 ? (
          <>
            {" "}
            <button type="button" className="underline" onClick={() => setOffset((o) => o + 50)}>
              Próxima
            </button>
          </>
        ) : null}
        {offset > 0 ? (
          <>
            {" "}
            <button type="button" className="underline" onClick={() => setOffset((o) => Math.max(0, o - 50))}>
              Anterior
            </button>
          </>
        ) : null}
      </p>

      {!tenantId ? (
        <p className="text-sm text-muted-foreground">Informe tenantId na URL (?tenantId=…).</p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Atleta</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Federação</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Assinatura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  {loading ? "Carregando…" : error ? "—" : "Nenhum registro."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.playerName}</TableCell>
                  <TableCell>{r.category ?? "—"}</TableCell>
                  <TableCell>{r.contractType ?? "—"}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.federativeStatus ?? "—"}</TableCell>
                  <TableCell>{r.endDate?.slice(0, 10) ?? "—"}</TableCell>
                  <TableCell>{r.daysUntilExpiry ?? "—"}</TableCell>
                  <TableCell>{r.signatureStatus ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ContratosAtletasReportPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Contratos de atletas"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <ContratosAtletasContent />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
