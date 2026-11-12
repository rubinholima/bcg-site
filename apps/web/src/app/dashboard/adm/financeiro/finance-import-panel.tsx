"use client";

import { useCallback, useEffect, useState } from "react";
import { Upload, RefreshCw, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { NativeSelectField } from "@/components/ui/native-select";

type ImportBatch = {
  id: string;
  status: string;
  originalFilename: string;
  fileHash: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  conflictRows: number;
  invalidRows: number;
  simulationSummary?: Record<string, unknown> | null;
};

type MappingRow = {
  id: string;
  mappingKind: string;
  sourceValue: string;
  action: string;
  targetId: string | null;
  confirmed: boolean;
};

type StagingRow = {
  id: string;
  sourceRowNumber: number;
  rowClassification: string | null;
  validationStatus: string;
  duplicateState: string;
  normalizedValues?: Record<string, unknown>;
};

export function FinanceImportPanel({ tenantId }: { tenantId: string }) {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<{ batch: ImportBatch; mappings: MappingRow[] } | null>(null);
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [rowFilter, setRowFilter] = useState("");

  const loadBatches = useCallback(async () => {
    const { data } = await api.get<ImportBatch[]>(
      `/financeiro/importacoes?tenantId=${encodeURIComponent(tenantId)}`,
    );
    setBatches(Array.isArray(data) ? data : []);
  }, [tenantId]);

  const loadDetail = useCallback(
    async (batchId: string) => {
      if (!batchId) return;
      const [d, r] = await Promise.all([
        api.get<{ batch: ImportBatch; mappings: MappingRow[] }>(
          `/financeiro/importacoes/${batchId}?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<{ items: StagingRow[] }>(
          `/financeiro/importacoes/${batchId}/linhas?tenantId=${encodeURIComponent(tenantId)}&pageSize=30${
            rowFilter ? `&validationStatus=${encodeURIComponent(rowFilter)}` : ""
          }${rowFilter === "INTERNAL_TRANSFER" ? `&classification=INTERNAL_TRANSFER` : ""}`,
        ),
      ]);
      setDetail(d.data);
      setRows(Array.isArray(r.data?.items) ? r.data.items : []);
    },
    [tenantId, rowFilter],
  );

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("tenantId", tenantId);
      fd.append("file", file);
      const { data } = await api.postForm<ImportBatch>("/financeiro/importacoes/upload", fd);
      setSelectedId(data.id);
      await loadBatches();
      setFeedback({ title: "Upload concluído", message: "Arquivo recebido. Execute a análise para gerar o preview." });
    } catch (e) {
      setFeedback({ title: "Erro", message: e instanceof Error ? e.message : "Falha no upload." });
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(`/financeiro/importacoes/${selectedId}/analisar?tenantId=${encodeURIComponent(tenantId)}`);
      await loadDetail(selectedId);
      await loadBatches();
    } catch (e) {
      setFeedback({ title: "Erro na análise", message: e instanceof Error ? e.message : "Falha." });
    } finally {
      setLoading(false);
    }
  }

  async function approveBatch() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(`/financeiro/importacoes/${selectedId}/aprovar?tenantId=${encodeURIComponent(tenantId)}`);
      await loadDetail(selectedId);
      setFeedback({ title: "Lote aprovado", message: "Aprovação registrada. Execução canônica continua bloqueada nesta fase." });
    } catch (e) {
      setFeedback({ title: "Aprovação bloqueada", message: e instanceof Error ? e.message : "Resolva mapeamentos e simule antes." });
    } finally {
      setLoading(false);
    }
  }

  async function simulate() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(`/financeiro/importacoes/${selectedId}/simular?tenantId=${encodeURIComponent(tenantId)}`);
      await loadDetail(selectedId);
    } catch (e) {
      setFeedback({ title: "Erro na simulação", message: e instanceof Error ? e.message : "Falha." });
    } finally {
      setLoading(false);
    }
  }

  async function confirmMapping(m: MappingRow) {
    if (!selectedId || !detail) return;
    const financeAccounts = await api
      .get<Array<{ id: string; name: string }>>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`)
      .then((r) => r.data)
      .catch(() => []);
    const match = financeAccounts.find((a) => a.name.toLowerCase() === m.sourceValue.toLowerCase());
    await api.patch(`/financeiro/importacoes/${selectedId}/mapeamentos`, {
      tenantId,
      updates: [
        {
          id: m.id,
          action: match ? "map_existing" : "review_required",
          targetId: match?.id ?? null,
          confirmed: Boolean(match && m.mappingKind !== "finance_account"),
        },
      ],
    });
    await loadDetail(selectedId);
  }

  const batch = detail?.batch;
  const sim = (batch?.simulationSummary ?? null) as Record<string, number> | null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importação histórica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Fluxo: upload → análise → mapeamento → simulação → aprovação. Importação canônica bloqueada nesta fase.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="import-file">Planilha (.xlsx)</Label>
              <Input
                id="import-file"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="text-foreground"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="button" disabled={!file || loading} onClick={() => void handleUpload()}>
              <Upload className="mr-1 h-4 w-4" />
              Enviar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <NativeSelectField
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            placeholder="Selecione um lote…"
            options={batches.map((b) => ({
              value: b.id,
              label: `${b.originalFilename} — ${b.status} (${b.totalRows} linhas)`,
            }))}
          />
          {selectedId ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => void analyze()}>
                <RefreshCw className="mr-1 h-4 w-4" />
                Analisar
              </Button>
              <Button type="button" size="sm" variant="secondary" disabled={loading} onClick={() => void simulate()}>
                <Play className="mr-1 h-4 w-4" />
                Simular importação
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading || batch?.status !== "READY_FOR_REVIEW"}
                onClick={() => void approveBatch()}
              >
                Aprovar lote
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {batch ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resumo do lote</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Total: {batch.totalRows}</p>
            <p>Válidas: {batch.validRows}</p>
            <p>Avisos: {batch.warningRows}</p>
            <p>Conflitos: {batch.conflictRows}</p>
            <p>Inválidas: {batch.invalidRows}</p>
            <p className="sm:col-span-2 text-xs text-muted-foreground break-all">Hash: {batch.fileHash}</p>
            {sim ? (
              <>
                <p>Obrigações: {sim.obligationsWouldCreate ?? 0}</p>
                <p>Baixas: {sim.settlementsWouldCreate ?? 0}</p>
                <p>Transferências: {sim.transfersWouldCreate ?? 0}</p>
                <p>Pendentes mapeamento: {sim.unresolvedMappings ?? 0}</p>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {detail?.mappings?.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mapeamentos pendentes</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor na planilha</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Confirmado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.mappingKind}</TableCell>
                    <TableCell>{m.sourceValue}</TableCell>
                    <TableCell>{m.action}</TableCell>
                    <TableCell>{m.confirmed ? "Sim" : "Não"}</TableCell>
                    <TableCell>
                      <Button type="button" size="sm" variant="outline" onClick={() => void confirmMapping(m)}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {selectedId ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Linhas (preview)</CardTitle>
            <NativeSelectField
              value={rowFilter}
              onChange={(e) => setRowFilter(e.target.value)}
              placeholder="Filtro"
              options={[
                { value: "", label: "Todas" },
                { value: "warning", label: "Avisos" },
                { value: "invalid", label: "Inválidas" },
                { value: "conflict", label: "Conflitos" },
              ]}
            />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duplicidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const n = r.normalizedValues ?? {};
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.sourceRowNumber}</TableCell>
                      <TableCell>{r.rowClassification}</TableCell>
                      <TableCell>{r.validationStatus}</TableCell>
                      <TableCell>{r.duplicateState}</TableCell>
                      <TableCell>{String(n.category ?? "—")}</TableCell>
                      <TableCell>{String(n.accountLabel ?? "—")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
