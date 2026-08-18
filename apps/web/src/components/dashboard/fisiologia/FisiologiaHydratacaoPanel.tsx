"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  DashboardDeptSection,
  DashboardFieldLabel,
  DashboardFilterBox,
} from "@/components/dashboard/DashboardDeptHeader";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import {
  computeHydrationStatus,
  HYDRATION_STATUS_LABELS,
} from "@/lib/fisiologia-calculations";
import { HYDRATION_CONTEXTS, type PhysiologyHydrationRow } from "@/lib/fisiologia-types";

type Tenant = {
  id: string;
  name: string;
  categories?: string[] | null;
  kind?: { name?: string };
};

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
}

function parseNum(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function FisiologiaHydratacaoPanel() {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [rows, setRows] = useState<PhysiologyHydrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [contextType, setContextType] = useState("treino");
  const [weightBefore, setWeightBefore] = useState("");
  const [weightAfter, setWeightAfter] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = (Array.isArray(data) ? data : []).filter((t) =>
        isFootballKind(t.kind?.name ?? ""),
      );
      setTenants(list);
      if (list.length === 1) setTenantId(list[0]!.id);
    });
  }, []);

  const loadPlayers = useCallback(async () => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    try {
      const { data } = await api.get<PlayerOption[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`);
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    }
  }, [tenantId]);

  const load = useCallback(async () => {
    if (!tenantId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (playerFilter) params.set("playerId", playerFilter);
      const { data } = await api.get<PhysiologyHydrationRow[]>(`/fisiologia/hydrations?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, playerFilter]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    load();
  }, [load]);

  const hydrationStatus = useMemo(
    () => computeHydrationStatus(parseNum(weightBefore), parseNum(weightAfter)),
    [weightBefore, weightAfter],
  );

  const resetForm = () => {
    setPlayerId(playerFilter || "");
    setRecordedAt(new Date().toISOString().slice(0, 10));
    setContextType("treino");
    setWeightBefore("");
    setWeightAfter("");
    setNotes("");
  };

  const handleCreate = async () => {
    if (!playerId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione o atleta." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/fisiologia/hydrations", {
        playerId,
        recordedAt,
        contextType,
        weightBefore: parseNum(weightBefore) ?? undefined,
        weightAfter: parseNum(weightAfter) ?? undefined,
        status: hydrationStatus ?? undefined,
        notes: notes.trim() || undefined,
      });
      setDialogOpen(false);
      resetForm();
      await load();
      setFeedback({ open: true, title: "Salvo", message: "Registro de hidratação cadastrado." });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/fisiologia/hydrations/${deleteId}`);
      setDeleteId(null);
      await load();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível excluir.",
      });
    }
  };

  return (
    <>
      <DashboardFilterBox accent="sky" className="sm:grid-cols-2">
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Clube</DashboardFieldLabel>
          <NativeSelect value={tenantId} onChange={(e) => { setTenantId(e.target.value); setPlayerFilter(""); }}>
            <option value="">Selecione…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Atleta</DashboardFieldLabel>
          <NativeSelectField
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            placeholder="Todos"
            disabled={!tenantId}
            options={players.map((p) => ({
              value: p.id,
              label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}${p.category ? ` · ${getCategoryLabel(p.category, "pt", allCats)}` : ""}`,
            }))}
          />
        </div>
      </DashboardFilterBox>

      <DashboardDeptSection
        title="Hidratação"
        aside={
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            disabled={!tenantId}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo registro
          </Button>
        }
      >
        {!tenantId ? (
          <p className="text-sm text-muted-foreground py-4">Selecione um clube.</p>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atleta</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Contexto</TableHead>
                  <TableHead>Antes (kg)</TableHead>
                  <TableHead>Depois (kg)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Nenhum registro no filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.player?.name ?? "—"}</TableCell>
                      <TableCell>{formatDateDayMonYear(new Date(row.recordedAt))}</TableCell>
                      <TableCell>{row.contextType === "jogo" ? "Jogo" : "Treino"}</TableCell>
                      <TableCell>{row.weightBefore ?? "—"}</TableCell>
                      <TableCell>{row.weightAfter ?? "—"}</TableCell>
                      <TableCell>
                        {row.status ? HYDRATION_STATUS_LABELS[row.status] ?? row.status : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {row.player?.id ? (
                            <Button type="button" variant="ghost" size="sm" asChild>
                              <Link href={`/dashboard/cadastros/jogadores/${row.player.id}/edit?tab=fisiologia`}>
                                Ficha
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardDeptSection>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo registro de hidratação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-1">
              <Label>Atleta</Label>
              <NativeSelectField
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Selecione…"
                options={players.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}`,
                }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={recordedAt}
                  onChange={(e) => setRecordedAt(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Contexto</Label>
                <NativeSelect value={contextType} onChange={(e) => setContextType(e.target.value)}>
                  {HYDRATION_CONTEXTS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Peso antes (kg)</Label>
                <Input className="text-foreground" inputMode="decimal" value={weightBefore} onChange={(e) => setWeightBefore(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Peso depois (kg)</Label>
                <Input className="text-foreground" inputMode="decimal" value={weightAfter} onChange={(e) => setWeightAfter(e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm">
              <span className="text-xs text-muted-foreground">Status calculado</span>
              <p className="font-medium">
                {hydrationStatus ? HYDRATION_STATUS_LABELS[hydrationStatus] : "—"}
              </p>
            </div>
            <div className="grid gap-1">
              <Label>Notas</Label>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
