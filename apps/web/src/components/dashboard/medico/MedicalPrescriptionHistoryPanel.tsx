"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Printer } from "lucide-react";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import type { MedicalPrescriptionHistoryItem } from "@/types/medical-encounter";
import { issueAndPrintMedicalPrescription } from "@/lib/medical-prescription-print";

export function MedicalPrescriptionHistoryPanel({ playerId }: { playerId: string }) {
  const [items, setItems] = useState<MedicalPrescriptionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MedicalPrescriptionHistoryItem[]>(
        `/medical-encounters/prescriptions-history/${playerId}`,
      )
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [playerId]);

  const handlePrint = async (encounterId: string) => {
    await issueAndPrintMedicalPrescription(encounterId);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma prescrição registrada.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((row) => (
        <li key={row.encounterId} className="rounded-lg border border-border/80 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <Link
                href={`/dashboard/medico/prontuario/${playerId}/${row.encounterId}`}
                className="font-medium hover:text-violet-300"
              >
                {format(new Date(row.occurredAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </Link>
              <p className="text-xs text-muted-foreground">
                {row.physicianName ?? "Médico"}
                {row.diagnosis ? ` · ${row.diagnosis}` : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9"
              onClick={() => void handlePrint(row.encounterId)}
            >
              <Printer className="mr-1 h-4 w-4" />
              Imprimir
            </Button>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {row.prescriptions.map((p, i) => (
              <li key={i}>
                {p.medication}
                {[p.dose, p.frequency].filter(Boolean).length
                  ? ` — ${[p.dose, p.frequency].filter(Boolean).join(" · ")}`
                  : ""}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
