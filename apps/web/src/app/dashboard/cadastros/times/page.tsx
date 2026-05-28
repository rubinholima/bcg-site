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
import { getPublicImageUrl } from "@/lib/media-url";

interface VisitingTeam {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: string;
}

async function getVisitingTeams(): Promise<VisitingTeam[]> {
  try {
    const { data } = await api.get<VisitingTeam[]>("/visiting-teams");
    return data ?? [];
  } catch (error) {
    console.error("Erro ao carregar times:", error);
    return [];
  }
}

export default async function TimesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const teams = await getVisitingTeams();
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
        <Link href="/dashboard/cadastros/times/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Time
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lista de Times</CardTitle>
          <CardDescription>
            {teams.length === 0
              ? "Nenhum time cadastrado"
              : `${teams.length} time${teams.length > 1 ? "s" : ""} cadastrado${teams.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum time encontrado.</p>
              <Link href="/dashboard/cadastros/times/new">
                <Button variant="outline" className="mt-4">
                  Criar primeiro time
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Logo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((t) => (
                  <ClickableTableRow key={t.id} href={`/dashboard/cadastros/times/${t.id}/edit`}>
                    <TableCell>
                      {t.logoUrl ? (
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={getPublicImageUrl(t.logoUrl)}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/cadastros/times/${t.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/cadastros/times/${t.id}/delete`}>
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
