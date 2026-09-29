import { Suspense } from "react";
import { NegociadosWorkspace } from "./NegociadosWorkspace";

export default function JogadoresNegociadosPage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-muted-foreground">Carregando…</div>}
    >
      <NegociadosWorkspace />
    </Suspense>
  );
}
