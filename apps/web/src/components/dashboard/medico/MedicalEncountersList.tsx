"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api";
import type { MedicalEncounter } from "@/types/medical-encounter";

export function MedicalEncountersList({ playerId }: { playerId: string }) {
  const [rows, setRows] = useState<MedicalEncounter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<MedicalEncounter[]>(`/medical-encounters?playerId=${playerId}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum atendimento médico registrado.</p>;
  }

  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/dashboard/medico/prontuario/${playerId}/${r.id}`}
            className="block rounded-lg border border-border/80 p-3 hover:bg-muted/20"
          >
            <p className="font-medium">
              {format(new Date(r.occurredAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              {r.diagnosis ? ` — ${r.diagnosis}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {r.physicianName ?? "Médico"}
              {r.originEncounterId ? " · follow-up" : ""}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
