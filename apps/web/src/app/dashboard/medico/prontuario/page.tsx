"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Stethoscope } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MedicoFilters, type PlayerOption } from "../MedicoFilters";
import { isFootballKind } from "@/lib/home-data";

type Tenant = { id: string; name: string; kind?: { name?: string } };

export default function MedicoProntuarioListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const tenantId = searchParams.get("tenantId") ?? undefined;

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("medico")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    if (!canAccessModule("medico") || authLoading) return;
    const params = new URLSearchParams();
    if (tenantId) params.set("tenantId", tenantId);
    setLoading(true);
    api
      .get<PlayerOption[]>(`/players?${params.toString()}`)
      .then(({ data }) => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading, tenantId]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const clubs = (Array.isArray(data) ? data : []).filter((t) =>
        isFootballKind(t.kind?.name ?? ""),
      );
      if (!tenantId && clubs[0]?.id) {
        router.replace(`/dashboard/medico/prontuario?tenantId=${clubs[0].id}`);
      }
    });
  }, [tenantId, router]);

  if (authLoading || !canAccessModule("medico")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard/medico"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Médico
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Stethoscope className="h-7 w-7 text-violet-400" />
          Prontuário
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selecionar atleta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MedicoFilters
            basePath="/dashboard/medico/prontuario"
            players={players}
            selectedPlayerId=""
            onSelectPlayer={(id) => {
              if (id) router.push(`/dashboard/medico/prontuario/${id}`);
            }}
          />
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
