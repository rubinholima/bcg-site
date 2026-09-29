"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

type GkPlayerHistory = {
  player: { id: string; name: string; category: string | null };
  training: Array<{
    session: {
      id: string;
      sessionDate: string;
      category: string | null;
      attachments: Array<{ fileUrl: string; label?: string | null }>;
    };
    playerCategoryAtEntry: string | null;
    crossCategory: boolean;
    rating: number | null;
    notes: string | null;
    available: boolean;
  }>;
  analyses: Array<{
    analysis: {
      id: string;
      matchDate: string | null;
      opponentName: string | null;
      highlightsVideoUrl: string | null;
      attachments: Array<{ fileUrl: string }>;
    };
    playerCategoryAtEntry: string | null;
  }>;
};

interface Props {
  playerId: string;
}

export function PlayerGoalkeeperHistoryTab({ playerId }: Props) {
  const [data, setData] = useState<GkPlayerHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    api
      .get<GkPlayerHistory>(`/players/${playerId}/goalkeeper-history`)
      .then(({ data: res }) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || (data.training.length === 0 && data.analyses.length === 0)) {
    return <p className="text-sm text-muted-foreground">Nenhum histórico de goleiro registrado.</p>;
  }

  return (
    <div className="space-y-6">
      {data.training.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-medium">Treinos específicos</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Categoria treino</TableHead>
                <TableHead>Categoria na época</TableHead>
                <TableHead>Cross</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead>Keeper Scout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.training.map((row) => {
                const cross =
                  row.crossCategory && row.playerCategoryAtEntry && row.session.category
                    ? `${row.playerCategoryAtEntry} · treinou com ${row.session.category}`
                    : "—";
                return (
                  <TableRow key={row.session.id}>
                    <TableCell>
                      {formatDateDayMonYear(new Date(`${row.session.sessionDate}T12:00:00`))}
                    </TableCell>
                    <TableCell>{row.session.category ?? "—"}</TableCell>
                    <TableCell>{row.playerCategoryAtEntry ?? data.player.category ?? "—"}</TableCell>
                    <TableCell>{cross}</TableCell>
                    <TableCell>{row.rating ?? "—"}</TableCell>
                    <TableCell>
                      {row.session.attachments[0] ? (
                        <a
                          href={getPublicImageUrl(row.session.attachments[0].fileUrl) || row.session.attachments[0].fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          PDF
                        </a>
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
      ) : null}

      {data.analyses.length > 0 ? (
        <div className="overflow-x-auto">
          <p className="mb-2 text-sm font-medium">Análises de jogo</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Adversário</TableHead>
                <TableHead>Vídeo</TableHead>
                <TableHead>PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.analyses.map((row) => (
                <TableRow key={row.analysis.id}>
                  <TableCell>
                    {row.analysis.matchDate
                      ? formatDateDayMonYear(new Date(row.analysis.matchDate))
                      : "—"}
                  </TableCell>
                  <TableCell>{row.analysis.opponentName ?? "—"}</TableCell>
                  <TableCell>
                    {row.analysis.highlightsVideoUrl ? (
                      <a
                        href={row.analysis.highlightsVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        YouTube
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.analysis.attachments[0] ? (
                      <a
                        href={getPublicImageUrl(row.analysis.attachments[0].fileUrl) || row.analysis.attachments[0].fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        PDF
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
