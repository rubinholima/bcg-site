import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SyncPlayersButton } from "./SyncPlayersButton";
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
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { JogadoresFilters } from "./JogadoresFilters";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
  status?: string | null;
  marketValue?: number | null;
}

async function getPlayers(params: { tenantId?: string; category?: string; search?: string }): Promise<Player[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params.category) searchParams.set("category", params.category);
    if (params.search) searchParams.set("search", params.search);
    const { data } = await api.get<Player[]>(`/players?${searchParams.toString()}`);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function JogadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; tenantId?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const players = await getPlayers({
    tenantId: params.tenantId,
    category: params.category,
    search: params.search,
  });
  const showSuccess = params.success === "true";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center gap-2 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{DASHBOARD_LABELS.atletas}</h1>
          <p className="text-muted-foreground">
            Gerencie os atletas por clube e categoria (dados base, médico, avaliações, desempenho)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <SyncPlayersButton />
          <Link href="/dashboard/cadastros/jogadores/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Atleta
            </Button>
          </Link>
        </div>
      </div>

      <JogadoresFilters />

      <Card>
        <CardHeader>
          <CardTitle>Lista de {DASHBOARD_LABELS.atletas}</CardTitle>
          <CardDescription>
            {players.length === 0
              ? "Nenhum atleta cadastrado"
              : `${players.length} atleta${players.length > 1 ? "s" : ""} cadastrado${players.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum atleta encontrado.</p>
              <Link href="/dashboard/cadastros/jogadores/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar primeiro atleta
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Foto</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nº</TableHead>
                  <TableHead>Posição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Clube</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((p) => (
                  <ClickableTableRow key={p.id} href={`/dashboard/cadastros/jogadores/${p.id}/edit`}>
                    <TableCell>
                      {p.photoUrl ? (
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex items-center justify-center">
                          <img
                            src={getPublicImageUrl(p.photoUrl)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.jerseyNumber ?? "—"}</TableCell>
                    <TableCell>{p.position ?? "—"}</TableCell>
                    <TableCell>{p.category ?? "—"}</TableCell>
                    <TableCell>{p.tenant?.name ?? p.tenantId}</TableCell>
                    <TableCell>{p.status ?? "available"}</TableCell>
                    <TableRowActions>
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/cadastros/jogadores/${p.id}/edit`}>
                          <Button variant="ghost" size="icon" aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/dashboard/cadastros/jogadores/${p.id}/delete`}>
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
