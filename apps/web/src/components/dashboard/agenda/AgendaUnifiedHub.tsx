"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { UnifiedAgendaView } from "@/components/dashboard/agenda/UnifiedAgendaView";
import { agendaHubUrl, AGENDA_VISAO, parseAgendaVisao } from "@/lib/agenda-hub";

function AgendaVisaoRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visao = searchParams.get("visao");

  useEffect(() => {
    if (!visao || visao === AGENDA_VISAO.GERAL) return;
    const target = agendaHubUrl(parseAgendaVisao(visao));
    if (target !== "/dashboard/agenda") router.replace(target);
  }, [router, visao]);

  return <UnifiedAgendaView />;
}

export function AgendaUnifiedHub() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AgendaVisaoRedirect />
    </Suspense>
  );
}
