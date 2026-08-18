"use client";

import { useState } from "react";
import { Loader2, Printer } from "lucide-react";
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
import type { RosterValidationRow } from "@/lib/assistencia-social-types";

interface Props {
  tenantId: string;
  tenantName?: string;
  tenantCategories?: string[] | null;
}

export function AssistenciaSocialRosterPanel({ tenantId, tenantName, tenantCategories }: Props) {
  const { categories: categoriesForDropdown } = useCategoriesForTenant(tenantCategories, {
    requireTenantSelection: true,
  });
  const [category, setCategory] = useState("");
  const [rows, setRows] = useState<RosterValidationRow[]>([]);
  const [loading, setLoading] = useState(false);
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
    } catch (err) {
      setRows([]);
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Não foi possível carregar o elenco.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    printRosterValidation(tenantName ?? "Clube", rows);
  };

  if (!tenantId) {
    return <p className="text-sm text-muted-foreground py-4">Selecione um clube/empresa.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end mb-4">
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
        <Button type="button" onClick={handleLoad} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Validar elenco
        </Button>
        {rows.length > 0 ? (
          <Button type="button" variant="secondary" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Atleta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Escola</TableHead>
                <TableHead>Pendências</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.playerId}>
                  <TableCell>{row.jerseyNumber ?? "—"}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.category ? (categoriesForDropdown.find((c) => c.value === row.category)?.labelPT ?? row.category) : "—"}</TableCell>
                  <TableCell>{row.schoolName ?? "—"}</TableCell>
                  <TableCell>{row.validation.ok ? "OK" : row.validation.issues.join("; ")}</TableCell>
                </TableRow>
              ))}
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
