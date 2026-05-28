import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { JogadoresFilters } from "../JogadoresFilters";
import { JogadoresLoanedSection } from "../JogadoresLoanedSection";

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

export default async function JogadoresEmprestadosPage({
  searchParams,
}: {
  searchParams: Promise<{
    tenantId?: string;
    search?: string;
  }>;
}) {
  const params = await searchParams;
  const players = await getLoanedPlayers(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/cadastros/jogadores">
            <Button variant="ghost" size="icon" className="mt-1 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <Link href="/dashboard/cadastros/jogadores">
          <Button variant="outline">Voltar aos atletas</Button>
        </Link>
      </div>

      <JogadoresFilters loanedMode basePath="/dashboard/cadastros/jogadores/emprestados" />

      <Card>
        <CardHeader>
          <CardTitle>Empréstimos ativos</CardTitle>
          <CardDescription>
            {players.length === 0
              ? "Nenhum atleta emprestado"
              : `${players.length} atleta${players.length > 1 ? "s" : ""} emprestado${players.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JogadoresLoanedSection players={players} defaultOpen />
        </CardContent>
      </Card>
    </div>
  );
}
