"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Pencil, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlayerNegotiationEditorDialog } from "@/components/dashboard/players/PlayerNegotiationEditorDialog";
import {
  formatNegotiationMoney,
  NEGOTIATION_STATUS_LABELS,
  NEGOTIATION_TYPE_LABELS,
} from "@/lib/player-negotiation-labels";
import type { PlayerNegotiationFull } from "@/lib/player-negotiation-types";

interface PlayerNegotiationsPanelProps {
  playerId: string;
  tenantId: string;
}

export function PlayerNegotiationsPanel({ playerId, tenantId }: PlayerNegotiationsPanelProps) {
  const [rows, setRows] = useState<PlayerNegotiationFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editorId, setEditorId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PlayerNegotiationFull[]>(
        `/player-negotiations/by-player/${playerId}`,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar negociações.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando…
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {rows.length === 0
            ? "Nenhuma negociação registrada para este atleta."
            : `${rows.length} negociação(ões) — histórico completo preservado.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="min-h-[44px]"
            onClick={() => {
              setEditorMode("create");
              setEditorId(null);
              setEditorOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova
          </Button>
          <Link href="/dashboard/cadastros/jogadores/negociados">
            <Button variant="outline" size="sm" className="min-h-[44px]">
              <ExternalLink className="mr-2 h-4 w-4" />
              Atletas negociados
            </Button>
          </Link>
        </div>
      </div>

      {rows.length > 0 && (
        <Card className="overflow-hidden border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico de negociações</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contraparte</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-sm">
                      {NEGOTIATION_TYPE_LABELS[n.negotiationType] ?? n.negotiationType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {NEGOTIATION_STATUS_LABELS[n.status] ?? n.status}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm sm:max-w-none">
                      {n.counterpartyName}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatNegotiationMoney(n.totalValue, n.currency)}
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">
                      {n.negotiatedAt ? n.negotiatedAt.slice(0, 10) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px]"
                        aria-label="Gerenciar"
                        onClick={() => {
                          setEditorMode("edit");
                          setEditorId(n.id);
                          setEditorOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <PlayerNegotiationEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        tenantId={tenantId}
        mode={editorMode}
        negotiationId={editorId}
        initialPlayerId={playerId}
        onSaved={() => void load()}
      />
    </div>
  );
}
