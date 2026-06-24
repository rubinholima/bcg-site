"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConsultasCalendar } from "@/components/dashboard/ConsultasCalendar";

export function AgendaHubConsultasPanel() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Calendário de consultas psicológicas. Agende sessões, filtros e histórico na gestão completa.
        </p>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/dashboard/consultas">
            <ExternalLink className="h-4 w-4" />
            Gestão completa de consultas
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <ConsultasCalendar />
        </CardContent>
      </Card>
    </div>
  );
}
