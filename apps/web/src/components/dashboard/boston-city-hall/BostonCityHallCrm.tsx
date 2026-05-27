"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Phone, Plus, Search } from "lucide-react";
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

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STAGE_BADGE: Record<string, string> = {
  lead: "bg-violet-500/15 text-violet-300",
  analise: "bg-sky-500/15 text-sky-300",
  proposta: "bg-amber-500/15 text-amber-300",
  contrato: "bg-emerald-500/15 text-emerald-300",
  confirmado: "bg-green-600/20 text-green-300",
  perdido: "bg-zinc-500/20 text-zinc-400",
};

export function BostonCityHallCrm() {
  const [leads, setLeads] = useState<VenuePipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [selected, setSelected] = useState<VenuePipelineLead | null>(null);
  const [detailNotes, setDetailNotes] = useState("");
  const [detailStage, setDetailStage] = useState("");
  const [savingDetail, setSavingDetail] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyLead);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<VenuePipelineLead[]>("/boston-city-hall/pipeline");
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (stageFilter !== "all" && l.stage !== stageFilter) return false;
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      if (!q) return true;
      const hay = [
        l.contactName,
        l.contactEmail,
        l.contactPhone,
        l.companyName,
        l.eventType,
        l.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [leads, search, stageFilter, sourceFilter]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => !["confirmado", "perdido"].includes(l.stage)).length;
    const website = leads.filter((l) => l.source === "website").length;
    const won = leads.filter((l) => l.stage === "confirmado").length;
    return { total: leads.length, open, website, won };
  }, [leads]);

  const openDetail = (lead: VenuePipelineLead) => {
    setSelected(lead);
    setDetailNotes(lead.notes ?? "");
    setDetailStage(lead.stage);
  };

  const saveDetail = async () => {
    if (!selected) return;
    setSavingDetail(true);
    try {
      await api.patch(`/boston-city-hall/pipeline/${selected.id}`, {
        stage: detailStage,
        notes: detailNotes,
      });
      setSelected(null);
      await load();
    } finally {
      setSavingDetail(false);
    }
  };

  const handleCreate = async () => {
    if (!form.contactName.trim() || !form.contactEmail.trim()) {
      setCreateError("Nome e e-mail são obrigatórios.");
      return;
    }
    setSavingCreate(true);
    setCreateError(null);
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
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Erro ao criar lead");
    } finally {
      setSavingCreate(false);
    }
  };

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total de leads</p>
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
              setCreateError(null);
              setOpenCreate(true);
            }}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo lead
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nome, e-mail, empresa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 min-h-[44px]"
              />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-[180px]">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estágios</SelectItem>
                {PIPELINE_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PIPELINE_STAGE_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="min-h-[44px] w-full sm:w-[160px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                <SelectItem value="website">Site</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum lead encontrado com os filtros atuais.
            </p>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contato</TableHead>
                    <TableHead className="hidden md:table-cell">Empresa</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead className="hidden sm:table-cell">Origem</TableHead>
                    <TableHead className="hidden lg:table-cell">Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((l) => (
                    <TableRow
                      key={l.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => openDetail(l)}
                    >
                      <TableCell>
                        <p className="font-medium">{l.contactName}</p>
                        <p className="text-xs text-muted-foreground">{l.contactEmail}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {l.companyName || "—"}
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
            {filtered.length} de {leads.length} lead(s) — clique na linha para ver detalhes e anotações.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.companyName || selected.contactName}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {selected.contactEmail}
                  </span>
                  {selected.contactPhone ? (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      {selected.contactPhone}
                    </span>
                  ) : null}
                </div>
                {selected.eventType ? (
                  <p>
                    <span className="text-muted-foreground">Tipo: </span>
                    {selected.eventType}
                  </p>
                ) : null}
                {selected.guestCount != null ? (
                  <p>
                    <span className="text-muted-foreground">Convidados: </span>
                    {selected.guestCount}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted-foreground">Data preferida: </span>
                  {formatDate(selected.preferredDate)}
                </p>
                {selected.message ? (
                  <p className="rounded-lg border border-border bg-muted/30 p-2">{selected.message}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Criado em {formatDateTime(selected.createdAt)} · Origem{" "}
                  {LEAD_SOURCE_LABEL[selected.source] ?? selected.source}
                </p>
                <div className="grid gap-1.5">
                  <Label>Estágio</Label>
                  <Select value={detailStage} onValueChange={setDetailStage}>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PIPELINE_STAGE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="crm-notes">Anotações internas</Label>
                  <textarea
                    id="crm-notes"
                    rows={4}
                    className="flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={detailNotes}
                    onChange={(e) => setDetailNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>
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
            {createError ? <p className="text-sm text-destructive">{createError}</p> : null}
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
    </>
  );
}
