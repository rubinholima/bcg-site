"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import type { PlayerTrainingHistoryItem } from "@/lib/treinadores-types";
import { ExpandableSection } from "@/components/dashboard/players/ExpandableSection";

interface Props {
  playerId: string;
}

export function PlayerTrainingHistoryTab({ playerId }: Props) {
  const [rows, setRows] = useState<PlayerTrainingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    api
      .get<PlayerTrainingHistoryItem[]>(`/players/${playerId}/training-history`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ExpandableSection title="Treinos" description="Avaliações registradas pela comissão" defaultOpen>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum treino registrado para este atleta.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Disponível</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Plano</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const attachment = row.attachments[0];
                const fileUrl = attachment ? getPublicImageUrl(attachment.fileUrl) || attachment.fileUrl : "";
                const time =
                  row.startTime && row.endTime
                    ? `${row.startTime} – ${row.endTime}`
                    : row.startTime || row.endTime || "—";
                return (
                  <TableRow key={`${row.sessionId}-${row.sessionDate}`}>
                    <TableCell>{formatDateDayMonYear(new Date(`${row.sessionDate}T12:00:00`))}</TableCell>
                    <TableCell className="whitespace-nowrap">{time}</TableCell>
                    <TableCell>{row.available ? "Sim" : "Não"}</TableCell>
                    <TableCell>{row.available && row.rating != null ? row.rating : "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate" title={row.notes ?? undefined}>
                      {row.available ? row.notes || "—" : row.unavailableReason || "—"}
                    </TableCell>
                    <TableCell>
                      {fileUrl ? (
                        <Link
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Abrir
                        </Link>
                      ) : row.planTemplateTitle ? (
                        <span className="text-xs text-muted-foreground">{row.planTemplateTitle}</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </ExpandableSection>
  );
}
