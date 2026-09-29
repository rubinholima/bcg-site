"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { MedicalTimelineItem } from "@/types/medical-encounter";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<MedicalTimelineItem["sourceType"], string> = {
  medical_encounter: "Atendimento médico",
  nursing_session: "Enfermaria",
  physio_session: "Fisioterapia",
  physio_transition: "Transição / RTP",
  medical_departure: "Saída do CT",
  physiology_clinical: "Fisiologia (clínico)",
};

function formatWhen(iso: string) {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function MedicalTimelineList({
  items,
  playerId,
}: {
  items: MedicalTimelineItem[];
  playerId: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhum registro na linha do tempo ainda.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const href =
          item.sourceType === "medical_encounter"
            ? `/dashboard/medico/prontuario/${playerId}/${item.sourceId}`
            : item.sourceType === "nursing_session"
              ? `/dashboard/saude/enfermaria/${item.sourceId}`
              : item.sourceType === "physio_session"
                ? `/dashboard/saude/fisioterapia/${item.sourceId}`
                : undefined;

        const inner = (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatWhen(item.occurredAt)}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  item.sourceType === "medical_encounter"
                    ? "bg-violet-500/15 text-violet-200"
                    : "bg-zinc-800 text-zinc-300",
                )}
              >
                {SOURCE_LABEL[item.sourceType]}
                {item.readOnly ? " · leitura" : ""}
              </span>
            </div>
            <p className="mt-1 font-medium text-foreground">{item.title}</p>
            {item.summary ? (
              <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
            ) : null}
          </>
        );

        return (
          <li
            key={item.id}
            className="rounded-lg border border-border/80 bg-card/40 p-3 sm:p-4"
          >
            {href ? (
              <Link href={href} className="block hover:opacity-90">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
