"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NegotiationForm } from "@/components/dashboard/players/NegotiationForm";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { JogadoresSubNav } from "../../../JogadoresSubNav";
import { negociadosListHref } from "@/lib/player-negotiation-navigation";

export default function EditarNegociacaoPage() {
  const router = useRouter();
  const params = useParams();
  const negotiationId = typeof params.id === "string" ? params.id : "";

  return (
    <Cup360PageShell>
      <JogadoresSubNav active="/dashboard/cadastros/jogadores/negociados" />
      <Link
        href={negociadosListHref()}
        className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Atletas negociados
      </Link>
      {negotiationId ? (
        <NegotiationForm
          mode="edit"
          negotiationId={negotiationId}
          onCancel={() => router.push(negociadosListHref())}
          onSaved={() => undefined}
        />
      ) : (
        <p className="text-sm text-destructive">Negociação inválida.</p>
      )}
    </Cup360PageShell>
  );
}
