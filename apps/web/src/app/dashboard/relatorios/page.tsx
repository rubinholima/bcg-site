"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { BarChart3, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (hub === "adm") {
      router.replace("/dashboard/relatorios/adm");
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

  if (hub === "futebol" || hub === "adm") {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Redirecionando…</p>
      </div>
    );
  }

  if (hub === "saude") {
    return (
      <div className="space-y-6">
        <DashboardDeptHeader
          section={hubLabel ?? "Relatórios"}
          sectionIcon={BarChart3}
          title="Relatórios"
          description="Relatórios do Depto de Saúde — psicologia, elenco e indicadores."
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#6d28d9]" />
              Lista de atletas — Psicologia
            </CardTitle>
            <CardDescription>
              Filtre por clube e categoria, escolha as colunas (nome completo, apelido, data de
              nascimento, etc.) e imprima ou salve em PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/psicologia/relatorios/lista-atletas">
              <Button className="bg-[#5b21b6] text-white hover:bg-[#6d28d9]">
                Abrir relatório
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-500" />
              Relatórios — Fisioterapia
            </CardTitle>
            <CardDescription>
              Atendimentos por categoria e tipo, gráficos de incidência, lesionados ativos e carga por fisio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/saude/fisioterapia/relatorios">
              <Button variant="outline">Abrir relatórios de fisioterapia</Button>
            </Link>
          </CardContent>
        </Card>
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
