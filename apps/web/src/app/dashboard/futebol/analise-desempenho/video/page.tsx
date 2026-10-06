"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ANALISE_DESEMPENHO_BASE } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";

/** Rota legada — redireciona para sessões. */
export default function AnaliseDesempenhoVideoLegacyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  useEffect(() => {
    router.replace(`${ANALISE_DESEMPENHO_BASE}/sessoes${qs ? `?${qs}` : ""}`);
  }, [router, qs]);

  return null;
}
