"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getPlayerListDisplayName } from "@/lib/player-display-name";
import { getPositionLabel } from "@/lib/football-positions";
import {
  formatProfileDate,
  getLoanPsychologicalSupportLabel,
  normalizeLoanProfile,
  parseRegistrationProfile,
} from "@/lib/player-registration-profile";
import type { JogadorListItem } from "./JogadoresGroupedList";

interface JogadoresLoanedListProps {
  players: JogadorListItem[];
}

export function JogadoresLoanedList({ players }: JogadoresLoanedListProps) {
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return players
      .map((p) => {
        const profile = parseRegistrationProfile(p.registrationProfile);
        const loan = normalizeLoanProfile(profile.loan);
        return { player: p, loan };
      })
      .filter(({ player, loan }) => {
        if (!q) return true;
        const haystack = [
          player.name,
          player.tenant?.name,
          loan.destinationClub,
          getLoanPsychologicalSupportLabel(loan.psychologicalSupport),
          formatProfileDate(loan.startDate),
          formatProfileDate(loan.endDate),
          getCategoryLabel(player.category ?? "", "pt"),
          getPositionLabel(player.position ?? undefined),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.player.name.localeCompare(b.player.name, "pt-BR"));
  }, [players, search]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Procurar"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-14">Foto</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Clube origem</TableHead>
              <TableHead>Clube destino</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead>Ajuda psicológica</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                  Nenhum atleta emprestado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ player: p, loan }) => (
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
                  <TableCell className="font-medium">{getPlayerListDisplayName(p)}</TableCell>
                  <TableCell>{p.tenant?.name ?? "—"}</TableCell>
                  <TableCell>{loan.destinationClub?.trim() || "—"}</TableCell>
                  <TableCell>{formatProfileDate(loan.startDate)}</TableCell>
                  <TableCell>{formatProfileDate(loan.endDate)}</TableCell>
                  <TableCell>{getLoanPsychologicalSupportLabel(loan.psychologicalSupport)}</TableCell>
                  <TableCell>{getCategoryLabel(p.category ?? "", "pt") || p.category || "—"}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
