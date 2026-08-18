"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NursingSessionForm } from "@/components/dashboard/enfermaria/NursingSessionForm";
import { isFootballKind } from "@/lib/home-data";

type Tenant = { id: string; name: string; categories?: string[] | null; kind?: { name?: string } };

export default function EditarAtendimentoEnfermariaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) router.replace("/403");
  }, [authLoading, canAccessModule, router]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      setTenants((Array.isArray(data) ? data : []).filter((t) => isFootballKind(t.kind?.name ?? "")));
    });
  }, []);

  if (authLoading || !canAccessModule("saude") || !id) {
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
          href={`/dashboard/saude/enfermaria/${id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao atendimento
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Editar atendimento</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro de enfermaria</CardTitle>
        </CardHeader>
        <CardContent>
          <NursingSessionForm
            tenants={tenants}
            sessionId={id}
            onSaved={(sessionId) => router.push(`/dashboard/saude/enfermaria/${sessionId}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
