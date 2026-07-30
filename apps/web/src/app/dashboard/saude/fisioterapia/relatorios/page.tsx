"use client";

import Link from "next/link";
import { Activity, BarChart3, ClipboardList, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const REPORTS = [
  {
    href: "/dashboard/saude/fisioterapia/relatorios/atendimentos",
    title: "Atendimentos e gráficos",
    description:
      "Volume por categoria, tipo (individual vs recovery), região corporal, diagnóstico, tratamento e evolução mensal.",
    icon: BarChart3,
  },
  {
    href: "/dashboard/saude/fisioterapia/relatorios/lesionados-ativos",
    title: "Lesionados em tratamento",
    description:
      "Lista operacional de atletas com tratamento ativo — regiões, diagnósticos, previsão de alta. Imprimível.",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/saude/fisioterapia/relatorios/carga-fisio",
    title: "Carga por fisioterapeuta",
    description: "Atendimentos individuais e sessões de recovery registrados por profissional no período.",
    icon: Users,
  },
];

export default function FisioterapiaRelatoriosHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/saude/fisioterapia"
          className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← Atendimentos
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <BarChart3 className="h-8 w-8" />
          Relatórios — Fisioterapia
        </h1>
        <p className="mt-1 text-muted-foreground">
          Indicadores clínicos e operacionais para acompanhamento da equipe de fisioterapia.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.href} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <r.icon className="h-5 w-5 text-primary" />
                {r.title}
              </CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <Link href={r.href}>
                <Button className="min-h-[44px] w-full sm:w-auto">Abrir relatório</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Outros relatórios úteis (referência)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• <strong>Incidência por região/diagnóstico</strong> — incluída no relatório de atendimentos (mapa de calor de lesões).</p>
          <p>• <strong>Tempo médio de retorno</strong> — dias entre início e alta por categoria (indicador no painel).</p>
          <p>• <strong>Recovery pós-jogo</strong> — participação por categoria e data (gráfico individual vs grupo).</p>
          <p>• <strong>Evolução da dor (EVA)</strong> — média de dor registrada nos atendimentos do período.</p>
        </CardContent>
      </Card>
    </div>
  );
}
