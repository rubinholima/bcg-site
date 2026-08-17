"use client";

import type { CoachCompletedGame } from "@/lib/treinadores-types";
import { GameMatchDataEditor } from "@/components/dashboard/futebol/GameMatchDataEditor";

interface Props {
  tenantId: string;
  category?: string;
  game: CoachCompletedGame;
  onSaved: () => void;
}

export function TreinadoresMatchStatsEditor({ tenantId, category, game, onSaved }: Props) {
  return (
    <GameMatchDataEditor
      tenantId={tenantId}
      category={category}
      game={game}
      saveVia="treinadores"
      triggerLabel="Dados do jogo"
      triggerVariant="ghost"
      triggerSize="sm"
      onSaved={onSaved}
    />
  );
}
