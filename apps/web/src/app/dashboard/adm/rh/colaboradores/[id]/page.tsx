"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";

type UnifiedProfile = {
  employee: {
    id: string;
    name: string;
    code?: string | null;
    cpf?: string | null;
    email?: string | null;
    type: string;
    tenant?: { name?: string };
    player?: { name?: string; category?: string | null } | null;
    employments?: Array<{
      id: string;
      status: string;
      contractType: string;
      startDate: string;
      tenant?: { name?: string };
      jobRole?: { name?: string };
    }>;
  };
  documents: Array<{ id: string; documentType: string; createdAt: string }>;
  hiringRequests: Array<{ id: string; status: string; contractType: string }>;
};

export default function RhColaboradorUnifiedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [data, setData] = useState<UnifiedProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canAccessModule("adm_rh") || !id) return;
    setLoading(true);
    api
      .get<UnifiedProfile>(`/rh/employees/${id}/unified-profile`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [canAccessModule, id]);

  if (authLoading) {
    return <p className="text-muted-foreground py-8 text-center">Carregando…</p>;
  }

  if (!canAccessModule("adm_rh")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" asChild className="min-h-[44px]">
        <Link href="/dashboard/adm/rh">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao RH
        </Link>
      </Button>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground">Colaborador não encontrado.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{data.employee.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Matrícula:</span> {data.employee.code ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">CPF:</span> {data.employee.cpf ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">E-mail:</span> {data.employee.email ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Empresa:</span> {data.employee.tenant?.name ?? "—"}
              </p>
              {data.employee.player && (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Atleta vinculado:</span>{" "}
                  {data.employee.player.name}
                  {data.employee.player.category ? ` (${data.employee.player.category})` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vínculos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.employee.employments ?? []).length === 0 ? (
                <p className="text-muted-foreground">Nenhum vínculo.</p>
              ) : (
                data.employee.employments!.map((e) => (
                  <div key={e.id} className="border border-border rounded-md p-3">
                    <p className="font-medium">{e.jobRole?.name ?? "Cargo"} · {e.contractType}</p>
                    <p className="text-muted-foreground">
                      {e.tenant?.name} — desde {formatDateDayMonYear(e.startDate)} — {e.status}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {data.documents.length === 0 ? (
                <p className="text-muted-foreground">Sem documentos cadastrados.</p>
              ) : (
                data.documents.map((d) => (
                  <p key={d.id}>
                    {d.documentType} — {formatDateDayMonYear(d.createdAt)}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {data.hiringRequests.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma solicitação ligada.</p>
              ) : (
                data.hiringRequests.map((h) => (
                  <p key={h.id}>
                    {h.contractType} — {h.status}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
