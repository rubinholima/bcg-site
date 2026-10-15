"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
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
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchMetricsStrip } from "@/components/dashboard/boston-city-hall/BchMetricsStrip";
import { BchModuleSubNav } from "@/components/dashboard/boston-city-hall/BchModuleSubNav";
import { BCH_COMMERCIAL_SUBNAV } from "@/components/dashboard/boston-city-hall/bch-subnav.config";
import { BCH_BTN_PRIMARY, BCH_CARD, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BostonCityHallLeadDetailDialog } from "./BostonCityHallLeadDetailDialog";
import {
  buildPipelineListQuery,
  emptyLead,
  formatDateTime,
  leadToDetailForm,
  STAGE_BADGE,
  type DetailForm,
  type LeadForm,
} from "./boston-city-hall-lead-shared";

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
      const qs = buildPipelineListQuery({
        stageFilter,
        sourceFilter,
        commercialFilter,
        periodFilter,
        searchDebounced,
        sort,
      });
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

  return (
    <>
    <BchDestinationPageShell
      title="Leads"
      breadcrumbs={[
        { href: BCH_BASE, label: "Boston City Hall" },
        { label: "Comercial" },
        { label: "Leads" },
      ]}
      subNav={<BchModuleSubNav items={BCH_COMMERCIAL_SUBNAV} ariaLabel="Comercial" />}
      actions={
        <Button
          onClick={() => {
            setForm(emptyLead());
            setOpenCreate(true);
          }}
          className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}
        >
          <Plus className="h-4 w-4" />
          Novo lead
        </Button>
      }
    >
      <BchMetricsStrip
        title="Funil (filtros atuais)"
        items={[
          { label: "Total", value: stats.total },
          { label: "Em aberto", value: stats.open, href: `${BCH_BASE}/pipeline` },
          { label: "Do site", value: stats.website },
          { label: "Confirmados", value: stats.won },
        ]}
      />

      <div className={cn(BCH_CARD, "space-y-4")}>
        <BchFilterBar className="border-0 bg-transparent p-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center w-full">
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
        </BchFilterBar>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <BchEmptyState
              message="Nenhum lead encontrado com os filtros atuais."
              action={
                <Button
                  type="button"
                  className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
                  onClick={() => {
                    setForm(emptyLead());
                    setOpenCreate(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar lead
                </Button>
              }
            />
          ) : (
            <div className={BCH_TABLE_WRAP}>
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
      </div>
    </BchDestinationPageShell>

      <BostonCityHallLeadDetailDialog
        open={!!selected && !!detailForm}
        onOpenChange={(o) => !o && closeDetail()}
        selected={selected}
        detailForm={detailForm}
        onDetailFormChange={setDetailForm}
        onSave={saveDetail}
        saving={savingDetail}
        context="crm"
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
