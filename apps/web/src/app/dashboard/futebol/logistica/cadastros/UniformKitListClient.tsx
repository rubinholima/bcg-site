"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getPublicImageUrl } from "@/lib/media-url";
import { LOGISTICA_CADASTROS_BASE } from "@/lib/logistica-cadastros.config";
import { canManageUniformKits } from "@/lib/uniform-kits-access";
import { useAuth } from "@/context/AuthContext";

export type UniformKitRow = {
  id: string;
  name: string;
  season?: string | null;
  imageUrl?: string | null;
  active?: boolean;
  isSystem?: boolean;
  teamCategory?: string | null;
  tenant?: { id: string; name: string } | null;
  uniformType?: { id: string; name: string } | null;
};

interface Props {
  initialRows: UniformKitRow[];
  tenantId?: string;
  loadError?: string | null;
}

export function UniformKitListClient({ initialRows, tenantId, loadError }: Props) {
  const { role, canAccessModule, isSuperAdmin } = useAuth();
  const canManage = canManageUniformKits(role, canAccessModule, isSuperAdmin);
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.uniformType?.name?.toLowerCase().includes(q) ||
        r.season?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const qs = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/logistica-cadastros/uniform-kits/${deleteId}`);
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setFeedback({
        title: "Não foi possível excluir",
        message: err instanceof Error ? err.message : "Erro ao excluir kit.",
      });
      setDeleteId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">Kits / uniformes</CardTitle>
          {canManage && tenantId ? (
            <Button asChild className="min-h-[44px] w-full sm:w-auto">
              <Link href={`${LOGISTICA_CADASTROS_BASE}/kits-uniforme/new${qs}`}>
                <Plus className="mr-2 h-4 w-4" />
                Novo kit
              </Link>
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {loadError ? <p className="text-sm text-destructive">{loadError}</p> : null}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 min-h-[44px]"
              placeholder="Buscar por nome, tipo ou temporada…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[72px]">Imagem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Temporada</TableHead>
                  <TableHead>Status</TableHead>
                  {canManage ? <TableHead className="w-[100px]">Ações</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-muted-foreground">
                      Nenhum kit encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const img = row.imageUrl
                      ? getPublicImageUrl(row.imageUrl) || row.imageUrl
                      : null;
                    const readOnly = row.isSystem || !row.tenant;
                    const editHref = `${LOGISTICA_CADASTROS_BASE}/kits-uniforme/${row.id}/edit${qs}`;
                    return (
                      <ClickableTableRow
                        key={row.id}
                        href={canManage && !readOnly ? editHref : undefined}
                      >
                        <TableCell>
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-12 w-12 rounded-md border object-cover" />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.name}
                          {readOnly ? (
                            <Lock className="ml-2 inline h-3.5 w-3.5 text-muted-foreground" aria-label="Somente leitura" />
                          ) : null}
                        </TableCell>
                        <TableCell>{row.uniformType?.name ?? "—"}</TableCell>
                        <TableCell>{row.teamCategory ?? "—"}</TableCell>
                        <TableCell>{row.season ?? "—"}</TableCell>
                        <TableCell>{row.active === false ? "Inativo" : "Ativo"}</TableCell>
                        {canManage ? (
                          <TableCell>
                            <TableRowActions>
                              {!readOnly ? (
                                <>
                                  <Button variant="ghost" size="icon" asChild aria-label="Editar">
                                    <Link href={editHref}>
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
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
                              ) : null}
                            </TableRowActions>
                          </TableCell>
                        ) : null}
                      </ClickableTableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir kit?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Viagens antigas que referenciam o nome do kit continuam legíveis.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant="error"
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </>
  );
}
