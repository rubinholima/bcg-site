"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCategoryLabel } from "@/lib/fixture-categories";
import {
  computeDaysInCategory,
  computeTotalClubDays,
  formatProfileDate,
  getCategoryMigrationLabel,
  normalizeCategoryHistory,
  type PlayerCategoryHistoryEntry,
  type PlayerRegistrationProfile,
} from "@/lib/player-registration-profile";
import { ExpandableSection } from "./ExpandableSection";

interface PlayerCategoryHistorySectionProps {
  profile: PlayerRegistrationProfile;
  currentCategory?: string | null;
}

function categoryLabel(value?: string | null): string {
  if (!value?.trim()) return "—";
  return getCategoryLabel(value, "pt") || value;
}

function rowDisplayId(entry: PlayerCategoryHistoryEntry, index: number): string {
  return String(entry.displayId ?? 1001 + index);
}

export function PlayerCategoryHistorySection({
  profile,
  currentCategory,
}: PlayerCategoryHistorySectionProps) {
  const [search, setSearch] = useState("");
  const history = normalizeCategoryHistory(profile.categoryHistory);

  const rows = useMemo(() => {
    const sorted = [...history].sort(
      (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime(),
    );
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((row) => {
      const haystack = [
        rowDisplayId(row, 0),
        categoryLabel(row.fromCategory),
        categoryLabel(row.toCategory),
        getCategoryMigrationLabel(row.migrationType),
        row.responsible,
        formatProfileDate(row.entryDate),
        formatProfileDate(row.exitDate),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [history, search]);

  const totalClubDays = computeTotalClubDays(history);

  return (
    <ExpandableSection
      title="Histórico de categorias"
      description="Progressão de categorias no clube"
      badge={history.length > 0 ? String(history.length) : undefined}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {currentCategory
              ? `Categoria atual: ${categoryLabel(currentCategory)}`
              : "Sem categoria definida"}
          </p>
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
                <TableHead className="whitespace-nowrap">Id</TableHead>
                <TableHead className="whitespace-nowrap">Na categoria</TableHead>
                <TableHead className="whitespace-nowrap">Data entrada</TableHead>
                <TableHead className="whitespace-nowrap">Data saída</TableHead>
                <TableHead className="whitespace-nowrap">Para categoria</TableHead>
                <TableHead className="whitespace-nowrap">Tipo de migração</TableHead>
                <TableHead className="whitespace-nowrap">Tempo (dias)</TableHead>
                <TableHead className="whitespace-nowrap">Última alteração</TableHead>
                <TableHead className="whitespace-nowrap">Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhum histórico registrado. Altere a categoria em Identificação para gerar registros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{rowDisplayId(row, index)}</TableCell>
                    <TableCell>{categoryLabel(row.fromCategory)}</TableCell>
                    <TableCell>{formatProfileDate(row.entryDate)}</TableCell>
                    <TableCell>{formatProfileDate(row.exitDate)}</TableCell>
                    <TableCell>{categoryLabel(row.toCategory)}</TableCell>
                    <TableCell>{getCategoryMigrationLabel(row.migrationType)}</TableCell>
                    <TableCell>{computeDaysInCategory(row) ?? "—"}</TableCell>
                    <TableCell>{formatProfileDate(row.updatedAt)}</TableCell>
                    <TableCell className="max-w-[140px] truncate">{row.responsible ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {history.length > 0 ? (
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
            <span className="font-medium">Tempo de clube</span>
            <span className="text-muted-foreground">
              {totalClubDays} dia{totalClubDays !== 1 ? "s" : ""}
            </span>
          </div>
        ) : null}
      </div>
    </ExpandableSection>
  );
}
