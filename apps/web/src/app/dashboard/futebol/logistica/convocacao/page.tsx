import { Suspense } from "react";
import { LogisticaConvocacaoForm } from "@/components/dashboard/futebol/logistica/LogisticaConvocacaoForm";

export default function LogisticaConvocacaoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
      <LogisticaConvocacaoForm />
    </Suspense>
  );
}
