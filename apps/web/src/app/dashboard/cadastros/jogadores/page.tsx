import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { JogadoresFilters } from "./JogadoresFilters";
import { JogadoresGroupedList } from "./JogadoresGroupedList";
import { SyncPlayersButton } from "./SyncPlayersButton";

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
}

async function getPlayers(params: {
  tenantId?: string;
  category?: string;
  position?: string;
  search?: string;
}): Promise<Player[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params.category) searchParams.set("category", params.category);
    if (params.position) searchParams.set("position", params.position);
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
  searchParams: Promise<{
    success?: string;
    tenantId?: string;
    category?: string;
    position?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const players = await getPlayers({
    tenantId: params.tenantId,
    category: params.category,
    position: params.position,
    search: params.search,
  });
  const showSuccess = params.success === "true";
  const groupByTeam = !params.tenantId;
  const distinctTeams = new Set(players.map((p) => p.tenantId)).size;

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-500">
          <span>Operação realizada com sucesso!</span>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{DASHBOARD_LABELS.atletas}</h1>
          <p className="text-muted-foreground">
            Gerencie os atletas por clube e categoria — clique na linha para abrir o cadastro
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
              : groupByTeam && distinctTeams > 1
                ? `${players.length} atleta${players.length > 1 ? "s" : ""} em ${distinctTeams} clubes — agrupado por time e categoria`
                : `${players.length} atleta${players.length > 1 ? "s" : ""} — agrupado por categoria`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhum atleta encontrado.</p>
              <Link href="/dashboard/cadastros/jogadores/new">
                <Button variant="outline" className="mt-4">
                  Cadastrar primeiro atleta
                </Button>
              </Link>
            </div>
          ) : (
            <JogadoresGroupedList players={players} groupByTeam={groupByTeam && distinctTeams > 1} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
