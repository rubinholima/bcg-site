"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import type { VenuePipelineLead } from "@/types/boston-city-hall";
import { PIPELINE_STAGES, PIPELINE_STAGE_LABEL } from "@/types/boston-city-hall";

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function BostonCityHallPipeline() {
  const [leads, setLeads] = useState<VenuePipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadForm>(emptyLead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

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

  const handleCreate = async () => {
    if (!form.contactName.trim() || !form.contactEmail.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    setSaving(true);
    setError(null);
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
      setOpen(false);
      setForm(emptyLead());
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar lead");
    } finally {
      setSaving(false);
    }
  };

  const moveStage = async (id: string, stage: string) => {
    setMovingId(id);
    try {
      await api.patch(`/boston-city-hall/pipeline/${id}`, { stage });
      await load();
    } finally {
      setMovingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <CardTitle className="text-lg">Pipeline comercial</CardTitle>
          <Button onClick={() => { setForm(emptyLead()); setError(null); setOpen(true); }} className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Novo lead
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {PIPELINE_STAGES.map((stage) => {
                const items = byStage.get(stage) ?? [];
                return (
                  <div
                    key={stage}
                    className="flex w-[min(100%,280px)] shrink-0 flex-col rounded-xl border border-border bg-muted/20"
                  >
                    <div className="border-b border-border px-3 py-2">
                      <p className="text-sm font-semibold">{PIPELINE_STAGE_LABEL[stage]}</p>
                      <p className="text-xs text-muted-foreground">{items.length} item(ns)</p>
                    </div>
                    <div className="flex max-h-[480px] flex-col gap-2 overflow-y-auto p-2">
                      {items.length === 0 ? (
                        <p className="px-1 py-4 text-center text-xs text-muted-foreground">Vazio</p>
                      ) : (
                        items.map((l) => (
                          <div key={l.id} className="rounded-lg border border-border bg-card p-2.5">
                            <p className="text-sm font-medium leading-tight">
                              {l.companyName || l.contactName}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{l.contactEmail}</p>
                            {l.preferredDate ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Data: {formatDate(l.preferredDate)}
                              </p>
                            ) : null}
                            {l.guestCount != null ? (
                              <p className="text-xs text-muted-foreground">{l.guestCount} convidados</p>
                            ) : null}
                            {l.source === "website" ? (
                              <span className="mt-1 inline-block rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-300">
                                Site
                              </span>
                            ) : null}
                            <Select
                              value={l.stage}
                              onValueChange={(v) => moveStage(l.id, v)}
                              disabled={movingId === l.id}
                            >
                              <SelectTrigger className="mt-2 h-8 text-xs">
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
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="l-name">Nome *</Label>
                <Input id="l-name" value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-email">E-mail *</Label>
                <Input id="l-email" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="l-phone">Telefone</Label>
                <Input id="l-phone" value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-company">Empresa</Label>
                <Input id="l-company" value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="l-type">Tipo de evento</Label>
                <Input id="l-type" value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="l-guests">Convidados</Label>
                <Input id="l-guests" type="number" value={form.guestCount} onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="l-date">Data preferida</Label>
              <Input
                id="l-date"
                type="date"
                className="text-foreground"
                value={form.preferredDate}
                onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="l-msg">Mensagem</Label>
              <Input id="l-msg" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
