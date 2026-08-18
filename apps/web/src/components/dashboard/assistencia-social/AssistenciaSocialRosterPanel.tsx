"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { useCategoriesForTenant } from "@/hooks/useFixtureCategories";
import { api } from "@/lib/api";
import { printRosterValidation } from "@/lib/assistencia-social-print";
import {
  getValidationFixTarget,
  playerEditUrl,
  primaryFixTab,
} from "@/lib/assistencia-social-validation";
import type { RosterValidationRow } from "@/lib/assistencia-social-types";

interface Props {
  tenantId: string;
  tenantName?: string;
  tenantLogoUrl?: string | null;
  tenantCategories?: string[] | null;
}

export function AssistenciaSocialRosterPanel({
  tenantId,
  tenantName,
  tenantLogoUrl,
  tenantCategories,
}: Props) {
  const { categories: categoriesForDropdown } = useCategoriesForTenant(tenantCategories, {
    requireTenantSelection: true,
  });
  const [category, setCategory] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [rows, setRows] = useState<RosterValidationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const handleLoad = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ tenantId });
      if (category) params.set("category", category);
      const { data } = await api.get<{ tenant: { name: string }; rows: RosterValidationRow[] }>(
        `/assistencia-social/reports/roster-validation?${params}`,
      );
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLoaded(true);
    } catch (err) {
      setRows([]);
      setLoaded(true);
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível carregar o elenco.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRows([]);
    setLoaded(false);
    if (tenantId) void handleLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recarrega ao trocar clube/categoria
  }, [tenantId, category]);

  const visibleRows = useMemo(
    () => (onlyPending ? rows.filter((r) => !r.validation.ok) : rows),
    [rows, onlyPending],
  );

  const stats = useMemo(() => {
    const pending = rows.filter((r) => !r.validation.ok).length;
    return { total: rows.length, ok: rows.length - pending, pending };
  }, [rows]);

  const categoryLabel = useMemo(() => {
    if (!category) return "Todas";
    return categoriesForDropdown.find((c) => c.value === category)?.labelPT ?? category;
  }, [category, categoriesForDropdown]);

  const handlePrint = () => {
    printRosterValidation({
      tenantName: tenantName ?? "Clube",
      logoUrl: tenantLogoUrl,
      categoryLabel,
      rows: visibleRows,
      stats,
    });
  };

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap mb-4">
        <div className="grid gap-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">Categoria</Label>
          <NativeSelectField
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Todas"
            options={[
              { value: "", label: "Todas" },
              ...categoriesForDropdown.map((c) => ({ value: c.value, label: c.labelPT })),
            ]}
          />
        </div>
        <Button type="button" onClick={handleLoad} disabled={loading} variant="secondary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Atualizar
        </Button>
        <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
            className="rounded border-border"
          />
          Só pendentes
        </label>
        {rows.length > 0 ? (
          <Button type="button" variant="secondary" onClick={handlePrint} disabled={visibleRows.length === 0}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        ) : null}
      </div>

      {loaded && rows.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4 text-sm">
          <span className="rounded-full border border-border px-3 py-1">{stats.total} atletas</span>
          <span className="rounded-full border border-green-700/40 bg-green-950/30 text-green-100 px-3 py-1">
            {stats.ok} OK
          </span>
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-100 px-3 py-1">
            {stats.pending} pendente{stats.pending === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      {loaded && visibleRows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {rows.length === 0
            ? "Nenhum atleta encontrado nesta categoria."
            : "Nenhuma pendência — todos os atletas estão OK."}
        </p>
      ) : null}

      {visibleRows.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Atleta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pendências</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => {
                const fixTab = primaryFixTab(row.validation.issues);
                const fixHref = playerEditUrl(row.playerId, fixTab);
                return (
                  <TableRow key={row.playerId}>
                    <TableCell>{row.jerseyNumber ?? "—"}</TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={playerEditUrl(row.playerId, "assistencia_social")}
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {row.name}
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      {row.category
                        ? (categoriesForDropdown.find((c) => c.value === row.category)?.labelPT ??
                          row.category)
                        : "—"}
                    </TableCell>
                    <TableCell>{row.schoolName ?? "—"}</TableCell>
                    <TableCell>
                      {row.validation.ok ? (
                        <span className="text-green-400 font-medium">OK</span>
                      ) : (
                        <span className="text-amber-400 font-medium">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.validation.ok ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="space-y-1">
                          {row.validation.issues.map((issue) => {
                            const fix = getValidationFixTarget(issue);
                            return (
                              <li key={issue}>
                                <Link
                                  href={playerEditUrl(row.playerId, fix.tab)}
                                  className="text-primary hover:underline text-xs sm:text-sm"
                                >
                                  {issue} → {fix.actionLabel}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.validation.ok ? (
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <Link href={playerEditUrl(row.playerId, "assistencia_social")}>Abrir ficha</Link>
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="secondary" asChild>
                          <Link href={fixHref}>Corrigir</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
