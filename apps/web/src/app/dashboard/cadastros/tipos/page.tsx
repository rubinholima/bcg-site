import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import { TenantKind } from "@/types/tenant-kind";
import { TiposFilters } from "@/components/dashboard/TiposFilters";

async function getTenantKinds(): Promise<TenantKind[]> {
  try {
    const { data } = await api.get<TenantKind[]>("/tenant-kinds");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar tipos:", error);
    return [];
  }
}

function filterTipos(tipos: TenantKind[], q: string | null): TenantKind[] {
  if (!q || !q.trim()) return tipos;
  const lower = q.trim().toLowerCase();
  return tipos.filter((t) => t.name.toLowerCase().includes(lower));
}

export default async function TiposPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; q?: string }>;
}) {
  const tipos = await getTenantKinds();
  const params = await searchParams;
  const showSuccess = params.success === "true";
  const q = params.q ?? null;
  const filtered = filterTipos(tipos, q);

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/dashboard/cadastros/tipos/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Tipo
          </Button>
        </Link>
      </div>
      <TiposFilters currentQ={q} />

      <Card>
        <CardHeader>
          <CardTitle>Lista de Tipos</CardTitle>
          <CardDescription>
            {tipos.length === 0
              ? "Nenhum tipo cadastrado"
              : filtered.length === tipos.length
                ? `${tipos.length} tipo${tipos.length > 1 ? "s" : ""} cadastrado${tipos.length > 1 ? "s" : ""}`
                : `${filtered.length} de ${tipos.length} tipo${tipos.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>
                {tipos.length === 0
                  ? "Nenhum tipo encontrado."
                  : "Nenhum tipo corresponde à busca."}
              </p>
              {tipos.length > 0 && q ? (
                <Link href="/dashboard/cadastros/tipos">
                  <Button variant="outline" className="mt-4">
                    Limpar filtro
                  </Button>
                </Link>
              ) : tipos.length === 0 ? (
                <Link href="/dashboard/cadastros/tipos/new">
                  <Button variant="outline" className="mt-4">
                    Criar primeiro tipo
                  </Button>
                </Link>
              ) : null}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tipo) => (
                  <ClickableTableRow key={tipo.id} href={`/dashboard/cadastros/tipos/${tipo.id}/edit`}>
                    <TableCell className="font-medium">{tipo.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTimeDayMonYear(tipo.createdAt)}
                    </TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/cadastros/tipos/${tipo.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/cadastros/tipos/${tipo.id}/delete`}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
