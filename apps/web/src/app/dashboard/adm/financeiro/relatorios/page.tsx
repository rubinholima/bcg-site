"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

export default function FinanceiroRelatoriosPage() {
  const { tenantId } = useFinanceiroTenant();
  if (!tenantId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Relatórios</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Relatórios dinâmicos e exportação entram na Fase 2. O modelo já suporta filtros por empresa,
        conta, categoria, origem, competência e datas.
      </CardContent>
    </Card>
  );
}
