"use client";

import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import {
  DashboardDeptHeader,
  DashboardDeptShell,
} from "@/components/dashboard/DashboardDeptHeader";
import { DashboardPageHelpButton } from "@/components/dashboard/DashboardPageHelpButton";
import { LogisticaConvocacaoForm } from "@/components/dashboard/futebol/logistica/LogisticaConvocacaoForm";
import { LogisticaConvocacaoHelpContent } from "@/components/dashboard/futebol/logistica/LogisticaConvocacaoHelpContent";

export default function LogisticaConvocacaoPage() {
  return (
    <DashboardDeptShell>
      <DashboardDeptHeader
        section="Futebol — Logística"
        sectionIcon={ClipboardCheck}
        title="Convocação"
        backHref="/dashboard/futebol/logistica"
        aside={
          <DashboardPageHelpButton title="Ajuda — Convocação">
            <LogisticaConvocacaoHelpContent />
          </DashboardPageHelpButton>
        }
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <LogisticaConvocacaoForm />
      </Suspense>
    </DashboardDeptShell>
  );
}
