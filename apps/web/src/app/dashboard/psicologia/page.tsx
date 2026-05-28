"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Brain, UserCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getPublicImageUrl } from "@/lib/media-url";
import { DASHBOARD_LABELS } from "@/lib/dashboard-labels";
import { PsicologiaFilters } from "./PsicologiaFilters";

interface Player {
  id: string;
  name: string;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  category?: string | null;
  tenantId: string;
  tenant?: { id: string; name: string; slug: string };
}

export default function PsicologiaListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canAccessModule("saude") && !authLoading) return;
    const tenantId = searchParams.get("tenantId") ?? undefined;
    const category = searchParams.get("category") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    setLoading(true);
    api
      .get<Player[]>(`/players?${params.toString()}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading, searchParams]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("saude")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6">
      <PsicologiaFilters />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {DASHBOARD_LABELS.atletas}
          </CardTitle>
          <CardDescription>
            Clique em um atleta para ver avaliações psicológicas e consultas. O calendário geral está em Psicologia → Consultas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando atletas...
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum atleta encontrado. Ajuste os filtros ou cadastre atletas em Futebol → {DASHBOARD_LABELS.atletas}.</p>
              <Link href="/dashboard/cadastros/jogadores">
                <Button variant="outline" className="mt-4">
                  Ir para {DASHBOARD_LABELS.atletas}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Foto</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Posição</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted shrink-0">
                          {p.photoUrl ? (
                            <img
                              src={getPublicImageUrl(p.photoUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                              <UserCircle className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {p.jerseyNumber ? `${p.jerseyNumber} – ` : ""}
                          {p.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.tenant?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.category ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.position ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/psicologia/${p.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1">
                            Avaliação / Consultas
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
