"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { NutritionAnamnesisForm } from "@/components/dashboard/nutricao/NutritionAnamnesisForm";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  emptyNutritionAnamnesis,
  nutritionAnamnesisLabel,
  type NutritionAnamnesisData,
} from "@/lib/nutricao-anamnesis";
import { printNutritionAnamnesis } from "@/lib/nutricao-anamnesis-print";
import type { NutritionAnamnesisRow } from "@/lib/nutricao-types";

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
}

interface Props {
  tenantId: string;
  players: PlayerOption[];
  tenantName?: string;
}

export function NutritionAnamnesesListPanel({ tenantId, players, tenantName }: Props) {
  const [rows, setRows] = useState<NutritionAnamnesisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [assessedAt, setAssessedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<NutritionAnamnesisData>(emptyNutritionAnamnesis());
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const load = useCallback(async () => {
    if (!tenantId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: res } = await api.get<NutritionAnamnesisRow[]>(
        `/nutricao/nutrition-anamneses?tenantId=${encodeURIComponent(tenantId)}`,
      );
      setRows(Array.isArray(res) ? res : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!playerId) {
      setFeedback({ open: true, title: "Atenção", message: "Selecione o atleta." });
      return;
    }
    setSaving(true);
    try {
      await api.post("/nutricao/nutrition-anamneses", {
        playerId,
        assessedAt,
        data,
        notes: notes.trim() || undefined,
      });
      setDialogOpen(false);
      setPlayerId("");
      setData(emptyNutritionAnamnesis());
      setNotes("");
      await load();
      setFeedback({ open: true, title: "Salvo", message: "Anamnese cadastrada." });
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

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>;
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova anamnese
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atleta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Nenhuma anamnese cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.player?.name ?? "—"}
                      {row.player?.jerseyNumber != null ? ` #${row.player.jerseyNumber}` : ""}
                    </TableCell>
                    <TableCell>
                      {row.player?.category ? getCategoryLabel(row.player.category, "pt") : "—"}
                    </TableCell>
                    <TableCell>{formatDateDayMonYear(new Date(row.assessedAt))}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {nutritionAnamnesisLabel(row.data ?? {})}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => printNutritionAnamnesis(row, tenantName)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {row.player?.id ? (
                          <Button type="button" variant="ghost" size="sm" asChild>
                            <Link href={`/dashboard/cadastros/jogadores/${row.player.id}/edit?tab=nutricao`}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova anamnese nutricional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Atleta</Label>
                <NativeSelectField
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  placeholder="Selecione…"
                  options={players.map((p) => ({
                    value: p.id,
                    label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}${p.category ? ` · ${getCategoryLabel(p.category, "pt")}` : ""}`,
                  }))}
                />
              </div>
              <div className="grid gap-1">
                <Label>Data da consulta</Label>
                <Input
                  type="date"
                  className="text-foreground [&::-webkit-datetime-edit]:text-foreground"
                  value={assessedAt}
                  onChange={(e) => setAssessedAt(e.target.value)}
                />
              </div>
            </div>
            <NutritionAnamnesisForm value={data} onChange={setData} />
            <div className="grid gap-1">
              <Label>Notas adicionais</Label>
              <textarea
                className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
