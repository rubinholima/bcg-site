"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal, type FeedbackVariant } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import type { PlayerDisciplineOpeningDto } from "@/lib/futebol-relatorios.types";

type PlayerOption = { id: string; name: string };

type FormState = {
  id?: string;
  playerId: string;
  effectiveFrom: string;
  yellowAccum: string;
  suspensionRoundsLeft: string;
  source: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  playerId: "",
  effectiveFrom: "",
  yellowAccum: "0",
  suspensionRoundsLeft: "0",
  source: "manual",
  notes: "",
};

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "transfer", label: "Transferência" },
  { value: "cbf", label: "CBF / federação" },
  { value: "other", label: "Outro" },
];

type Props = {
  tenantId: string;
  competition: string;
  season: number;
  categoryHint?: string;
};

export function CartoesDisciplineOpeningPanel({
  tenantId,
  competition,
  season,
  categoryHint,
}: Props) {
  const [rows, setRows] = useState<PlayerDisciplineOpeningDto[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: FeedbackVariant;
  }>({ open: false, title: "", message: "", variant: "info" });

  const loadOpenings = useCallback(async () => {
    if (!tenantId || !competition.trim()) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        competition,
        season: String(season),
      });
      const { data } = await api.get<PlayerDisciplineOpeningDto[]>(
        `/futebol-relatorios/discipline-openings?${params.toString()}`,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível carregar os saldos de entrada.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, competition, season]);

  const loadPlayers = useCallback(async () => {
    if (!tenantId) return;
    try {
      const params = new URLSearchParams({ tenantId });
      if (categoryHint?.trim()) params.set("category", categoryHint.trim());
      const { data } = await api.get<Array<{ id: string; name: string }>>(
        `/cadastros/players?${params.toString()}`,
      );
      const list = Array.isArray(data) ? data : [];
      setPlayers(list.map((p) => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    } catch {
      setPlayers([]);
    }
  }, [tenantId, categoryHint]);

  useEffect(() => {
    void loadOpenings();
    void loadPlayers();
  }, [loadOpenings, loadPlayers]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: PlayerDisciplineOpeningDto) => {
    setForm({
      id: row.id,
      playerId: row.playerId,
      effectiveFrom: row.effectiveFrom,
      yellowAccum: String(row.yellowAccum),
      suspensionRoundsLeft: String(row.suspensionRoundsLeft),
      source: row.source || "manual",
      notes: row.notes ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.playerId || !form.effectiveFrom.trim()) {
      setFeedback({
        open: true,
        title: "Campos obrigatórios",
        message: "Informe atleta e data de vigência.",
        variant: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      await api.put("/futebol-relatorios/discipline-openings", {
        tenantId,
        playerId: form.playerId,
        competition,
        season,
        effectiveFrom: form.effectiveFrom.trim(),
        yellowAccum: Number(form.yellowAccum) || 0,
        suspensionRoundsLeft: Number(form.suspensionRoundsLeft) || 0,
        source: form.source,
        notes: form.notes.trim() || null,
      });
      setDialogOpen(false);
      await loadOpenings();
      setFeedback({
        open: true,
        title: "Salvo",
        message: "Saldo de entrada registrado.",
        variant: "success",
      });
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null;
      setFeedback({
        open: true,
        title: "Erro",
        message: detail ?? "Não foi possível salvar o saldo de entrada.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(
        `/futebol-relatorios/discipline-openings/${deleteId}?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setDeleteId(null);
      await loadOpenings();
      setFeedback({
        open: true,
        title: "Removido",
        message: "Saldo de entrada excluído.",
        variant: "success",
      });
    } catch {
      setFeedback({
        open: true,
        title: "Erro",
        message: "Não foi possível excluir o saldo de entrada.",
        variant: "error",
      });
    }
  };

  if (!tenantId || !competition.trim()) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Saldo de entrada na competição</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum saldo cadastrado para esta competição.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Atleta</th>
                    <th className="py-2 pr-2 font-medium">Vigência</th>
                    <th className="py-2 pr-2 font-medium">Amarelos</th>
                    <th className="py-2 pr-2 font-medium">Susp. rodadas</th>
                    <th className="py-2 pr-2 font-medium">Fonte</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60">
                      <td className="py-2 pr-2">{row.playerName}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">{row.effectiveFrom}</td>
                      <td className="py-2 pr-2">{row.yellowAccum}</td>
                      <td className="py-2 pr-2">{row.suspensionRoundsLeft}</td>
                      <td className="py-2 pr-2">{row.source}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <Button type="button" size="icon" variant="ghost" onClick={() => openEdit(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setDeleteId(row.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar saldo de entrada" : "Saldo de entrada"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Atleta</Label>
              <NativeSelectField
                value={form.playerId}
                onChange={(e) => setForm((f) => ({ ...f, playerId: e.target.value }))}
                placeholder="Selecione…"
                disabled={Boolean(form.id)}
                options={players.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Vigência (a partir de)</Label>
              <Input
                type="date"
                className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                value={form.effectiveFrom}
                onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amarelos acumulados</Label>
                <NativeSelect
                  value={form.yellowAccum}
                  onChange={(e) => setForm((f) => ({ ...f, yellowAccum: e.target.value }))}
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </NativeSelect>
              </div>
              <div className="space-y-1">
                <Label>Suspensão (rodadas)</Label>
                <NativeSelect
                  value={form.suspensionRoundsLeft}
                  onChange={(e) => setForm((f) => ({ ...f, suspensionRoundsLeft: e.target.value }))}
                >
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Fonte</Label>
              <NativeSelect
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input
                className="text-foreground"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir saldo de entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              O cálculo disciplinar voltará a considerar apenas os jogos oficiais importados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
