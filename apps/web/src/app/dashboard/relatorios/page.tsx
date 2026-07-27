"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";

const HUB_LABELS: Record<string, string> = {
  grupo_master: "Grupo Master",
  cadastros: "Cadastros",
  adm: "Depto Adm",
  saude: "Depto de Saúde",
  futebol: "Depto Futebol",
  juridico: "Depto Jurídico",
  eventos: "Depto de Eventos",
  marketing: "Depto de Mkt",
  socio_torcedor: "Sócio Torcedor",
};

function RelatoriosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hub = searchParams.get("hub");
  const { canAccessModule, loading } = useAuth();

  useEffect(() => {
    if (hub === "futebol") {
      router.replace("/dashboard/relatorios/futebol");
    }
  }, [hub, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!hub) {
    router.replace("/403");
    return null;
  }

  if (!canAccessModule(`relatorios_${hub}`)) {
    router.replace("/403");
    return null;
  }

  const hubLabel = hub ? HUB_LABELS[hub] ?? hub : null;

  if (hub === "futebol") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Redirecionando…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardDeptHeader
        section={hubLabel ?? "Relatórios"}
        sectionIcon={BarChart3}
        title="Relatórios"
        description={
          hubLabel
            ? `Indicadores e relatórios do hub ${hubLabel}`
            : "Relatórios consolidados — acesse pelo menu de cada departamento"
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {hubLabel ? `Relatórios — ${hubLabel}` : "Relatórios"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Em breve: relatórios específicos por hub. Cada departamento terá seus próprios indicadores nesta
            mesma rota, filtrada pelo hub de origem.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RelatoriosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <RelatoriosContent />
    </Suspense>
  );
}
