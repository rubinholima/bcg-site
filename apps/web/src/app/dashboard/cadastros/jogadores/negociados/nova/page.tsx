"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NegotiationForm } from "@/components/dashboard/players/NegotiationForm";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { JogadoresSubNav } from "../../JogadoresSubNav";
import { negociadosEditarHref, negociadosListHref } from "@/lib/player-negotiation-navigation";

function NovaNegociacaoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTenantId = searchParams.get("tenantId") ?? "";
  const initialPlayerId = searchParams.get("playerId") ?? "";

  return (
    <Cup360PageShell>
      <JogadoresSubNav active="/dashboard/cadastros/jogadores/negociados" />
      <Link
        href={negociadosListHref(defaultTenantId || undefined)}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Atletas negociados
      </Link>
      <p className="text-sm text-muted-foreground">
        Transferência, empréstimo ou direitos econômicos. O clube abaixo define o elenco — não
        depende do filtro da listagem.
      </p>
      <NegotiationForm
        mode="create"
        defaultTenantId={defaultTenantId}
        initialPlayerId={initialPlayerId}
        onCancel={() => router.push(negociadosListHref(defaultTenantId || undefined))}
        onSaved={(id) => {
          if (id) router.push(negociadosEditarHref(id));
          else router.push(negociadosListHref(defaultTenantId || undefined));
        }}
      />
    </Cup360PageShell>
  );
}

export default function NovaNegociacaoPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Carregando…</div>}>
      <NovaNegociacaoContent />
    </Suspense>
  );
}
