import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { JogadoresFilters } from "./JogadoresFilters";
import { JogadoresGroupedList } from "./JogadoresGroupedList";
import { JogadoresLoanedSection } from "./JogadoresLoanedSection";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string; logoUrl?: string | null };
  status?: string | null;
  registrationProfile?: unknown;
}

async function getPlayers(params: {
  tenantId?: string;
  category?: string;
  position?: string;
  search?: string;
  situation?: string;
  availability?: string;
  archived?: boolean;
}): Promise<Player[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
    if (params.category) searchParams.set("category", params.category);
    if (params.position) searchParams.set("position", params.position);
    if (params.search) searchParams.set("search", params.search);
    if (params.situation) searchParams.set("situation", params.situation);
    if (params.availability) searchParams.set("availability", params.availability);
    if (params.archived) searchParams.set("archived", "1");
    const { data } = await api.get<Player[]>(`/players?${searchParams.toString()}`);
    return data ?? [];
  } catch {
    return [];
  }
}

async function getLoanedPlayers(params: {
  tenantId?: string;
  search?: string;
}): Promise<Player[]> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("loaned", "1");
    if (params.tenantId) searchParams.set("tenantId", params.tenantId);
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
    situation?: string;
    availability?: string;
  }>;
}) {
  const params = await searchParams;
  const [players, loanedPlayers] = await Promise.all([
    getPlayers({
      tenantId: params.tenantId,
      category: params.category,
      position: params.position,
      search: params.search,
      situation: params.situation,
      availability: params.availability,
    }),
    getLoanedPlayers({
      tenantId: params.tenantId,
      search: params.search,
    }),
  ]);
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
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/cadastros/jogadores/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Atleta
            </Button>
          </Link>
        </div>
      <JogadoresFilters />

      <Card>
        <CardHeader>
          <CardTitle>Lista de {DASHBOARD_LABELS.atletas}</CardTitle>
          <CardDescription>
            {players.length === 0
              ? "Nenhum atleta cadastrado"
              : groupByTeam && distinctTeams > 1
                ? `${players.length} atleta${players.length > 1 ? "s" : ""} em ${distinctTeams} clubes — por time, categoria e posição`
                : `${players.length} atleta${players.length > 1 ? "s" : ""} — por posição (apelido)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <JogadoresLoanedSection players={loanedPlayers} />
        </CardContent>
      </Card>
    </div>
  );
}
