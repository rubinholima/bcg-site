"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, RefreshCw, Play, AlertTriangle, Link2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";

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
  simulationStale?: boolean;
  executionApprovedAt?: string | null;
  executionResult?: Record<string, unknown> | null;
};

type MappingRow = {
  id: string;
  mappingKind: string;
  sourceValue: string;
  action: string;
  targetId: string | null;
  confirmed: boolean;
};

type BulkSection = {
  mappingKind: string;
  items: Array<{
    id: string;
    sourceValue: string;
    affectedRows: number;
    financialTotal: number | null;
    action: string;
    targetId: string | null;
    confirmed: boolean;
    status: string;
  }>;
};

type DuplicateItem = {
  stagingRowId: string;
  duplicateState: string;
  duplicateDecision: string | null;
  flagReason: string;
  source: Record<string, unknown>;
  existing: Record<string, unknown> | null;
};

type ConflictItem = {
  stagingRowId: string;
  sourceRowNumber: number;
  codes: string[];
  rowDecision: string | null;
};

type StagingRow = {
  id: string;
  sourceRowNumber: number;
  rowClassification: string | null;
  validationStatus: string;
  duplicateState: string;
  normalizedValues?: Record<string, unknown>;
};

const MAPPING_KIND_LABEL: Record<string, string> = {
  company: "Empresas",
  finance_account: "Contas financeiras",
  category: "Grupos (categoria)",
  subcategory: "Categorias",
  counterparty: "Contrapartes",
  payment_method: "Formas de pagamento",
  document_type: "Tipos de documento",
};

export function FinanceImportPanel({ tenantId }: { tenantId: string }) {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<{
    batch: ImportBatch;
    mappings: MappingRow[];
    readiness?: { readyForImport: boolean; blockingReasons: string[] };
  } | null>(null);
  const [bulkSections, setBulkSections] = useState<BulkSection[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [rows, setRows] = useState<StagingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [rowFilter, setRowFilter] = useState("");
  const [accountPicker, setAccountPicker] = useState<{ mappingId: string; sourceValue: string } | null>(null);
  const [newAccount, setNewAccount] = useState({
    name: "",
    accountType: "BANK",
    institution: "",
    currency: "BRL",
    notes: "",
  });
  const [activeTab, setActiveTab] = useState("resumo");

  const TAB_ITEMS = [
    { id: "resumo", label: "Resumo" },
    { id: "mapeamentos", label: "Mapeamentos" },
    { id: "duplicidades", label: "Possíveis duplicidades" },
    { id: "conflitos", label: "Conflitos" },
    { id: "execucao", label: "Execução" },
    { id: "linhas", label: "Linhas" },
  ] as const;

  const pivotSafety = useMemo(() => {
    const name = detail?.batch?.originalFilename?.toLowerCase() ?? "";
    return name === "pivot.xlsx" || name.endsWith("\\pivot.xlsx") || name.endsWith("/pivot.xlsx");
  }, [detail?.batch?.originalFilename]);

  const loadBatches = useCallback(async () => {
    const { data } = await api.get<ImportBatch[]>(
      `/financeiro/importacoes?tenantId=${encodeURIComponent(tenantId)}`,
    );
    setBatches(Array.isArray(data) ? data : []);
  }, [tenantId]);

  const loadDetail = useCallback(
    async (batchId: string) => {
      if (!batchId) return;
      const [d, r, bulk, dup, conf] = await Promise.all([
        api.get<{ batch: ImportBatch; mappings: MappingRow[]; readiness?: { readyForImport: boolean; blockingReasons: string[] } }>(
          `/financeiro/importacoes/${batchId}?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<{ items: StagingRow[] }>(
          `/financeiro/importacoes/${batchId}/linhas?tenantId=${encodeURIComponent(tenantId)}&pageSize=30${
            rowFilter ? `&validationStatus=${encodeURIComponent(rowFilter)}` : ""
          }`,
        ),
        api.get<BulkSection[]>(
          `/financeiro/importacoes/${batchId}/mapeamentos-bulk?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<DuplicateItem[]>(
          `/financeiro/importacoes/${batchId}/duplicidades?tenantId=${encodeURIComponent(tenantId)}`,
        ),
        api.get<ConflictItem[]>(
          `/financeiro/importacoes/${batchId}/conflitos?tenantId=${encodeURIComponent(tenantId)}`,
        ),
      ]);
      setDetail(d.data);
      setRows(Array.isArray(r.data?.items) ? r.data.items : []);
      setBulkSections(Array.isArray(bulk.data) ? bulk.data : []);
      setDuplicates(Array.isArray(dup.data) ? dup.data : []);
      setConflicts(Array.isArray(conf.data) ? (conf.data as ConflictItem[]) : []);
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
      setFeedback({ title: "Upload concluído", message: "Arquivo recebido." });
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

  async function approveBatch() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(`/financeiro/importacoes/${selectedId}/aprovar?tenantId=${encodeURIComponent(tenantId)}`);
      await loadDetail(selectedId);
      setFeedback({ title: "Lote aprovado", message: "Aprovação de revisão registrada." });
    } catch (e) {
      setFeedback({ title: "Aprovação bloqueada", message: e instanceof Error ? e.message : "Resolva pendências." });
    } finally {
      setLoading(false);
    }
  }

  async function approveExecution() {
    if (!selectedId) return;
    setLoading(true);
    try {
      await api.post(
        `/financeiro/importacoes/${selectedId}/aprovar-execucao?tenantId=${encodeURIComponent(tenantId)}`,
      );
      await loadDetail(selectedId);
      setFeedback({ title: "Execução autorizada", message: "Autorização de execução registrada (separada da aprovação)." });
    } catch (e) {
      setFeedback({ title: "Autorização bloqueada", message: e instanceof Error ? e.message : "Falha." });
    } finally {
      setLoading(false);
    }
  }

  async function patchMapping(updates: Array<Record<string, unknown>>) {
    if (!selectedId) return;
    await api.patch(`/financeiro/importacoes/${selectedId}/mapeamentos`, { tenantId, updates });
    await loadDetail(selectedId);
  }

  async function openAccountMapping(item: BulkSection["items"][0]) {
    setAccountPicker({ mappingId: item.id, sourceValue: item.sourceValue });
    setNewAccount((p) => ({ ...p, name: item.sourceValue }));
  }

  async function mapExistingAccount(accountId: string) {
    if (!accountPicker) return;
    await patchMapping([
      {
        id: accountPicker.mappingId,
        action: "map_existing",
        targetId: accountId,
        confirmed: true,
      },
    ]);
    setAccountPicker(null);
  }

  async function createAccountFromMapping() {
    if (!accountPicker || !newAccount.name.trim()) return;
    setLoading(true);
    try {
      const { data: created } = await api.post<{ id: string }>("/financeiro/contas", {
        tenantId,
        name: newAccount.name.trim(),
        accountType: newAccount.accountType,
        institution: newAccount.institution.trim() || null,
        currency: newAccount.currency,
        notes: newAccount.notes.trim() || `Criada na importação (${accountPicker.sourceValue})`,
        active: true,
      });
      await patchMapping([
        {
          id: accountPicker.mappingId,
          action: "map_existing",
          targetId: created.id,
          confirmed: true,
        },
      ]);
      setAccountPicker(null);
    } catch (e) {
      setFeedback({ title: "Erro ao criar conta", message: e instanceof Error ? e.message : "Falha." });
    } finally {
      setLoading(false);
    }
  }

  async function setDuplicateDecision(
    stagingRowId: string,
    duplicateDecision: "LINK_AND_SKIP" | "IMPORT_SEPARATELY" | "KEEP_FOR_REVIEW",
    linkLancamentoId?: string,
  ) {
    await api.patch(`/financeiro/importacoes/${selectedId}/duplicidades-decisoes`, {
      tenantId,
      updates: [{ stagingRowId, duplicateDecision, linkLancamentoId }],
    });
    await loadDetail(selectedId);
  }

  const batch = detail?.batch;
  const sim = (batch?.simulationSummary ?? null) as Record<string, number | Record<string, number>> | null;
  const control = sim?.controlTotals as Record<string, number | boolean> | undefined;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Importação histórica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
                Simular
              </Button>
              <Button type="button" size="sm" disabled={loading} onClick={() => void approveBatch()}>
                Aprovar revisão
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void approveExecution()}>
                Autorizar execução
              </Button>
            </div>
          ) : null}
          {batch?.simulationStale ? (
            <p className="text-xs text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Simulação desatualizada — simule novamente após mapeamentos.
            </p>
          ) : null}
          {pivotSafety ? (
            <p className="text-xs text-red-400">Execução canônica do pivot.xlsx bloqueada (trava de segurança).</p>
          ) : null}
        </CardContent>
      </Card>

      {batch ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {TAB_ITEMS.map((t) => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={activeTab === t.id ? "secondary" : "ghost"}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </Button>
            ))}
          </div>

          {activeTab === "resumo" ? (
            <Card>
              <CardContent className="grid gap-2 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <p>Total: {batch.totalRows}</p>
                <p>Válidas: {batch.validRows}</p>
                <p>Conflitos: {batch.conflictRows}</p>
                <p>Inválidas: {batch.invalidRows}</p>
                {detail?.readiness ? (
                  <p className="sm:col-span-2 text-xs text-muted-foreground">
                    Pronto p/ importar: {detail.readiness.readyForImport ? "Sim" : "Não"}
                    {detail.readiness.blockingReasons?.length
                      ? ` — ${detail.readiness.blockingReasons.join(", ")}`
                      : ""}
                  </p>
                ) : null}
                {sim ? (
                  <>
                    <p>Obrigações: {Number(sim.obligationsWouldCreate ?? 0)}</p>
                    <p>Baixas: {Number(sim.settlementsWouldCreate ?? 0)}</p>
                    <p>Débitos diretos: {Number(sim.directDebitsWouldCreate ?? 0)}</p>
                    <p>Transferências: {Number(sim.transfersWouldCreate ?? 0)}</p>
                    <p>Vinculados: {Number(sim.linkedExisting ?? 0)}</p>
                    <p>Excluídos: {Number(sim.excludedRows ?? 0)}</p>
                  </>
                ) : null}
                {control ? (
                  <div className="sm:col-span-2 lg:col-span-4 text-xs border border-zinc-800 rounded-md p-2 space-y-1">
                    <p className="font-medium">Totais de controle (fonte)</p>
                    <p>Original: {Number(control.sourceOriginalTotal ?? 0).toLocaleString("pt-BR")}</p>
                    <p>Juros: {Number(control.sourceInterestTotal ?? 0).toLocaleString("pt-BR")}</p>
                    <p>Multa: {Number(control.sourcePenaltyTotal ?? 0).toLocaleString("pt-BR")}</p>
                    <p>Pago: {Number(control.sourcePaidTotal ?? 0).toLocaleString("pt-BR")}</p>
                    {control.mismatch ? (
                      <p className="text-amber-400">Divergência material nos totais de controle.</p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "mapeamentos" ? (
            <>
            {bulkSections.map((section) => (
              <Card key={section.mappingKind} className="mb-3">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {MAPPING_KIND_LABEL[section.mappingKind] ?? section.mappingKind}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto pb-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Valor fonte</TableHead>
                        <TableHead>Linhas</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.sourceValue}</TableCell>
                          <TableCell>{item.affectedRows}</TableCell>
                          <TableCell>
                            {item.financialTotal != null
                              ? item.financialTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                              : "—"}
                          </TableCell>
                          <TableCell>{item.status}</TableCell>
                          <TableCell>
                            {section.mappingKind === "finance_account" ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => void openAccountMapping(item)}>
                                Mapear conta
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={item.status === "resolved"}
                                onClick={() =>
                                  void patchMapping([
                                    { id: item.id, action: "review_required", confirmed: false },
                                  ])
                                }
                              >
                                Revisar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
            </>
          ) : null}

          {activeTab === "duplicidades" ? (
            <Card>
              <CardContent className="pt-4 space-y-3">
                {duplicates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma duplicidade pendente.</p>
                ) : (
                  duplicates.map((d) => (
                    <div key={d.stagingRowId} className="border border-zinc-800 rounded-md p-3 text-sm space-y-2">
                      <p className="text-xs text-muted-foreground">{d.flagReason}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <p className="font-medium text-xs mb-1">Planilha</p>
                          <p>Linha {String(d.source.row ?? "—")}</p>
                          <p>{String(d.source.counterparty ?? "—")}</p>
                          <p>{String(d.source.amount ?? "—")}</p>
                        </div>
                        <div>
                          <p className="font-medium text-xs mb-1">CUP360</p>
                          {d.existing ? (
                            <>
                              <p>ID {String(d.existing.recordId ?? "—")}</p>
                              <p>{String(d.existing.counterparty ?? "—")}</p>
                            </>
                          ) : (
                            <p>—</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            void setDuplicateDecision(
                              d.stagingRowId,
                              "LINK_AND_SKIP",
                              d.existing ? String(d.existing.recordId) : undefined,
                            )
                          }
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Vincular e pular
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void setDuplicateDecision(d.stagingRowId, "IMPORT_SEPARATELY")}
                        >
                          Importar separado
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => void setDuplicateDecision(d.stagingRowId, "KEEP_FOR_REVIEW")}
                        >
                          Manter em revisão
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "conflitos" ? (
            <Card>
              <CardContent className="pt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Linha</TableHead>
                      <TableHead>Códigos</TableHead>
                      <TableHead>Decisão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conflicts.map((c) => (
                      <TableRow key={c.stagingRowId}>
                        <TableCell>{c.sourceRowNumber}</TableCell>
                        <TableCell>{c.codes.join(", ")}</TableCell>
                        <TableCell>{c.rowDecision ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "execucao" ? (
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <p>Aprovação revisão: {batch.status === "APPROVED" ? "Sim" : "Não"}</p>
                <p>Autorização execução: {batch.executionApprovedAt ? "Sim" : "Não"}</p>
                <Button type="button" disabled className="w-full sm:w-auto">
                  Executar importação canônica
                </Button>
                <p className="text-xs text-muted-foreground">
                  {pivotSafety
                    ? "Desabilitado: trava pivot.xlsx ativa."
                    : "Desabilitado neste ambiente até liberação controlada."}
                </p>
                {batch.executionResult ? (
                  <pre className="text-xs bg-zinc-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(batch.executionResult, null, 2)}
                  </pre>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {activeTab === "linhas" ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-base">Preview</CardTitle>
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
                          <TableCell>{String(n.accountLabel ?? "—")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <Dialog open={Boolean(accountPicker)} onOpenChange={() => setAccountPicker(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mapear conta financeira</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">Fonte: {accountPicker?.sourceValue}</p>
            <AccountMapper tenantId={tenantId} onSelect={(id) => void mapExistingAccount(id)} />
            <div className="border-t border-zinc-800 pt-3 space-y-2">
              <p className="text-xs text-muted-foreground">Criar conta (deliberado)</p>
              <Input
                value={newAccount.name}
                onChange={(e) => setNewAccount((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome"
                className="text-foreground"
              />
              <NativeSelect
                value={newAccount.accountType}
                onChange={(e) => setNewAccount((p) => ({ ...p, accountType: e.target.value }))}
                className="w-full"
              >
                <option value="BANK">Banco</option>
                <option value="CASH">Caixa</option>
                <option value="CREDIT_CARD">Cartão</option>
                <option value="OTHER">Outro</option>
              </NativeSelect>
              <Input
                value={newAccount.institution}
                onChange={(e) => setNewAccount((p) => ({ ...p, institution: e.target.value }))}
                placeholder="Instituição"
                className="text-foreground"
              />
              <Button type="button" disabled={loading} onClick={() => void createAccountFromMapping()}>
                Criar e mapear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={Boolean(feedback)}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}

function AccountMapper({ tenantId, onSelect }: { tenantId: string; onSelect: (id: string) => void }) {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    void api
      .get<Array<{ id: string; name: string }>>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`)
      .then((r) => setAccounts(Array.isArray(r.data) ? r.data : []));
  }, [tenantId]);
  return (
    <NativeSelectField
      value=""
      onChange={(e) => {
        if (e.target.value) onSelect(e.target.value);
      }}
      placeholder="Selecionar conta existente…"
      options={accounts.map((a) => ({ value: a.id, label: a.name }))}
    />
  );
}
