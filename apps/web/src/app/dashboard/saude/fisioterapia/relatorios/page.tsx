"use client";

import Link from "next/link";
import { BarChart3, ChevronRight, ClipboardList, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FisioterapiaRelatorioShell } from "@/components/dashboard/fisioterapia/relatorios/FisioterapiaRelatorioShell";

const REPORT_OPTIONS = [
  {
    href: "/dashboard/saude/fisioterapia/relatorios/atendimentos",
    title: "Atendimentos",
    icon: BarChart3,
  },
  {
    href: "/dashboard/saude/fisioterapia/relatorios/lesionados-ativos",
    title: "Lesionados em tratamento",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/saude/fisioterapia/relatorios/carga-fisio",
    title: "Carga por fisioterapeuta",
    icon: Users,
  },
] as const;

export default function FisioterapiaRelatoriosHubPage() {
  return (
    <FisioterapiaRelatorioShell
      title="Relatórios"
      backHref="/dashboard/saude/fisioterapia"
      backLabel="Atendimentos"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block h-full">
              <Card className="h-full border-zinc-800 transition-colors hover:border-[#C8102E]/40 hover:bg-[#C8102E]/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-[#C8102E]" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center text-sm font-medium text-[#C8102E]">
                    Abrir
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </FisioterapiaRelatorioShell>
  );
}
