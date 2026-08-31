"use client";

import Link from "next/link";
import { ChevronRight, FileBarChart, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RelatorioAdmDeptShell } from "@/components/dashboard/adm/relatorios/RelatorioAdmDeptShell";

const REPORT_OPTIONS = [
  {
    href: "/dashboard/relatorios/adm/dinamicos",
    title: "Relatórios dinâmicos",
    icon: FileBarChart,
  },
  {
    href: "/dashboard/relatorios/adm/estoque-compras",
    title: "Estoque e Compras",
    icon: Package,
  },
] as const;

export default function AdmRelatoriosHubPage() {
  return (
    <RelatorioAdmDeptShell title="Relatórios">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_OPTIONS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group block h-full">
              <Card className="h-full border-zinc-800 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="h-5 w-5 text-emerald-500" />
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="inline-flex items-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Abrir
                    <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </RelatorioAdmDeptShell>
  );
}
