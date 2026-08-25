"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { TreinadoresInformacoesTab } from "@/components/dashboard/futebol/treinadores/TreinadoresInformacoesTab";
import { TreinadoresShell } from "@/components/dashboard/futebol/treinadores/TreinadoresShell";

export default function TreinadoresInformacoesPage() {
  return (
    <TreinadoresShell title="Informações">
      <TreinadoresContextPanel>
        {({ tenantId, category, context, contextLoading, loadError, refreshContext }) => (
          <TreinadoresInformacoesTab
            tenantId={tenantId}
            category={category}
            loading={contextLoading}
            loadError={loadError}
            context={context}
            onRefresh={refreshContext}
          />
        )}
      </TreinadoresContextPanel>
    </TreinadoresShell>
  );
}
