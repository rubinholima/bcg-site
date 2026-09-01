"use client";

import Link from "next/link";
import { FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicReportsForm } from "@/components/dashboard/adm/relatorios/DynamicReportsForm";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";

export default function FutebolDynamicReportsPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Relatórios dinâmicos"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
      accessModules={["relatorios_futebol"]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/relatorios/futebol">
            <Button variant="ghost" size="sm">
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-emerald-600" />
            <h1 className="text-xl font-semibold">Relatórios dinâmicos</h1>
          </div>
        </div>
        <DynamicReportsForm />
      </div>
    </RelatorioFutebolDeptShell>
  );
}
