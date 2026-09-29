"use client";

import Link from "next/link";
import { PrepFisicaContextPanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaContextPanel";
import { PrepFisicaHubKpis } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaHubKpis";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";
import { PREP_FISICA_NAV } from "@/components/dashboard/futebol/prep-fisica/prep-fisica-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PreparacaoFisicaHubPage() {
  return (
    <PrepFisicaShell title="Preparação física">
      <PrepFisicaContextPanel>
        {({ tenantId, category }) => (
          <div className="space-y-6">
            <PrepFisicaHubKpis tenantId={tenantId} category={category} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PREP_FISICA_NAV.filter((n) => !n.exact).map((item) => (
                <Link key={item.href} href={item.href}>
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader>
                      <CardTitle className="text-base">{item.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">Abrir</CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </PrepFisicaContextPanel>
    </PrepFisicaShell>
  );
}
