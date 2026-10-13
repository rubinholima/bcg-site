"use client";

import { formatDateDayMonYear } from "@/lib/format-date";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Loader2, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VenuePipelineLead } from "@/types/boston-city-hall";
import {
  LEAD_SOURCE_LABEL,
  PIPELINE_STAGES,
  PIPELINE_STAGE_CHART_COLOR,
  PIPELINE_STAGE_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchInlineError } from "@/components/dashboard/boston-city-hall/BchInlineError";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BostonCityHallLeadDetailDialog } from "./BostonCityHallLeadDetailDialog";
import {
  buildPipelineListQuery,
  emptyLead,
  isPreferredDateSoon,
  isStaleLead,
  leadToDetailForm,
  type DetailForm,
  type LeadForm,
} from "./boston-city-hall-lead-shared";

function formatPreferred(iso: string | null): string {
  if (!iso) return "";
  return formatDateDayMonYear(iso);
}

function formatUpdatedShort(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BostonCityHallPipeline() {
  const [leads, setLeads] = useState<VenuePipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [commercialFilter, setCommercialFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("");

  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyLead);
  const [savingCreate, setSavingCreate] = useState(false);

  const [selected, setSelected] = useState<VenuePipelineLead | null>(null);
  const [detailForm, setDetailForm] = useState<DetailForm | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [dragLeadId, setDragLeadId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const qs = buildPipelineListQuery({
        sourceFilter,
        commercialFilter,
        periodFilter,
        searchDebounced,
        sort: "updatedDesc",
        eventTypeFilter,
      });
      const res = await api.get<VenuePipelineLead[]>(
        `/boston-city-hall/pipeline${qs ? `?${qs}` : ""}`,
      );
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setLeads([]);
      setLoadError(e instanceof Error ? e.message : "Não foi possível carregar o pipeline.");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, commercialFilter, periodFilter, searchDebounced, eventTypeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const byStage = useMemo(() => {
    const map = new Map<string, VenuePipelineLead[]>();
    for (const s of PIPELINE_STAGES) map.set(s, []);
    for (const l of leads) {
      const list = map.get(l.stage) ?? [];
      list.push(l);
      map.set(l.stage, list);
    }
    return map;
  }, [leads]);

  const openDetail = async (lead: VenuePipelineLead) => {
    setSelected(lead);
    setDetailForm(leadToDetailForm(lead));
    try {
      const res = await api.get<VenuePipelineLead>(`/boston-city-hall/pipeline/${lead.id}`);
      if (res.data) {
        setSelected(res.data);
        setDetailForm(leadToDetailForm(res.data));
      }
    } catch {
      /* mantém dados da lista */
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetailForm(null);
  };

  const patchLeadInList = (updated: VenuePipelineLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    if (selected?.id === updated.id) {
      setSelected(updated);
      setDetailForm(leadToDetailForm(updated));
    }
  };

  const moveStage = async (id: string, stage: string) => {
    setMovingId(id);
    try {
      const res = await api.patch<VenuePipelineLead>(`/boston-city-hall/pipeline/${id}`, {
        stage,
      });
      if (res.data) {
        patchLeadInList(res.data);
      } else {
        await load();
      }
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao mover",
        message: e instanceof Error ? e.message : "Não foi possível alterar o estágio.",
        variant: "error",
      });
    } finally {
      setMovingId(null);
    }
  };

  const saveDetail = async () => {
    if (!selected || !detailForm) return;
    if (!detailForm.contactName.trim() || !detailForm.contactEmail.trim()) {
      setFeedback({
        open: true,
        title: "Dados incompletos",
        message: "Nome e e-mail são obrigatórios.",
        variant: "error",
      });
      return;
    }
    setSavingDetail(true);
    try {
      const res = await api.patch<VenuePipelineLead>(`/boston-city-hall/pipeline/${selected.id}`, {
        contactName: detailForm.contactName.trim(),
        contactEmail: detailForm.contactEmail.trim(),
        contactPhone: detailForm.contactPhone.trim() || undefined,
        companyName: detailForm.companyName.trim() || undefined,
        eventType: detailForm.eventType.trim() || undefined,
        guestCount: detailForm.guestCount.trim()
          ? Number.parseInt(detailForm.guestCount, 10)
          : undefined,
        preferredDate: detailForm.preferredDate || undefined,
        stage: detailForm.stage,
        notes: detailForm.notes.trim() || undefined,
      });
      if (res.data) patchLeadInList(res.data);
      setFeedback({
        open: true,
        title: "Lead atualizado",
        message: "Alterações salvas com sucesso.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message: e instanceof Error ? e.message : "Não foi possível salvar o lead.",
        variant: "error",
      });
    } finally {
      setSavingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!form.contactName.trim() || !form.contactEmail.trim()) {
      setFeedback({
        open: true,
        title: "Dados incompletos",
        message: "Nome e e-mail são obrigatórios.",
        variant: "error",
      });
      return;
    }
    setSavingCreate(true);
    try {
      await api.post("/boston-city-hall/pipeline", {
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        companyName: form.companyName.trim() || undefined,
        eventType: form.eventType.trim() || undefined,
        guestCount: form.guestCount.trim() ? Number.parseInt(form.guestCount, 10) : undefined,
        preferredDate: form.preferredDate || undefined,
        message: form.message.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      setOpenCreate(false);
      setForm(emptyLead());
      await load();
      setFeedback({
        open: true,
        title: "Lead cadastrado",
        message: "O contato foi adicionado ao pipeline.",
        variant: "success",
      });
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao cadastrar",
        message: e instanceof Error ? e.message : "Não foi possível criar o lead.",
        variant: "error",
      });
    } finally {
      setSavingCreate(false);
    }
  };

  const handleDropOnStage = (stage: string) => {
    if (!dragLeadId) return;
    const lead = leads.find((l) => l.id === dragLeadId);
    setDragLeadId(null);
    if (!lead || lead.stage === stage) return;
    void moveStage(lead.id, stage);
  };

  return (
    <>
      <div className={cn(BCH_CARD, "space-y-4")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onClick={() => {
              setForm(emptyLead());
              setOpenCreate(true);
            }}
            className={cn("min-h-[44px] w-full sm:w-auto", BCH_BTN_PRIMARY)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo lead
          </Button>
        </div>
        {loadError ? <BchInlineError message={loadError} onRetry={() => void load()} /> : null}
        <BchFilterBar className="border-0 bg-transparent p-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center w-full">
            <div className="relative min-w-0 flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, e-mail, empresa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px] pl-9"
              />
            </div>
            <Input
              placeholder="Tipo de evento"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="min-h-[44px] w-full lg:w-[160px]"
            />
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
            <Select value={commercialFilter} onValueChange={setCommercialFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="open">Em aberto</SelectItem>
                <SelectItem value="won">Confirmados</SelectItem>
                <SelectItem value="lost">Perdidos</SelectItem>
                <SelectItem value="closed">Encerrados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[160px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                <SelectItem value="website">Site</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </BchFilterBar>

          {!loadError && loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !loadError && leads.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum lead com os filtros atuais. Ajuste a busca ou cadastre um novo contato.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {PIPELINE_STAGES.map((stage) => {
                const items = byStage.get(stage) ?? [];
                const accent = PIPELINE_STAGE_CHART_COLOR[stage] ?? "#71717a";
                return (
                  <div
                    key={stage}
                    className={cn(
                      "flex w-[min(100%,300px)] shrink-0 snap-start flex-col rounded-xl border border-border bg-muted/15",
                      dragLeadId && "ring-1 ring-violet-500/20",
                    )}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropOnStage(stage);
                    }}
                  >
                    <div
                      className="border-b border-border px-3 py-2.5"
                      style={{ borderTopWidth: 3, borderTopColor: accent, borderTopStyle: "solid" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">
                          {PIPELINE_STAGE_LABEL[stage]}
                        </p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-foreground">
                          {items.length}
                        </span>
                      </div>
                    </div>
                    <div className="flex max-h-[min(70vh,520px)] flex-col gap-2 overflow-y-auto p-2">
                      {items.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/80 px-2 py-6 text-center text-xs text-muted-foreground">
                          Arraste um card para cá ou avance leads nesta etapa.
                        </p>
                      ) : (
                        items.map((l) => {
                          const stale = isStaleLead(l);
                          const prefSoon = isPreferredDateSoon(l);
                          return (
                            <div
                              key={l.id}
                              draggable={movingId !== l.id}
                              onDragStart={() => setDragLeadId(l.id)}
                              onDragEnd={() => setDragLeadId(null)}
                              className={cn(
                                "rounded-lg border border-border bg-card p-2.5 shadow-sm transition-colors",
                                stale && "border-amber-500/35 bg-amber-500/[0.04]",
                                l.booking && "border-emerald-500/30",
                                movingId === l.id && "opacity-60",
                              )}
                            >
                              <button
                                type="button"
                                className="w-full text-left"
                                onClick={() => openDetail(l)}
                              >
                                <p className="text-sm font-medium leading-snug text-foreground">
                                  {l.contactName}
                                </p>
                                {l.companyName ? (
                                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {l.companyName}
                                  </p>
                                ) : null}
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {l.eventType ? (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      {l.eventType}
                                    </span>
                                  ) : null}
                                  {l.guestCount != null ? (
                                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                      {l.guestCount} conv.
                                    </span>
                                  ) : null}
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {LEAD_SOURCE_LABEL[l.source] ?? l.source}
                                  </span>
                                  {l.booking ? (
                                    <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-300">
                                      Reserva
                                    </span>
                                  ) : null}
                                  {prefSoon ? (
                                    <span className="inline-flex items-center gap-0.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-300">
                                      <Calendar className="h-2.5 w-2.5" />
                                      Data próxima
                                    </span>
                                  ) : null}
                                  {stale ? (
                                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
                                      Sem movimento
                                    </span>
                                  ) : null}
                                </div>
                                {l.preferredDate ? (
                                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                                    Pref.: {formatPreferred(l.preferredDate)}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-[10px] text-muted-foreground/80">
                                  Atualizado {formatUpdatedShort(l.updatedAt)}
                                </p>
                              </button>
                              <div
                                className="mt-2 border-t border-border/60 pt-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <NativeSelect
                                  className="h-8 text-xs"
                                  value={l.stage}
                                  disabled={movingId === l.id}
                                  onChange={(e) => void moveStage(l.id, e.target.value)}
                                  aria-label="Alterar estágio"
                                >
                                  {PIPELINE_STAGES.map((s) => (
                                    <option key={s} value={s}>
                                      {PIPELINE_STAGE_LABEL[s]}
                                    </option>
                                  ))}
                                </NativeSelect>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading && !loadError ? (
            <p className="text-xs text-muted-foreground">
              {leads.length} lead(s) · clique no card para editar · arraste entre colunas para
              mudar estágio
            </p>
          ) : null}
      </div>

      <BostonCityHallLeadDetailDialog
        open={!!selected && !!detailForm}
        onOpenChange={(o) => !o && closeDetail()}
        selected={selected}
        detailForm={detailForm}
        onDetailFormChange={setDetailForm}
        onSave={saveDetail}
        saving={savingDetail}
        context="pipeline"
        onCopyFeedback={(payload) =>
          setFeedback({ open: true, ...payload })
        }
      />

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pl-name">Nome *</Label>
                <Input
                  id="pl-name"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pl-email">E-mail *</Label>
                <Input
                  id="pl-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pl-phone">Telefone</Label>
                <Input
                  id="pl-phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pl-company">Empresa</Label>
                <Input
                  id="pl-company"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="pl-type">Tipo de evento</Label>
                <Input
                  id="pl-type"
                  value={form.eventType}
                  onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="pl-guests">Convidados</Label>
                <Input
                  id="pl-guests"
                  type="number"
                  value={form.guestCount}
                  onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pl-date">Data preferida</Label>
              <Input
                id="pl-date"
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={form.preferredDate}
                onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={savingCreate} className="min-h-[44px]">
              {savingCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
