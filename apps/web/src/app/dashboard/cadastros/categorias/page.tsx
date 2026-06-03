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
import { fetchFixtureCategories } from "@/lib/fixture-categories";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const categories = await fetchFixtureCategories({ activeOnly: false });
  const params = await searchParams;
  const showSuccess = params.success === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/dashboard/cadastros/categorias/new">
          <Button className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            Nova categoria
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Categorias de futebol</CardTitle>
          <CardDescription>
            Cadastro central usado em todo o app (jogadores, agenda, site, FMF). Em{" "}
            <Link href="/dashboard/empresas" className="text-primary underline-offset-2 hover:underline">
              Empresas / Clubes
            </Link>{" "}
            você escolhe quais categorias cada clube utiliza.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhuma categoria cadastrada.</p>
              <Link href="/dashboard/cadastros/categorias/new">
                <Button variant="outline" className="mt-4 min-h-[44px]">
                  Criar primeira categoria
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug (interno)</TableHead>
                  <TableHead>Label PT</TableHead>
                  <TableHead>Label EN</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat) => (
                  <ClickableTableRow
                    key={cat.id ?? cat.value}
                    href={cat.id ? `/dashboard/cadastros/categorias/${cat.id}/edit` : "#"}
                  >
                    <TableCell className="font-mono text-sm">{cat.value}</TableCell>
                    <TableCell>{cat.labelPT}</TableCell>
                    <TableCell>{cat.labelEN}</TableCell>
                    <TableCell>{cat.sortOrder ?? 0}</TableCell>
                    <TableCell>
                      {cat.active === false ? (
                        <span className="text-muted-foreground">Inativa</span>
                      ) : (
                        <span className="text-emerald-500">Ativa</span>
                      )}
                    </TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        {cat.id ? (
                          <>
                            <Link href={`/dashboard/cadastros/categorias/${cat.id}/edit`}>
                              <Button variant="ghost" size="icon" aria-label="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/dashboard/cadastros/categorias/${cat.id}/delete`}>
                              <Button variant="ghost" size="icon" aria-label="Desativar">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </Link>
                          </>
                        ) : null}
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
