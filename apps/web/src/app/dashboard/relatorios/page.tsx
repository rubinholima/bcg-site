"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!canAccessModule("relatorios")) {
    router.replace("/403");
    return null;
  }

  const hubLabel = hub ? HUB_LABELS[hub] ?? hub : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            {hubLabel
              ? `Indicadores e relatórios do hub ${hubLabel}`
              : "Relatórios consolidados — acesse pelo menu de cada departamento"}
          </p>
        </div>
      </div>

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
