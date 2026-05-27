"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

type Modo = "receber" | "pagar";
type StatusTitulo = "pendente" | "pago" | "cancelado";

export interface FinanceiroLancamentoRow {
  id: string;
  tenantId: string;
  tipo: Modo;
  status: StatusTitulo;
  contraparte: string | null;
  supplierId: string | null;
  customerId: string | null;
  descricao: string;
  valor: number;
  dueDate: string;
  settledAt: string | null;
  categoria: string | null;
  referencia: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ResumoLancamentos {
  emAbertoValor: number;
  emAbertoCount: number;
  vencidosValor: number;
  vencidosCount: number;
  pagosNoMesValor: number;
  pagosNoMesCount: number;
}

function formatMoney(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function startOfTodayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function isVencido(row: FinanceiroLancamentoRow): boolean {
  if (row.status !== "pendente") return false;
  const due = new Date(row.dueDate);
  return due < startOfTodayLocal();
}

function statusLabel(s: StatusTitulo): string {
  switch (s) {
    case "pago":
      return "Pago / recebido";
    case "cancelado":
      return "Cancelado";
    default:
      return "Pendente";
  }
}

const emptyForm = {
  cadastroId: "",
  contraparte: "",
  descricao: "",
  valor: "",
  dueDate: "",
  settledAt: "",
  categoria: "",
  referencia: "",
  notas: "",
  status: "pendente" as StatusTitulo,
};

export interface FinanceiroLancamentosPanelProps {
  tenantId: string;
}

export function FinanceiroLancamentosPanel({ tenantId }: FinanceiroLancamentosPanelProps) {
  const [modo, setModo] = useState<Modo>("pagar");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [vencDe, setVencDe] = useState("");
  const [vencAte, setVencAte] = useState("");
  const [buscaInput, setBuscaInput] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  const [list, setList] = useState<FinanceiroLancamentoRow[]>([]);
  const [resumo, setResumo] = useState<ResumoLancamentos | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceiroLancamentoRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (!tenantId) return;
    api.get<Array<{ id: string; name: string }>>(`/compras/suppliers?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => setSuppliers([]));
    api.get<Array<{ id: string; name: string }>>(`/financeiro/customers?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => setCustomers([]));
  }, [tenantId]);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(buscaInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [buscaInput]);

  const queryString = useMemo(() => {
    if (!tenantId) return "";
    const p = new URLSearchParams({ tenantId, tipo: modo });
    if (statusFiltro && statusFiltro !== "todos") p.set("status", statusFiltro);
    if (vencDe) p.set("vencimentoDe", vencDe);
    if (vencAte) p.set("vencimentoAte", vencAte);
    if (buscaDebounced) p.set("busca", buscaDebounced);
    return p.toString();
  }, [tenantId, modo, statusFiltro, vencDe, vencAte, buscaDebounced]);

  const load = useCallback(async () => {
    if (!tenantId || !queryString) return;
    setLoading(true);
    setErr(null);
    try {
      const [rList, rResumo] = await Promise.all([
        api.get<FinanceiroLancamentoRow[]>(`/financeiro/lancamentos?${queryString}`),
        api.get<ResumoLancamentos>(`/financeiro/lancamentos/resumo?tenantId=${tenantId}&tipo=${modo}`),
      ]);
      setList(Array.isArray(rList.data) ? rList.data : []);
      setResumo(rResumo.data ?? null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao carregar lançamentos.");
      setList([]);
      setResumo(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, queryString, modo]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    setForm({ ...emptyForm, dueDate: iso, status: "pendente" });
    setDialogOpen(true);
  }

  function openEdit(row: FinanceiroLancamentoRow) {
    setEditing(row);
    setForm({
      cadastroId: row.supplierId ?? row.customerId ?? "",
      contraparte: row.contraparte ?? "",
      descricao: row.descricao,
      valor: String(row.valor),
      dueDate: toDateInput(row.dueDate),
      settledAt: row.settledAt ? toDateInput(row.settledAt) : "",
      categoria: row.categoria ?? "",
      referencia: row.referencia ?? "",
      notas: row.notas ?? "",
      status: row.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!tenantId) return;
    const valorNum = parseFloat(String(form.valor).replace(/\s/g, "").replace(",", "."));
    if (!form.descricao.trim() || Number.isNaN(valorNum) || valorNum < 0 || !form.dueDate) return;
    setSaving(true);
    try {
      const tipo = editing ? editing.tipo : modo;
      const cadastroPayload =
        modo === "pagar" || tipo === "pagar"
          ? { supplierId: form.cadastroId || undefined, customerId: undefined }
          : { customerId: form.cadastroId || undefined, supplierId: undefined };
      const base = {
        tipo,
        ...cadastroPayload,
        contraparte: form.cadastroId ? undefined : form.contraparte.trim() || undefined,
        descricao: form.descricao.trim(),
        valor: valorNum,
        dueDate: `${form.dueDate}T12:00:00.000Z`,
        status: form.status,
        settledAt:
          form.status === "pago" && form.settledAt.trim()
            ? `${form.settledAt.trim()}T12:00:00.000Z`
            : form.status === "pago"
              ? new Date().toISOString()
              : undefined,
        categoria: form.categoria.trim() || undefined,
        referencia: form.referencia.trim() || undefined,
        notas: form.notas.trim() || undefined,
      };
      if (editing) {
        await api.patch(`/financeiro/lancamentos/${editing.id}`, base);
      } else {
        await api.post("/financeiro/lancamentos", { tenantId, ...base });
      }
      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarcarPago(row: FinanceiroLancamentoRow) {
    if (!confirm("Confirmar baixa deste título como pago/recebido?")) return;
    try {
      await api.patch(`/financeiro/lancamentos/${row.id}`, { status: "pago" });
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao atualizar.");
    }
  }

  async function handleDelete(row: FinanceiroLancamentoRow) {
    if (!confirm("Excluir este lançamento? Esta ação não pode ser desfeita.")) return;
    try {
      await api.delete(`/financeiro/lancamentos/${row.id}`);
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erro ao excluir.");
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={modo === "pagar" ? "default" : "outline"} size="sm" onClick={() => setModo("pagar")}>
            Contas a pagar
          </Button>
          <Button type="button" variant={modo === "receber" ? "default" : "outline"} size="sm" onClick={() => setModo("receber")}>
            Contas a receber
          </Button>
        </div>
        <Button type="button" size="sm" className="gap-2 shrink-0" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo lançamento
        </Button>
      </div>

      {resumo && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
          <Card className="border-border/80">
            <CardHeader className="pb-2 pt-4 px-4">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Landmark className="h-3.5 w-3.5" />
                Em aberto
              </p>
              <CardTitle className="text-lg tabular-nums">{formatMoney(resumo.emAbertoValor)}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-xs text-muted-foreground">{resumo.emAbertoCount} título(s)</CardContent>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2 pt-4 px-4">
              <p className="text-xs font-medium text-muted-foreground">Vencidos (pendentes)</p>
              <CardTitle className="text-lg tabular-nums text-amber-700 dark:text-amber-400">
                {formatMoney(resumo.vencidosValor)}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-xs text-muted-foreground">{resumo.vencidosCount} título(s)</CardContent>
          </Card>
          <Card className="border-border/80 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2 pt-4 px-4">
              <p className="text-xs font-medium text-muted-foreground">Quitados no mês</p>
              <CardTitle className="text-lg tabular-nums">{formatMoney(resumo.pagosNoMesValor)}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-xs text-muted-foreground">{resumo.pagosNoMesCount} baixa(s)</CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="print:hidden">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
            <div className="space-y-2">
              <Label>Situação</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago / recebido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Vencimento (intervalo)</Label>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <Input type="date" className="text-foreground" value={vencDe} onChange={(e) => setVencDe(e.target.value)} />
                <span className="text-muted-foreground text-sm hidden sm:inline">até</span>
                <Input type="date" className="text-foreground" value={vencAte} onChange={(e) => setVencAte(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label>Busca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9 text-foreground"
                  placeholder="Texto livre…"
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2 py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </p>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground min-w-[100px]">Vencimento</TableHead>
                    <TableHead className="text-foreground min-w-[140px]">{modo === "pagar" ? "Fornecedor" : "Cliente"}</TableHead>
                    <TableHead className="text-foreground min-w-[160px]">Descrição</TableHead>
                    <TableHead className="text-foreground whitespace-nowrap">Valor</TableHead>
                    <TableHead className="text-foreground">Situação</TableHead>
                    <TableHead className="text-foreground whitespace-nowrap">Quitação</TableHead>
                    <TableHead className="text-foreground w-[140px] text-right print:hidden">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground text-sm py-10 text-center">
                        Nenhum lançamento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    list.map((row) => {
                      const venc = isVencido(row);
                      return (
                        <TableRow key={row.id} className={venc ? "bg-amber-500/5" : undefined}>
                          <TableCell className="whitespace-nowrap text-sm tabular-nums text-foreground">
                            {formatDateBR(row.dueDate)}
                            {venc && (
                              <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-400">Vencido</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-foreground max-w-[200px]">
                            <span className="line-clamp-2">{row.contraparte?.trim() || "—"}</span>
                          </TableCell>
                          <TableCell className="text-sm text-foreground max-w-[260px]">
                            <span className="line-clamp-2">{row.descricao}</span>
                            {(row.referencia || row.categoria) && (
                              <span className="block text-xs text-muted-foreground mt-0.5">
                                {[row.categoria, row.referencia].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm font-medium text-foreground">{formatMoney(row.valor)}</TableCell>
                          <TableCell className="text-sm text-foreground">{statusLabel(row.status)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {row.settledAt ? formatDateBR(row.settledAt) : "—"}
                          </TableCell>
                          <TableCell className="text-right print:hidden">
                            <div className="flex justify-end gap-1 flex-wrap">
                              {row.status === "pendente" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Marcar pago / recebido"
                                  onClick={() => void handleMarcarPago(row)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8" title="Editar" onClick={() => openEdit(row)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title="Excluir"
                                onClick={() => void handleDelete(row)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto text-foreground">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription className="sr-only">Lançamento</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fl-cadastro">
                {modo === "pagar" ? "Fornecedor cadastrado" : "Cliente cadastrado"}
              </Label>
              <select
                id="fl-cadastro"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={form.cadastroId}
                onChange={(e) => setForm((f) => ({ ...f, cadastroId: e.target.value, contraparte: "" }))}
              >
                <option value="">— Selecione ou use texto abaixo —</option>
                {(modo === "pagar" ? suppliers : customers).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Cadastre em{" "}
                <a
                  href={modo === "pagar" ? "/dashboard/adm/fornecedores" : "/dashboard/adm/clientes"}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {modo === "pagar" ? "Cadastros → Fornecedores" : "Cadastros → Clientes"}
                </a>
              </p>
            </div>
            {!form.cadastroId && (
              <div className="space-y-2">
                <Label htmlFor="fl-contraparte">{modo === "pagar" ? "Fornecedor / favorecido (texto)" : "Cliente / pagador (texto)"}</Label>
                <Input
                  id="fl-contraparte"
                  value={form.contraparte}
                  onChange={(e) => setForm((f) => ({ ...f, contraparte: e.target.value }))}
                  placeholder=""
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="fl-desc">Descrição *</Label>
              <Input
                id="fl-desc"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder=""
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fl-valor">Valor (R$) *</Label>
                <Input
                  id="fl-valor"
                  inputMode="decimal"
                  value={form.valor}
                  onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fl-venc">Vencimento *</Label>
                <Input
                  id="fl-venc"
                  type="date"
                  className="[&::-webkit-datetime-edit]:text-foreground"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Situação</Label>
              <select
                id="fl-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusTitulo }))}
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago / recebido</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            {form.status === "pago" && (
              <div className="space-y-2">
                <Label htmlFor="fl-quit">Data da quitação</Label>
                <Input
                  id="fl-quit"
                  type="date"
                  className="[&::-webkit-datetime-edit]:text-foreground"
                  value={form.settledAt}
                  onChange={(e) => setForm((f) => ({ ...f, settledAt: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fl-cat">Categoria</Label>
                <Input
                  id="fl-cat"
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  placeholder=""
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fl-ref">Referência</Label>
                <Input
                  id="fl-ref"
                  value={form.referencia}
                  onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
                  placeholder=""
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fl-notas">Observações</Label>
              <Textarea id="fl-notas" rows={3} value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={saving || !form.descricao.trim() || !form.dueDate}
              onClick={() => void handleSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
