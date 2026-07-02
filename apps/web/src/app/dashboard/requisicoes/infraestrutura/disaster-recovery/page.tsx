"use client";

import InfraAssetLinksPage from "@/components/dashboard/infraestrutura/InfraAssetLinksPage";

export default function InfraDisasterRecoveryPage() {
  return (
    <InfraAssetLinksPage
      title="Disaster Recovery"
      description="Plano de recuperação, checklist e procedimentos por equipamento patrimonial."
      actionLabel="Plano DR"
    />
  );
}
