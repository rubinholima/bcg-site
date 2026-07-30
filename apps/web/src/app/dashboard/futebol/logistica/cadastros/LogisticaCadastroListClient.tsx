"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import {
  formatCadastroDate,
  type LogisticsLookupRow,
} from "@/lib/logistica-cadastros";
import {
  LOGISTICA_CADASTROS_BASE,
  type LogisticaCadastroResource,
} from "@/lib/logistica-cadastros.config";

interface Props {
  resource: LogisticaCadastroResource;
  initialRows: LogisticsLookupRow[];
  tenantId?: string;
  showSuccess?: boolean;
}

function cellValue(row: LogisticsLookupRow, key: string, nestedKey?: string): string {
  if (nestedKey) {
    const parent = row[key as keyof LogisticsLookupRow] as { name?: string } | null | undefined;
    return parent?.name ?? "—";
  }
  const val = row[key as keyof LogisticsLookupRow];
  if (val == null || val === "") return "—";
  return String(val);
}

export function LogisticaCadastroListClient({
  resource,
  initialRows,
  tenantId,
  showSuccess,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState(initialRows);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const basePath = `${LOGISTICA_CADASTROS_BASE}/${resource.slug}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.name,
        row.phone,
        row.cpf,
        row.city,
        row.transportCompany?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/logistica-cadastros/${resource.apiPath}/${deleteId}`);
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    } catch (err) {
      setFeedback({
        open: true,
        title: "Não foi possível excluir",
        message: err instanceof Error ? err.message : "Erro ao excluir registro",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-500">
          Operação realizada com sucesso!
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar…"
            className="pl-9 min-h-[44px]"
            aria-label="Procurar"
          />
        </div>
        <Link href={`${basePath}/new${tenantId ? `?tenantId=${tenantId}` : ""}`}>
          <Button className="min-h-[44px] w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Novo
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os {resource.labelPlural.toLowerCase()}</CardTitle>
          <CardDescription>{resource.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhum registro encontrado.</p>
              <Link href={`${basePath}/new${tenantId ? `?tenantId=${tenantId}` : ""}`}>
                <Button variant="outline" className="mt-4 min-h-[44px]">
                  Cadastrar primeiro
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {resource.columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const locked = row.isSystem === true;
                    return (
                      <ClickableTableRow
                        key={row.id}
                        href={locked ? undefined : `${basePath}/${row.id}/edit`}
                      >
                        {resource.columns.map((col) => (
                          <TableCell key={col.key}>
                            {col.format === "date"
                              ? formatCadastroDate(row[col.key as keyof LogisticsLookupRow] as string)
                              : cellValue(row, col.key, col.nestedKey)}
                          </TableCell>
                        ))}
                        <TableRowActions>
                          <div className="flex justify-end gap-1">
                            {locked ? (
                              <Button variant="ghost" size="icon" aria-label="Registro padrão" disabled>
                                <Lock className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            ) : (
                              <>
                                <Link href={`${basePath}/${row.id}/edit`}>
                                  <Button variant="ghost" size="icon" aria-label="Editar">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Excluir"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setDeleteId(row.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableRowActions>
                      </ClickableTableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {resource.label.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Registros vinculados a viagens podem ser apenas
              desativados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))}
        variant="error"
        title={feedback.title}
        message={feedback.message}
      />
    </div>
  );
}
