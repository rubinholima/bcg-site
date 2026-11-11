"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { REPORT_PRESETS } from "@/lib/athlete-contract-hub";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";

type ReportRow = {
  id: string;
  playerName: string;
  category: string | null;
  contractType: string | null;
  status: string;
  endDate: string | null;
  daysUntilExpiry: number | null;
  signatureStatus: string | null;
};

function ContratosAtletasContent() {
  const sp = useSearchParams();
  const tenantId = sp.get("tenantId") ?? "";
  const [preset, setPreset] = useState<string>("expiring_30");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("endDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const p = REPORT_PRESETS.find((x) => x.id === preset) ?? REPORT_PRESETS[0];
      const { data } = await api.post<{ rows: ReportRow[]; total?: number }>(
        `/tenants/${tenantId}/athlete-contracts/report`,
        {
          ...p,
          category: category.trim() || undefined,
          sortBy,
          sortDir,
          offset,
          limit: 50,
        },
      );
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setTotal(typeof data?.total === "number" ? data.total : 0);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, preset, category, sortBy, sortDir, offset]);

  useEffect(() => {
    void run();
  }, [run]);

  function exportCsv() {
    const header = ["Atleta", "Categoria", "Tipo", "Status", "Fim", "Dias", "Assinatura"];
    const lines = rows.map((r) =>
      [
        r.playerName,
        r.category ?? "",
        r.contractType ?? "",
        r.status,
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
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          {REPORT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={() => void run()} disabled={!tenantId || loading}>
          Atualizar
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          Exportar CSV
        </Button>
        <input
          className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
          placeholder="Categoria"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
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
        <Button type="button" size="sm" variant="ghost" asChild>
          <a href={`/dashboard/relatorios/futebol/contratos-atletas/tipos?tenantId=${tenantId}`}>
            Tipos de contrato
          </a>
        </Button>
      </div>
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
              <TableHead>Fim</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Assinatura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  {loading ? "Carregando…" : "Nenhum registro."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.playerName}</TableCell>
                  <TableCell>{r.category ?? "—"}</TableCell>
                  <TableCell>{r.contractType ?? "—"}</TableCell>
                  <TableCell>{r.status}</TableCell>
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
