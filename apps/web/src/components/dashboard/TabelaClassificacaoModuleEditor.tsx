"use client";

import Link from "next/link";
import type { HomeContentBlock } from "@/types/home-content";

export function TabelaClassificacaoModuleEditor({ block }: { block: HomeContentBlock }) {
  const rows = (block.config?.tabelaManualRows as object[] | undefined) ?? [];
  const rowCount = rows.length;

  return (
    <details className="rounded-lg border border-border bg-muted/20 sm:col-span-2">
      <summary className="cursor-pointer px-3 py-2 font-medium">Tabela Classificação</summary>
      <div className="border-t border-border px-3 py-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          A classificação é calculada automaticamente a partir dos jogos finalizados na FMF. Se ainda não
          houver jogos na categoria, a ordem segue a tabela oficial da federação.
        </p>
        <p className="text-xs text-muted-foreground">
          Para atualizar jogos e a tabela no site:{" "}
          <Link
            href="/dashboard/ferramentas/fmf-scraper"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Ferramentas → Importação FMF
          </Link>
          {" "}→ importar da FMF e <strong>Aplicar no site</strong> no clube (Boston City FC Brasil ou Villa
          Nova).
        </p>
        {rowCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            {rowCount} linhas no módulo. Filtros por categoria e temporada aparecem na barra abaixo da
            tabela.
          </p>
        ) : (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Nenhuma linha ainda — aplique a importação FMF no clube para preencher este módulo.
          </p>
        )}
      </div>
    </details>
  );
}
