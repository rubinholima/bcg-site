"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  ChevronRight,
  ClipboardList,
  HeartPulse,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioSaudeDeptShell } from "@/components/dashboard/saude/relatorios/RelatorioSaudeDeptShell";

const REPORT_OPTIONS = [
  {
    href: "/dashboard/relatorios/saude/lista-atletas",
    title: "Lista de atletas — Psicologia",
    icon: Users,
  },
  {
    href: "/dashboard/relatorios/saude/fisioterapia-atendimentos",
    title: "Fisioterapia — Atendimentos",
    icon: BarChart3,
  },
  {
    href: "/dashboard/relatorios/saude/fisioterapia-lesionados",
    title: "Fisioterapia — Lesionados",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/relatorios/saude/fisioterapia-carga",
    title: "Fisioterapia — Carga por fisio",
    icon: Activity,
  },
  {
    href: "/dashboard/relatorios/saude/enfermaria",
    title: "Enfermaria — Atendimentos",
    icon: HeartPulse,
  },
] as const;

export default function SaudeRelatoriosHubPage() {
  return (
    <RelatorioSaudeDeptShell title="Relatórios">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block h-full">
              <Card className="h-full border-zinc-800 transition-colors hover:border-violet-500/40 hover:bg-violet-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-violet-500" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center text-sm font-medium text-violet-600 dark:text-violet-400">
                    Abrir
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </RelatorioSaudeDeptShell>
  );
}
