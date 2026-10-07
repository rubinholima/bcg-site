"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  Copy,
  ExternalLink,
  Kanban,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { VenuePipelineLead } from "@/types/boston-city-hall";
import {
  LEAD_SOURCE_LABEL,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

const BCH = "/dashboard/eventos/boston-city-hall";

type LeadForm = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  eventType: string;
  guestCount: string;
  preferredDate: string;
  message: string;
  notes: string;
};

type DetailForm = LeadForm & { stage: string };

const emptyLead = (): LeadForm => ({
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  companyName: "",
  eventType: "",
  guestCount: "",
  preferredDate: "",
  message: "",
  notes: "",
});

function leadToDetailForm(lead: VenuePipelineLead): DetailForm {
  return {
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone ?? "",
    companyName: lead.companyName ?? "",
    eventType: lead.eventType ?? "",
    guestCount: lead.guestCount != null ? String(lead.guestCount) : "",
    preferredDate: lead.preferredDate?.slice(0, 10) ?? "",
    message: lead.message ?? "",
    notes: lead.notes ?? "",
    stage: lead.stage,
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodToDates(period: string): { createdFrom?: string; createdTo?: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (period === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { createdFrom: iso(from) };
  }
  if (period === "30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { createdFrom: iso(from) };
  }
  if (period === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { createdFrom: iso(from), createdTo: iso(now) };
  }
  return {};
}

const STAGE_BADGE: Record<string, string> = {
  lead: "bg-violet-500/15 text-violet-300",
  analise: "bg-sky-500/15 text-sky-300",
  proposta: "bg-amber-500/15 text-amber-300",
  contrato: "bg-emerald-500/15 text-emerald-300",
  confirmado: "bg-green-600/20 text-green-300",
  perdido: "bg-zinc-500/20 text-zinc-400",
};

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function BostonCityHallCrm() {
  const [leads, setLeads] = useState<VenuePipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [commercialFilter, setCommercialFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("updatedDesc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<VenuePipelineLead | null>(null);
  const [detailForm, setDetailForm] = useState<DetailForm | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyLead);
  const [savingCreate, setSavingCreate] = useState(false);
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
    try {
      const params = new URLSearchParams();
      if (stageFilter !== "all") params.set("stage", stageFilter);
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      if (commercialFilter !== "all") params.set("commercialStatus", commercialFilter);
      if (searchDebounced) params.set("q", searchDebounced);
      if (sort) params.set("sort", sort);
      const period = periodToDates(periodFilter);
      if (period.createdFrom) params.set("createdFrom", period.createdFrom);
      if (period.createdTo) params.set("createdTo", period.createdTo);
      const qs = params.toString();
      const res = await api.get<VenuePipelineLead[]>(
        `/boston-city-hall/pipeline${qs ? `?${qs}` : ""}`,
      );
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, sourceFilter, commercialFilter, periodFilter, searchDebounced, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => !["confirmado", "perdido"].includes(l.stage)).length;
    const website = leads.filter((l) => l.source === "website").length;
    const won = leads.filter((l) => l.stage === "confirmado").length;
    return { total: leads.length, open, website, won };
  }, [leads]);

  const openDetail = async (lead: VenuePipelineLead) => {
    setSelectedId(lead.id);
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
    setSelectedId(null);
    setSelected(null);
    setDetailForm(null);
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
      if (res.data) {
        setSelected(res.data);
        setDetailForm(leadToDetailForm(res.data));
      }
      await load();
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
        message: "O contato foi adicionado ao CRM.",
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

  const reservationHref = selected?.booking?.id
    ? `${BCH}/reservas?edit=${encodeURIComponent(selected.booking.id)}`
    : `${BCH}/reservas`;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total (filtros)</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Em aberto</p>
            <p className="text-2xl font-bold">{stats.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Do site</p>
            <p className="text-2xl font-bold">{stats.website}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Confirmados</p>
            <p className="text-2xl font-bold">{stats.won}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">CRM — Leads</CardTitle>
          <Button
            onClick={() => {
              setForm(emptyLead());
              setOpenCreate(true);
            }}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo lead
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, e-mail, empresa, telefone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-[44px] pl-9"
              />
            </div>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[200px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updatedDesc">Última atualização ↓</SelectItem>
                <SelectItem value="updatedAsc">Última atualização ↑</SelectItem>
                <SelectItem value="createdDesc">Mais recentes</SelectItem>
                <SelectItem value="createdAsc">Mais antigos</SelectItem>
              </SelectContent>
            </Select>
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
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="min-h-[44px] w-full lg:w-[180px]">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos estágios</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PIPELINE_STAGE_LABEL[s]}
                  </SelectItem>
                ))}
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

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lead encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead className="hidden md:table-cell">Empresa</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead className="hidden sm:table-cell">Origem</TableHead>
                    <TableHead className="hidden xl:table-cell">Criado</TableHead>
                    <TableHead className="hidden lg:table-cell">Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((l) => (
                    <TableRow
                      key={l.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/40",
                        selectedId === l.id && "bg-muted/30",
                      )}
                      onClick={() => openDetail(l)}
                    >
                      <TableCell>
                        <p className="font-medium">{l.contactName}</p>
                        <p className="text-xs text-muted-foreground">{l.contactEmail}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{l.companyName || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {l.contactPhone || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                            STAGE_BADGE[l.stage] ?? "bg-muted text-muted-foreground",
                          )}
                        >
                          {PIPELINE_STAGE_LABEL[l.stage] ?? l.stage}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {LEAD_SOURCE_LABEL[l.source] ?? l.source}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {formatDateTime(l.createdAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {formatDateTime(l.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {leads.length} lead(s) — clique na linha para ver e editar o contato.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selected && !!detailForm} onOpenChange={(o) => !o && closeDetail()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && detailForm ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailForm.companyName || detailForm.contactName}</DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
                  <Link href={`${BCH}/pipeline`}>
                    <Kanban className="h-4 w-4" />
                    Pipeline
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="min-h-[40px] gap-1" asChild>
                  <Link href={reservationHref}>
                    <CalendarPlus className="h-4 w-4" />
                    {selected.booking ? "Ver reserva" : "Reservas"}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] gap-1"
                  onClick={async () => {
                    const ok = await copyText(detailForm.contactEmail);
                    setFeedback({
                      open: true,
                      title: ok ? "E-mail copiado" : "Não foi possível copiar",
                      message: detailForm.contactEmail,
                      variant: ok ? "success" : "error",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                  E-mail
                </Button>
                {detailForm.contactPhone ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-[40px] gap-1"
                    onClick={async () => {
                      const ok = await copyText(detailForm.contactPhone);
                      setFeedback({
                        open: true,
                        title: ok ? "Telefone copiado" : "Não foi possível copiar",
                        message: detailForm.contactPhone,
                        variant: ok ? "success" : "error",
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Telefone
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="crm-d-name">Nome *</Label>
                  <Input
                    id="crm-d-name"
                    value={detailForm.contactName}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, contactName: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-d-email">E-mail *</Label>
                  <Input
                    id="crm-d-email"
                    type="email"
                    value={detailForm.contactEmail}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, contactEmail: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-d-phone">Telefone</Label>
                  <Input
                    id="crm-d-phone"
                    value={detailForm.contactPhone}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, contactPhone: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="crm-d-company">Empresa</Label>
                  <Input
                    id="crm-d-company"
                    value={detailForm.companyName}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, companyName: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-d-event">Tipo de evento</Label>
                  <Input
                    id="crm-d-event"
                    value={detailForm.eventType}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, eventType: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-d-guests">Convidados</Label>
                  <Input
                    id="crm-d-guests"
                    inputMode="numeric"
                    value={detailForm.guestCount}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, guestCount: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-d-pref">Data preferida</Label>
                  <Input
                    id="crm-d-pref"
                    type="date"
                    className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                    value={detailForm.preferredDate}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, preferredDate: e.target.value } : f))
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-d-stage">Estágio</Label>
                  <NativeSelect
                    id="crm-d-stage"
                    value={detailForm.stage}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, stage: e.target.value } : f))
                    }
                  >
                    {PIPELINE_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {PIPELINE_STAGE_LABEL[s]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label>Origem</Label>
                  <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                    {LEAD_SOURCE_LABEL[selected.source] ?? selected.source}
                  </p>
                </div>
                {selected.message ? (
                  <div className="grid gap-1.5 sm:col-span-2">
                    <Label>Mensagem original</Label>
                    <p className="rounded-md border border-border bg-muted/20 p-3 text-sm text-foreground">
                      {selected.message}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-1.5 sm:col-span-2">
                  <Label htmlFor="crm-d-notes">Anotações comerciais</Label>
                  <textarea
                    id="crm-d-notes"
                    rows={4}
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={detailForm.notes}
                    onChange={(e) =>
                      setDetailForm((f) => (f ? { ...f, notes: e.target.value } : f))
                    }
                  />
                </div>
                <p className="sm:col-span-2 text-xs text-muted-foreground">
                  Criado em {formatDateTime(selected.createdAt)} · Atualizado em{" "}
                  {formatDateTime(selected.updatedAt)}
                  {selected.booking ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link
                        href={reservationHref}
                        className="inline-flex items-center gap-0.5 text-violet-300 hover:underline"
                      >
                        Reserva vinculada
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={closeDetail} className="min-h-[44px]">
                  Fechar
                </Button>
                <Button onClick={saveDetail} disabled={savingDetail} className="min-h-[44px]">
                  {savingDetail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="crm-name">Nome *</Label>
                <Input
                  id="crm-name"
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crm-email">E-mail *</Label>
                <Input
                  id="crm-email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="crm-phone">Telefone</Label>
                <Input
                  id="crm-phone"
                  value={form.contactPhone}
                  onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="crm-company">Empresa</Label>
                <Input
                  id="crm-company"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="crm-notes-new">Anotações</Label>
              <Input
                id="crm-notes-new"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
