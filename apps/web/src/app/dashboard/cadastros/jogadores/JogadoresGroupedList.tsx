"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/media-url";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  FOOTBALL_POSITIONS,
  getPositionLabel,
  normalizeFootballPositionCode,
} from "@/lib/football-positions";
import {
  buildPlayerMatchAvailabilityInput,
  getPlayerMatchAvailability,
} from "@/lib/player-match-availability";
import { PlayerMatchAvailabilityBadge } from "@/components/dashboard/players/PlayerMatchAvailabilityBadge";
import { comparePlayersByDisplayName, getPlayerListDisplayName } from "@/lib/player-display-name";
import { cn } from "@/lib/utils";

export interface JogadorListItem {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string; logoUrl?: string | null };
  status?: string | null;
  statusDetails?: string | null;
  statusUntil?: string | null;
  yellowCards?: number | null;
  redCards?: number | null;
  registrationProfile?: unknown;
}

interface JogadoresGroupedListProps {
  players: JogadorListItem[];
  groupByTeam: boolean;
}

const POSITION_ORDER = FOOTBALL_POSITIONS.map((p) => p.value);
const NO_POSITION_KEY = "__sem_posicao__";

function groupByPosition(players: JogadorListItem[]) {
  const map = new Map<string, JogadorListItem[]>();

  for (const p of players) {
    const code = normalizeFootballPositionCode(p.position) ?? NO_POSITION_KEY;
    const list = map.get(code) ?? [];
    list.push(p);
    map.set(code, list);
  }

  const groups: Array<{ key: string; label: string; players: JogadorListItem[] }> = [];

  for (const code of POSITION_ORDER) {
    const rows = map.get(code);
    if (!rows?.length) continue;
    groups.push({
      key: code,
      label: getPositionLabel(code),
      players: [...rows].sort(comparePlayersByDisplayName),
    });
    map.delete(code);
  }

  const unknown = map.get(NO_POSITION_KEY);
  if (unknown?.length) {
    groups.push({
      key: NO_POSITION_KEY,
      label: "Sem posição",
      players: [...unknown].sort(comparePlayersByDisplayName),
    });
    map.delete(NO_POSITION_KEY);
  }

  for (const [key, rows] of map) {
    if (!rows.length) continue;
    groups.push({
      key,
      label: getPositionLabel(key) || key,
      players: [...rows].sort(comparePlayersByDisplayName),
    });
  }

  return groups;
}

function PlayerCard({ player }: { player: JogadorListItem }) {
  const displayName = getPlayerListDisplayName(player);
  const fullName = player.name.trim();
  const showFullName = fullName && displayName.toLowerCase() !== fullName.toLowerCase();

  return (
    <div className="group flex items-start gap-2 rounded-xl border border-border/70 bg-gradient-to-br from-zinc-900/80 via-card/50 to-zinc-950/60 p-3 transition-all hover:border-violet-500/45 hover:shadow-[0_0_24px_-8px_rgba(139,92,246,0.55)]">
      <Link
        href={`/dashboard/cadastros/jogadores/${player.id}/edit`}
        className="flex min-w-0 flex-1 items-start gap-3"
      >
        {player.photoUrl ? (
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
            <img
              src={getPublicImageUrl(player.photoUrl)}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/40 text-xs text-muted-foreground">
            —
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold leading-snug break-words text-foreground group-hover:text-violet-100">
            {displayName}
          </p>
          {showFullName ? (
            <p className="text-[11px] leading-snug break-words text-muted-foreground">{fullName}</p>
          ) : null}
          {player.jerseyNumber != null ? (
            <p className="text-[11px] font-medium text-violet-300/90">#{player.jerseyNumber}</p>
          ) : null}
          <PlayerMatchAvailabilityBadge
            availability={getPlayerMatchAvailability(buildPlayerMatchAvailabilityInput(player))}
          />
        </div>
      </Link>
      <div className="flex shrink-0 flex-col gap-1">
        <Link href={`/dashboard/cadastros/jogadores/${player.id}/edit`}>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Editar">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </Link>
        <Link href={`/dashboard/cadastros/jogadores/${player.id}/delete`}>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Excluir">
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function PositionBlock({
  label,
  players,
}: {
  label: string;
  players: JogadorListItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 border-b border-violet-500/20 pb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-violet-200 sm:text-sm">{label}</h3>
        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-300 sm:text-xs">
          {players.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {players.map((p) => (
          <PlayerCard key={p.id} player={p} />
        ))}
      </div>
    </section>
  );
}

function PlayersByPosition({ players }: { players: JogadorListItem[] }) {
  const positions = useMemo(() => groupByPosition(players), [players]);

  if (!players.length) {
    return (
      <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nenhum atleta nesta categoria.</p>
    );
  }

  return (
    <div className="space-y-6">
      {positions.map((pos) => (
        <PositionBlock key={pos.key} label={pos.label} players={pos.players} />
      ))}
    </div>
  );
}

function CategoryBlock({
  categoryKey,
  players,
}: {
  categoryKey: string;
  players: JogadorListItem[];
}) {
  const [open, setOpen] = useState(false);
  const label = categoryKey === "__sem_categoria__" ? "Sem categoria" : getCategoryLabel(categoryKey, "pt");

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          <span className="text-sm font-medium">{label}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{players.length}</span>
        </div>
      </button>
      {open ? (
        <div className="border-t border-border/60 bg-background/40 p-3 sm:p-4">
          <PlayersByPosition players={players} />
        </div>
      ) : null}
    </div>
  );
}

function TeamBlock({
  teamName,
  teamLogoUrl,
  categories,
}: {
  teamName: string;
  teamLogoUrl?: string | null;
  categories: Array<{ key: string; players: JogadorListItem[] }>;
}) {
  const [open, setOpen] = useState(false);
  const total = categories.reduce((acc, c) => acc + c.players.length, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/20 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted">
            {teamLogoUrl ? (
              <img
                src={getPublicImageUrl(teamLogoUrl)}
                alt=""
                className="h-full w-full object-contain p-0.5"
              />
            ) : (
              <Users className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{teamName}</p>
            <p className="text-xs text-muted-foreground">
              {categories.length} categoria{categories.length !== 1 ? "s" : ""} · {total} atleta
              {total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="space-y-3 border-t border-border/60 px-3 py-4 sm:px-4">
          {categories.map((cat) => (
            <CategoryBlock key={cat.key} categoryKey={cat.key} players={cat.players} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function groupByCategory(players: JogadorListItem[]) {
  const map = new Map<string, JogadorListItem[]>();
  for (const p of players) {
    const key = p.category?.trim() || "__sem_categoria__";
    const list = map.get(key) ?? [];
    list.push(p);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([key, rows]) => ({
      key,
      players: rows,
    }))
    .sort((a, b) => {
      if (a.key === "__sem_categoria__") return 1;
      if (b.key === "__sem_categoria__") return -1;
      return getCategoryLabel(a.key, "pt").localeCompare(getCategoryLabel(b.key, "pt"), "pt-BR");
    });
}

export function JogadoresGroupedList({ players, groupByTeam }: JogadoresGroupedListProps) {
  const grouped = useMemo(() => {
    if (!groupByTeam) {
      return { teams: null as null, categories: groupByCategory(players) };
    }

    const teamMap = new Map<string, { name: string; logoUrl?: string | null; players: JogadorListItem[] }>();
    for (const p of players) {
      const key = p.tenantId;
      const name = p.tenant?.name ?? p.tenantId;
      const entry = teamMap.get(key) ?? { name, logoUrl: p.tenant?.logoUrl ?? null, players: [] };
      if (!entry.logoUrl && p.tenant?.logoUrl) entry.logoUrl = p.tenant.logoUrl;
      entry.players.push(p);
      teamMap.set(key, entry);
    }

    const teams = [...teamMap.entries()]
      .map(([, value]) => ({
        teamName: value.name,
        teamLogoUrl: value.logoUrl,
        categories: groupByCategory(value.players),
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName, "pt-BR"));

    return { teams, categories: null as null };
  }, [players, groupByTeam]);

  if (groupByTeam && grouped.teams) {
    return (
      <div className="space-y-4">
        {grouped.teams.map((team) => (
          <TeamBlock
            key={team.teamName}
            teamName={team.teamName}
            teamLogoUrl={team.teamLogoUrl}
            categories={team.categories}
          />
        ))}
      </div>
    );
  }

  if (grouped.categories?.length === 1) {
    return <PlayersByPosition players={grouped.categories[0]!.players} />;
  }

  return (
    <div className="space-y-3">
      {grouped.categories?.map((cat) => (
        <CategoryBlock key={cat.key} categoryKey={cat.key} players={cat.players} />
      ))}
    </div>
  );
}
