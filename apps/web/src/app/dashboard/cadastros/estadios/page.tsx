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

interface Stadium {
  id: string;
  name: string;
  city?: string;
  address?: string;
  createdAt: string;
}

async function getStadiums(): Promise<Stadium[]> {
  try {
    const { data } = await api.get<Stadium[]>("/stadiums");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar estádios:", error);
    return [];
  }
}

export default async function EstadiosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const stadiums = await getStadiums();
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
        <Link href="/dashboard/cadastros/estadios/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Estádio
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Estádios</CardTitle>
          <CardDescription>
            {stadiums.length === 0
              ? "Nenhum estádio cadastrado"
              : `${stadiums.length} estádio${stadiums.length > 1 ? "s" : ""} cadastrado${stadiums.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stadiums.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum estádio encontrado.</p>
              <Link href="/dashboard/cadastros/estadios/new">
                <Button variant="outline" className="mt-4">
                  Criar primeiro estádio
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stadiums.map((s) => (
                  <ClickableTableRow key={s.id} href={`/dashboard/cadastros/estadios/${s.id}/edit`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.city ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate" title={s.address}>
                      {s.address ?? "—"}
                    </TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/cadastros/estadios/${s.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/cadastros/estadios/${s.id}/delete`}>
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
