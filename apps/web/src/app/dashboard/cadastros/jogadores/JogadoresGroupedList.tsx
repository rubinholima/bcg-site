"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Pencil, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
import { getPublicImageUrl } from "@/lib/media-url";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import {
  buildPlayerMatchAvailabilityInput,
  getPlayerMatchAvailability,
} from "@/lib/player-match-availability";
import { PlayerMatchAvailabilityBadge } from "@/components/dashboard/players/PlayerMatchAvailabilityBadge";
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

function PlayerTable({ rows }: { rows: JogadorListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-14">Foto</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Nº</TableHead>
          <TableHead>Posição</TableHead>
          <TableHead>Aptidão</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((p) => (
          <ClickableTableRow key={p.id} href={`/dashboard/cadastros/jogadores/${p.id}/edit`}>
            <TableCell>
              {p.photoUrl ? (
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-muted">
                  <img src={getPublicImageUrl(p.photoUrl)} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                  —
                </div>
              )}
            </TableCell>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>{p.jerseyNumber ?? "—"}</TableCell>
            <TableCell>{getPositionLabel(p.position) || p.position || "—"}</TableCell>
            <TableCell>
              <PlayerMatchAvailabilityBadge
                availability={getPlayerMatchAvailability(buildPlayerMatchAvailabilityInput(p))}
              />
            </TableCell>
            <TableRowActions>
              <div className="flex justify-end gap-2">
                <Link href={`/dashboard/cadastros/jogadores/${p.id}/edit`}>
                  <Button variant="ghost" size="icon" aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href={`/dashboard/cadastros/jogadores/${p.id}/delete`}>
                  <Button variant="ghost" size="icon" aria-label="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </Link>
              </div>
            </TableRowActions>
          </ClickableTableRow>
        ))}
      </TableBody>
    </Table>
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
    <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
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
        <div className="border-t border-border/60 bg-background/50 p-2 sm:p-3">
          <PlayerTable rows={players} />
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
      players: rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
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

  return (
    <div className="space-y-3">
      {grouped.categories?.map((cat) => (
        <CategoryBlock key={cat.key} categoryKey={cat.key} players={cat.players} />
      ))}
    </div>
  );
}
