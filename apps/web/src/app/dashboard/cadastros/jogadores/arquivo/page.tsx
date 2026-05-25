import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { JogadoresFilters } from "../JogadoresFilters";
import { JogadoresGroupedList } from "../JogadoresGroupedList";
import { JogadoresSubNav } from "../JogadoresSubNav";

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

async function getArchivedPlayers(params: {
  tenantId?: string;
  category?: string;
  position?: string;
  search?: string;
}): Promise<Player[]> {
  try {
    const searchParams = new URLSearchParams();
    searchParams.set("archived", "1");
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

export default async function JogadoresArquivoPage({
  searchParams,
}: {
  searchParams: Promise<{
    tenantId?: string;
    category?: string;
    position?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const players = await getArchivedPlayers(params);
  const groupByTeam = !params.tenantId;
  const distinctTeams = new Set(players.map((p) => p.tenantId)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/cadastros/jogadores">
            <Button variant="ghost" size="icon" className="mt-1 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Atletas desligados</h1>
            <p className="text-muted-foreground">
              Cadastro preservado — atletas com situação <strong>Desligado</strong>, fora da lista principal.
            </p>
          </div>
        </div>
        <Link href="/dashboard/cadastros/jogadores">
          <Button variant="outline">Voltar aos atletas</Button>
        </Link>
      </div>

      <JogadoresSubNav active="/dashboard/cadastros/jogadores/arquivo" />
      <JogadoresFilters archivedMode basePath="/dashboard/cadastros/jogadores/arquivo" />

      <Card>
        <CardHeader>
          <CardTitle>Atletas desligados</CardTitle>
          <CardDescription>
            {players.length === 0
              ? "Nenhum atleta desligado"
              : `${players.length} atleta${players.length > 1 ? "s" : ""} desligado${players.length > 1 ? "s" : ""}${
                  groupByTeam && distinctTeams > 1 ? ` em ${distinctTeams} clubes` : ""
                }`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {players.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhum atleta desligado encontrado.</p>
              <p className="mt-2 text-sm">
                Altere a situação para &quot;Desligado&quot; no cadastro do atleta para movê-lo para esta lista.
              </p>
            </div>
          ) : (
            <JogadoresGroupedList players={players} groupByTeam={groupByTeam && distinctTeams > 1} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
