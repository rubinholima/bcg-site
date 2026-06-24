"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { FOOTBALL_AGENDA_TYPE_LABEL } from "@/types/futebol-agenda";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";
import { ExpandableSection } from "./ExpandableSection";

export type PlayerAgendaItem = {
  id: string;
  source: "travel" | "entry";
  type: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  allDay?: boolean;
  category?: string | null;
  status?: string;
  location?: string | null;
  spaceName?: string | null;
  href: string;
};

interface PlayerAgendaTabProps {
  playerId: string;
  canAccessLogistica: boolean;
}

function formatWhen(item: PlayerAgendaItem) {
  const d = new Date(item.startAt);
  const date = d.toLocaleDateString("pt-BR");
  if (item.allDay) return date;
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function PlayerAgendaTab({ playerId, canAccessLogistica }: PlayerAgendaTabProps) {
  const [items, setItems] = useState<PlayerAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PlayerAgendaItem[]>(`/players/${playerId}/agenda`);
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
      setError("Não foi possível carregar a agenda do atleta.");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    if (canAccessLogistica) load();
  }, [canAccessLogistica, load]);

  if (!canAccessLogistica) {
    return (
      <ExpandableSection title="Agenda e compromissos" description="Treinos, viagens e aniversário">
        <p className="text-sm text-muted-foreground">Sem permissão para visualizar a agenda operacional.</p>
      </ExpandableSection>
    );
  }

  return (
    <ExpandableSection
      title="Agenda e compromissos"
      description="Próximos treinos, viagens, aniversário e atividades vinculadas ao atleta"
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum compromisso próximo vinculado a este atleta.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={`${item.source}-${item.id}`}
              className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {FOOTBALL_AGENDA_TYPE_LABEL[item.type] ?? item.type}
                    {item.category ? ` · ${getCategoryLabel(item.category, "pt")}` : ""}
                  </p>
                  <p className="font-medium leading-tight">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatWhen(item)}</p>
                  {item.spaceName || item.location ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.spaceName ?? item.location}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Abrir
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <Link href={agendaHubUrl(AGENDA_VISAO.FUTEBOL)} className="text-xs font-medium text-primary hover:underline">
          Ver agenda completa do clube
        </Link>
      </div>
    </ExpandableSection>
  );
}
