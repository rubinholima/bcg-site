"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { cadastroEmail, cadastroUpper, formatRequesterDisplay } from "@/lib/cadastro-format";
import { useAuth } from "@/context/AuthContext";
import { NativeSelect } from "@/components/ui/native-select";
import { Tenant } from "@/types/tenant";
import {
  PurchaseRequisitionWorkflowRow,
  REQUISITION_STATUS_LABELS,
  statusBadgeClass,
  type PurchaseSettingsRow,
} from "@/lib/purchase-workflow-types";
import { type SupplierRow } from "@/app/dashboard/adm/compras/components/SupplierFormDialog";

export type WorkflowMode = "compras" | "requester" | "financeiro" | "diretoria";

interface PurchaseRequisitionWorkflowPanelProps {
  mode: WorkflowMode;
  tenants: Tenant[];
  suppliers?: SupplierRow[];
  assetCategories?: Array<{ id: string; name: string }>;
  defaultTenantId?: string;
  requestType?: "compra" | "ti";
  listTitle?: string;
  newButtonLabel?: string;
  formTitle?: string;
}

const selectClass =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function RequesterCell({ name, email }: { name: string; email?: string | null }) {
  const { name: displayName, email: displayEmail } = formatRequesterDisplay(name, email);
  return (
    <div className="min-w-0">
      <p className="font-medium truncate">{displayName}</p>
      {displayEmail ? (
        <p className="text-xs text-muted-foreground lowercase truncate">{displayEmail}</p>
      ) : (
        <p className="text-xs text-muted-foreground italic">E-mail não informado</p>
      )}
    </div>
  );
}

export function PurchaseRequisitionWorkflowPanel({
  mode,
  tenants,
  suppliers = [],
  assetCategories = [],
  defaultTenantId,
  requestType = "compra",
  listTitle,
  newButtonLabel = "Nova requisição",
  formTitle = "Nova requisição de compra",
}: PurchaseRequisitionWorkflowPanelProps) {
  const { user } = useAuth();
  const requesterPreview = formatRequesterDisplay(
    user?.name ?? user?.username ?? "",
    user?.email ?? "",
  );
  const [rows, setRows] = useState<PurchaseRequisitionWorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState(defaultTenantId ?? "");
  const [selected, setSelected] = useState<PurchaseRequisitionWorkflowRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [settings, setSettings] = useState<PurchaseSettingsRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Nova requisição (requester)
  const [formOpen, setFormOpen] = useState(false);
  const [formTenantId, setFormTenantId] = useState("");
  const [formJustification, setFormJustification] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formItems, setFormItems] = useState([{ description: "", quantity: 1, unit: "un" }]);
  const [formPatrimonial, setFormPatrimonial] = useState(false);

  // Cotação
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteSupplierId, setQuoteSupplierId] = useState("");
  const [quoteSupplierName, setQuoteSupplierName] = useState("");
  const [quoteTotal, setQuoteTotal] = useState("");
  const [quoteDelivery, setQuoteDelivery] = useState("");

  // Recebimento
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [receiveBy, setReceiveBy] = useState("");
  const [assetCategoryId, setAssetCategoryId] = useState("");
  const [receiveLocation, setReceiveLocation] = useState("");

  // Assinatura
  const [signEmail, setSignEmail] = useState("");
  const [statusDraft, setStatusDraft] = useState("rascunho");
  const [statusReason, setStatusReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantFilter) params.set("tenantId", tenantFilter);
      let url = "/compras/workflow/requisitions";
      if (mode === "requester") url = "/requisicoes/mine";
      if (mode === "financeiro") url = "/compras/workflow/approvals/pending?role=financeiro";
      if (mode === "diretoria") url = "/compras/workflow/approvals/pending?role=diretoria";
      if (tenantFilter && mode !== "requester") params.set("tenantId", tenantFilter);
      if (requestType && mode !== "requester") params.set("requestType", requestType);
      const qs = params.toString();
      const { data } = await api.get<PurchaseRequisitionWorkflowRow[]>(qs ? `${url}${url.includes("?") ? "&" : "?"}${qs}` : url);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode, tenantFilter, requestType]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tenantFilter || mode === "requester") return;
    api
      .get<PurchaseSettingsRow>(`/compras/workflow/settings?tenantId=${encodeURIComponent(tenantFilter)}`)
      .then(({ data }) => setSettings(data))
      .catch(() => setSettings(null));
  }, [tenantFilter, mode]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const { data } = await api.get<PurchaseRequisitionWorkflowRow>(`/compras/workflow/requisitions/${id}`);
      setSelected(data);
      setSignEmail(cadastroEmail(data.requesterEmail));
      setStatusDraft(data.status);
      setStatusReason("");
    } catch {
      alert("Erro ao carregar requisição");
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    await openDetail(selected.id);
    await load();
  };

  const handleCreate = async (submitAfterSave = false) => {
    if (!formTenantId || !formItems.some((i) => i.description.trim())) return;
    setActionLoading(true);
    try {
      const { data } = await api.post<{ id: string }>("/requisicoes", {
        tenantId: formTenantId,
        requestType,
        departmentName: formDepartment ? cadastroUpper(formDepartment) : undefined,
        justification: formJustification || undefined,
        isPatrimonial: formPatrimonial,
        items: formItems.filter((i) => i.description.trim()).map((i) => ({
          description: cadastroUpper(i.description),
          quantity: i.quantity,
          unit: cadastroUpper(i.unit) || "UN",
          isPatrimonial: formPatrimonial,
        })),
      });
      if (submitAfterSave && data?.id) {
        await api.post(`/compras/workflow/requisitions/${data.id}/submit`);
      }
      setFormOpen(false);
      await load();
      if (submitAfterSave) {
        alert("Requisição enviada para a equipe de Compras.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusUpdate = async (forcedStatus?: string) => {
    if (!selected) return;
    const nextStatus = forcedStatus ?? statusDraft;
    if (nextStatus === "reprovada" && !statusReason.trim()) {
      alert("Informe o motivo da reprovação.");
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/compras/workflow/requisitions/${selected.id}/status`, {
        status: nextStatus,
        reason: statusReason.trim() || undefined,
      });
      await refreshSelected();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar status");
    } finally {
      setActionLoading(false);
    }
  };

  const runAction = async (path: string, body?: object) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.post(`/compras/workflow/requisitions/${selected.id}/${path}`, body ?? {});
      await refreshSelected();
      if (path === "submit" && mode === "requester") {
        alert(
          "Requisição enviada. A equipe de Compras foi notificada por e-mail (se configurado em Configurações → Requisições).",
        );
      } else if (path === "submit-for-approval" && mode === "compras") {
        alert(
          "Enviada para aprovação. O Financeiro foi notificado por e-mail (se configurado em Configurações → Requisições).",
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro na operação");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddQuote = async () => {
    if (!selected || !quoteSupplierName.trim() || !quoteTotal) return;
    setActionLoading(true);
    try {
      const items = (selected.items as Array<{ description: string; quantity: number; unit?: string }>) ?? [];
      await api.post(`/compras/workflow/requisitions/${selected.id}/quotes`, {
        supplierId: quoteSupplierId || undefined,
        supplierName: quoteSupplierName.trim(),
        totalAmount: parseFloat(quoteTotal),
        deliveryDays: quoteDelivery ? parseInt(quoteDelivery, 10) : undefined,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit: i.unit ?? "un",
          unitPrice: parseFloat(quoteTotal) / Math.max(items.length, 1),
        })),
      });
      setQuoteOpen(false);
      setQuoteSupplierId("");
      setQuoteSupplierName("");
      setQuoteTotal("");
      await refreshSelected();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao adicionar cotação");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    if (!selected || !receiveBy.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/compras/workflow/requisitions/${selected.id}/receive`, {
        receivedByName: receiveBy.trim(),
        assetCategoryId: selected.isPatrimonial ? assetCategoryId : undefined,
        location: receiveLocation || undefined,
      });
      setReceiveOpen(false);
      await refreshSelected();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro no recebimento");
    } finally {
      setActionLoading(false);
    }
  };

  const titleByMode: Record<WorkflowMode, string> = {
    compras: "Fila de requisições",
    requester: listTitle ?? (requestType === "ti" ? "Requisições de equipamento TI" : "Requisições de compra"),
    financeiro: "Aprovações pendentes — Financeiro",
    diretoria: "Aprovações pendentes — Diretoria",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">{titleByMode[mode]}</CardTitle>
          <div className="flex flex-wrap gap-2">
            {mode === "requester" && (
              <Button type="button" size="sm" onClick={() => {
                setFormTenantId(tenants[0]?.id ?? "");
                setFormOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                {newButtonLabel}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode !== "requester" && (
            <div className="flex flex-wrap gap-3 items-end">
              <div className="min-w-[200px]">
                <Label className="text-xs text-muted-foreground">Clube / Empresa</Label>
                <select
                  className={selectClass}
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {mode === "compras" && settings && (
                <p className="text-xs text-muted-foreground pb-2">
                  Limite diretoria: R$ {settings.approvalThresholdBrl?.toLocaleString("pt-BR")} · Cotações: {settings.minQuotes}–{settings.maxQuotes}
                </p>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma requisição encontrada.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openDetail(r.id)}
                    >
                      <TableCell>
                        <RequesterCell name={r.requestedByName} email={r.requesterEmail} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.tenant?.name}</TableCell>
                      <TableCell className="uppercase text-xs">{r.requestType}</TableCell>
                      <TableCell>
                        <span className={statusBadgeClass(r.status)}>
                          {REQUISITION_STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(r.approvedTotal ?? r.totalEstimated)?.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {formatDateDayMonYear(r.requestedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="w-[min(42rem,calc(100vw-1.5rem))] max-h-[90vh]">
          {detailLoading || !selected ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto my-8" />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Requisição — {formatRequesterDisplay(selected.requestedByName, selected.requesterEmail).name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.tenant.name} · {REQUISITION_STATUS_LABELS[selected.status] ?? selected.status}
                </p>
                <p className="text-sm pt-1">
                  <span className="text-muted-foreground">Solicitante:</span>{" "}
                  {formatRequesterDisplay(selected.requestedByName, selected.requesterEmail).name}
                  {selected.requesterEmail ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="lowercase text-muted-foreground">
                        {formatRequesterDisplay(selected.requestedByName, selected.requesterEmail).email}
                      </span>
                    </>
                  ) : null}
                </p>
              </DialogHeader>

              <div className="space-y-4 py-2 text-sm">
                {selected.justification && (
                  <p><span className="text-muted-foreground">Justificativa:</span> {selected.justification}</p>
                )}
                <div className="rounded border p-3 space-y-1">
                  <p className="font-medium">Itens</p>
                  {(selected.items as Array<{ description: string; quantity: number; unit?: string }>)?.map((it, i) => (
                    <p key={i}>• {it.description} — {it.quantity} {it.unit ?? "un"}</p>
                  ))}
                </div>

                {selected.quotes && selected.quotes.length > 0 && (
                  <div className="rounded border p-3 space-y-2">
                    <p className="font-medium">Cotações ({selected.quotes.length})</p>
                    {selected.quotes.map((q) => (
                      <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-0">
                        <span>{q.supplierName} — {q.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        <div className="flex gap-1">
                          {q.isWinner && <span className="text-xs text-green-600 font-medium">Vencedora</span>}
                          {mode === "compras" && selected.status === "em_cotacao" && !q.isWinner && (
                            <Button type="button" size="sm" variant="outline" disabled={actionLoading} onClick={() => runAction(`quotes/${q.id}/select`)}>
                              Escolher
                            </Button>
                          )}
                          {mode === "compras" && selected.status === "em_cotacao" && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              disabled={actionLoading}
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!confirm("Remover cotação?")) return;
                                setActionLoading(true);
                                try {
                                  await api.delete(`/compras/workflow/requisitions/${selected.id}/quotes/${q.id}`);
                                  await refreshSelected();
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : "Erro");
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selected.approvals && selected.approvals.length > 0 && (
                  <div className="rounded border p-3 space-y-1">
                    <p className="font-medium">Histórico de aprovações</p>
                    {selected.approvals.map((a) => (
                      <p key={a.id} className="text-muted-foreground">
                        {a.approverName} ({a.role}) — {a.decision === "approved" ? "Aprovou" : "Reprovou"}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {mode === "compras" && (
                  <div className="w-full space-y-3 rounded-lg border border-border/70 p-3 sm:col-span-2">
                    <p className="text-sm font-medium">Status da requisição</p>
                    <NativeSelect
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      disabled={actionLoading}
                    >
                      {Object.entries(REQUISITION_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </NativeSelect>
                    {statusDraft === "reprovada" ? (
                      <Input
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="Motivo da reprovação"
                        disabled={actionLoading}
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionLoading || statusDraft === selected.status}
                        onClick={() => void handleStatusUpdate()}
                      >
                        Atualizar status
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => void handleStatusUpdate("aprovada")}
                      >
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={actionLoading}
                        onClick={() => {
                          const reason = prompt("Motivo da reprovação:");
                          if (!reason?.trim()) return;
                          setStatusReason(reason.trim());
                          void (async () => {
                            setActionLoading(true);
                            try {
                              await api.patch(`/compras/workflow/requisitions/${selected.id}/status`, {
                                status: "reprovada",
                                reason: reason.trim(),
                              });
                              await refreshSelected();
                            } catch (err) {
                              alert(err instanceof Error ? err.message : "Erro ao reprovar");
                            } finally {
                              setActionLoading(false);
                            }
                          })();
                        }}
                      >
                        Reprovar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={actionLoading}
                        onClick={() => void handleStatusUpdate("em_compra")}
                      >
                        Marcar em compra
                      </Button>
                    </div>
                  </div>
                )}
                {mode === "requester" && selected.status === "rascunho" && (
                  <Button type="button" disabled={actionLoading} onClick={() => runAction("submit")}>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar para Compras
                  </Button>
                )}
                {mode === "compras" && selected.status === "rascunho" && (
                  <Button type="button" disabled={actionLoading} onClick={() => void handleStatusUpdate("enviada")}>
                    <Send className="h-4 w-4 mr-1" />
                    Receber na fila
                  </Button>
                )}
                {mode === "compras" && selected.status === "enviada" && (
                  <Button type="button" disabled={actionLoading} onClick={() => runAction("start-quotation")}>
                    Iniciar cotação
                  </Button>
                )}
                {mode === "compras" && selected.status === "em_cotacao" && (
                  <>
                    <Button type="button" variant="outline" onClick={() => setQuoteOpen(true)}>Adicionar cotação</Button>
                    <Button type="button" disabled={actionLoading} onClick={() => runAction("submit-for-approval")}>
                      Enviar para aprovação
                    </Button>
                  </>
                )}
                {(mode === "financeiro" || mode === "diretoria") && (
                  <>
                    <Button type="button" disabled={actionLoading} onClick={() => runAction("approve", { role: mode === "diretoria" ? "diretoria" : "financeiro" })}>
                      <Check className="h-4 w-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button type="button" variant="destructive" disabled={actionLoading} onClick={() => {
                      const reason = prompt("Motivo da reprovação:");
                      if (reason) runAction("reject", { role: mode === "diretoria" ? "diretoria" : "financeiro", reason });
                    }}>
                      <X className="h-4 w-4 mr-1" />
                      Reprovar
                    </Button>
                  </>
                )}
                {mode === "compras" && selected.status === "aprovada" && (
                  <Button type="button" disabled={actionLoading} onClick={() => runAction("create-order")}>
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Gerar ordem de compra
                  </Button>
                )}
                {mode === "compras" && selected.status === "em_compra" && (
                  <Button type="button" onClick={() => setReceiveOpen(true)}>Registrar recebimento</Button>
                )}
                {mode === "compras" && selected.status === "recebida_compras" && (
                  <>
                    <div className="w-full grid gap-2 sm:col-span-2">
                      <Label className="text-left">E-mail do solicitante (assinatura)</Label>
                      <Input type="email" value={signEmail} onChange={(e) => setSignEmail(e.target.value)} />
                    </div>
                    <Button type="button" disabled={actionLoading || !signEmail.trim()} onClick={() => runAction("send-receipt-signature", { signerEmail: cadastroEmail(signEmail), signerName: selected.requestedByName })}>
                      Enviar termo para assinatura
                    </Button>
                  </>
                )}
                {(mode === "compras" || mode === "requester") && selected.status === "aguardando_assinatura" && (
                  <Button type="button" variant="outline" disabled={actionLoading} onClick={() => runAction("sync-receipt")}>
                    Verificar assinatura
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader><DialogTitle>{formTitle}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {mode === "requester" && user && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <p className="text-xs text-muted-foreground">Solicitante (usuário logado)</p>
                <p className="font-medium">{requesterPreview.name}</p>
                <p className="text-muted-foreground lowercase">{requesterPreview.email || "—"}</p>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Clube / Empresa *</Label>
              <select className={selectClass} value={formTenantId} onChange={(e) => setFormTenantId(e.target.value)}>
                <option value="">Selecione</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Departamento / Área</Label>
              <Input
                value={formDepartment}
                onChange={(e) => setFormDepartment(cadastroUpper(e.target.value))}
                className="uppercase"
              />
            </div>
            <div className="grid gap-2">
              <Label>Justificativa</Label>
              <textarea className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formJustification} onChange={(e) => setFormJustification(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={formPatrimonial} onChange={(e) => setFormPatrimonial(e.target.checked)} />
              Bem patrimonial (cadastro no Patrimônio após recebimento)
            </label>
            {formItems.map((item, idx) => (
              <div key={idx} className="grid gap-2 border rounded p-2">
                <Input placeholder="Descrição do material" value={item.description} onChange={(e) => {
                  const next = [...formItems];
                  next[idx] = { ...next[idx], description: cadastroUpper(e.target.value) };
                  setFormItems(next);
                }} className="uppercase" />
                <div className="flex gap-2">
                  <Input type="number" min={1} className="w-24" value={item.quantity} onChange={(e) => {
                    const next = [...formItems];
                    next[idx] = { ...next[idx], quantity: parseInt(e.target.value, 10) || 1 };
                    setFormItems(next);
                  }} />
                  <Input className="w-20" value={item.unit} onChange={(e) => {
                    const next = [...formItems];
                    next[idx] = { ...next[idx], unit: e.target.value };
                    setFormItems(next);
                  }} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setFormItems([...formItems, { description: "", quantity: 1, unit: "un" }])}>+ Item</Button>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="button" variant="outline" disabled={actionLoading} onClick={() => void handleCreate(false)}>
              Salvar rascunho
            </Button>
            <Button type="button" disabled={actionLoading} onClick={() => void handleCreate(true)}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enviar para Compras
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader><DialogTitle>Nova cotação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Fornecedor cadastrado</Label>
              <select className={selectClass} value={quoteSupplierId} onChange={(e) => {
                setQuoteSupplierId(e.target.value);
                const s = suppliers.find((x) => x.id === e.target.value);
                if (s) setQuoteSupplierName(s.name);
              }}>
                <option value="">— ou nome manual —</option>
                {suppliers.filter((s) => !tenantFilter || s.tenant?.id === tenantFilter).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Nome do fornecedor *</Label>
              <Input value={quoteSupplierName} onChange={(e) => setQuoteSupplierName(e.target.value)} className="uppercase" />
            </div>
            <div className="grid gap-2">
              <Label>Valor total (R$) *</Label>
              <Input type="number" step="0.01" value={quoteTotal} onChange={(e) => setQuoteTotal(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Prazo entrega (dias)</Label>
              <Input type="number" value={quoteDelivery} onChange={(e) => setQuoteDelivery(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setQuoteOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={actionLoading} onClick={handleAddQuote}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-h-[90vh]">
          <DialogHeader><DialogTitle>Recebimento no Compras</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Recebido por *</Label>
              <Input value={receiveBy} onChange={(e) => setReceiveBy(e.target.value)} className="uppercase" />
            </div>
            {selected?.isPatrimonial && (
              <>
                <div className="grid gap-2">
                  <Label>Categoria patrimonial *</Label>
                  <select className={selectClass} value={assetCategoryId} onChange={(e) => setAssetCategoryId(e.target.value)}>
                    <option value="">Selecione</option>
                    {assetCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Local / setor</Label>
                  <Input value={receiveLocation} onChange={(e) => setReceiveLocation(e.target.value)} className="uppercase" />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceiveOpen(false)}>Cancelar</Button>
            <Button type="button" disabled={actionLoading} onClick={handleReceive}>Confirmar recebimento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
