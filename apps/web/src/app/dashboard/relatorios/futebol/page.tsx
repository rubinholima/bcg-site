"use client";

import Link from "next/link";
import { CalendarRange, ChevronRight, Hotel, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

const REPORT_OPTIONS = [
  {
    href: "/dashboard/relatorios/futebol/passageiros",
    title: "Relação de Passageiros",
    description: "Atletas, comissão e convidados para transporte — CPF, RG e nascimento.",
    icon: Users,
  },
  {
    href: "/dashboard/relatorios/futebol/hospedes",
    title: "Relação de Hóspedes",
    description: "Quartos, tipo de apartamento e ocupantes para check-in no hotel.",
    icon: Hotel,
  },
  {
    href: "/dashboard/relatorios/futebol/programacao-semanal",
    title: "Programação Semanal",
    description: "Grade por dia e categoria com treinos, jogos e compromissos.",
    icon: CalendarRange,
  },
] as const;

export default function FutebolRelatoriosIndexPage() {
  return (
    <FutebolRelatorioShell
      title="Relatórios — Futebol"
      description="Escolha o relatório que deseja gerar, visualizar ou imprimir."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block h-full">
              <Card className="h-full border-amber-500/20 transition-colors hover:border-amber-500/40 hover:bg-amber-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-amber-400" />
                    {item.title}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center text-sm font-medium text-amber-400 group-hover:text-amber-300">
                    Abrir relatório
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </FutebolRelatorioShell>
  );
}
