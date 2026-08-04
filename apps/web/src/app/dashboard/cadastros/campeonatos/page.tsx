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

interface Championship {
  id: string;
  name: string;
  createdAt: string;
}

async function getChampionships(): Promise<Championship[]> {
  try {
    const { data } = await api.get<Championship[]>("/championships");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar campeonatos:", error);
    return [];
  }
}

export default async function CampeonatosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const championships = await getChampionships();
  const params = await searchParams;
  const showSuccess = params.success === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/dashboard/cadastros/campeonatos/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Campeonato
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Campeonatos</CardTitle>
          <CardDescription>
            {championships.length === 0
              ? "Nenhum campeonato cadastrado"
              : `${championships.length} campeonato${championships.length > 1 ? "s" : ""} cadastrado${championships.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {championships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum campeonato encontrado.</p>
              <Link href="/dashboard/cadastros/campeonatos/new">
                <Button variant="outline" className="mt-4">
                  Criar primeiro campeonato
                </Button>
              </Link>
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
                {championships.map((c) => (
                  <ClickableTableRow key={c.id} href={`/dashboard/cadastros/campeonatos/${c.id}/edit`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTimeDayMonYear(c.createdAt)}
                    </TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/cadastros/campeonatos/${c.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/cadastros/campeonatos/${c.id}/delete`}>
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
