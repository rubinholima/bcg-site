"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  PhysiologyAssessmentFormDialog,
  type PhysiologyPlayerOption,
} from "@/components/dashboard/fisiologia/PhysiologyAssessmentFormDialog";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { filterCategoriesForTenant, getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";
import { isFootballKind } from "@/lib/home-data";
import { COMPOSITION_STATUS_LABELS } from "@/lib/fisiologia-calculations";
import {
  assessmentTypeLabel,
  type PhysiologyAssessmentRow,
} from "@/lib/fisiologia-types";

type Tenant = {
  id: string;
  name: string;
  categories?: string[] | null;
  kind?: { name?: string };
};

export function FisiologiaAvaliacoesPanel() {
  const { categories: allCats } = useFixtureCategories();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [players, setPlayers] = useState<PhysiologyPlayerOption[]>([]);
  const [rows, setRows] = useState<PhysiologyAssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<PhysiologyAssessmentRow | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.id === tenantId) ?? null,
    [tenants, tenantId],
  );

  const categoriesForClub = filterCategoriesForTenant(allCats, selectedTenant?.categories);

  const loadPlayers = useCallback(async () => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    try {
      const { data } = await api.get<PhysiologyPlayerOption[]>(
        `/players?tenantId=${encodeURIComponent(tenantId)}`,
      );
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
      if (category) params.set("category", category);
      if (playerId) params.set("playerId", playerId);
      const { data } = await api.get<PhysiologyAssessmentRow[]>(`/fisiologia/assessments?${params}`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, playerId]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPlayers = useMemo(() => {
    if (!category) return players;
    return players.filter((p) => p.category === category);
  }, [players, category]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/fisiologia/assessments/${deleteId}`);
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

  const playerOptionsForForm = category
    ? filteredPlayers
    : players;

  return (
    <>
      <DashboardFilterBox accent="sky" className="sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Clube</DashboardFieldLabel>
          <NativeSelect value={tenantId} onChange={(e) => { setTenantId(e.target.value); setCategory(""); setPlayerId(""); }}>
            <option value="">Selecione…</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <DashboardFieldLabel accent="sky">Categoria</DashboardFieldLabel>
          <NativeSelect value={category} onChange={(e) => { setCategory(e.target.value); setPlayerId(""); }} disabled={!tenantId}>
            <option value="">Todas</option>
            {categoriesForClub.map((c) => (
              <option key={c.value} value={c.value}>
                {getCategoryLabel(c.value, "pt", allCats)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <DashboardFieldLabel accent="sky">Atleta</DashboardFieldLabel>
          <NativeSelectField
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="Todos"
            disabled={!tenantId}
            options={filteredPlayers.map((p) => ({
              value: p.id,
              label: `${p.name}${p.jerseyNumber != null ? ` #${p.jerseyNumber}` : ""}`,
            }))}
          />
        </div>
      </DashboardFilterBox>

      <DashboardDeptSection
        title="Avaliações"
        aside={
          <Button
            onClick={() => { setEditRow(null); setDialogOpen(true); }}
            disabled={!tenantId}
            className="min-h-[44px]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova avaliação
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>IMC</TableHead>
                  <TableHead>% Gordura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground">
                      Nenhuma avaliação no filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.player?.name ?? "—"}
                        {row.player?.jerseyNumber != null ? ` #${row.player.jerseyNumber}` : ""}
                      </TableCell>
                      <TableCell>{formatDateDayMonYear(new Date(row.assessedAt))}</TableCell>
                      <TableCell>{assessmentTypeLabel(row.assessmentType)}</TableCell>
                      <TableCell>{row.bmi ?? "—"}</TableCell>
                      <TableCell>{row.bodyFatPercent != null ? `${row.bodyFatPercent}%` : "—"}</TableCell>
                      <TableCell>
                        {row.compositionStatus
                          ? COMPOSITION_STATUS_LABELS[row.compositionStatus] ?? row.compositionStatus
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditRow(row); setDialogOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
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

      <PhysiologyAssessmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        players={playerOptionsForForm}
        edit={editRow}
        onSuccess={load}
        defaultPlayerId={playerId || undefined}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação</AlertDialogTitle>
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
