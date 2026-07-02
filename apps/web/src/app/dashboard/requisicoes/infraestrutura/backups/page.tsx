"use client";

import InfraAssetLinksPage from "@/components/dashboard/infraestrutura/InfraAssetLinksPage";

export default function InfraBackupsPage() {
  return (
    <InfraAssetLinksPage
      title="Backups"
      description="RouterOS, Windows, Linux, Docker e configs — registrados na ficha técnica do patrimônio."
      actionLabel="Gerenciar backups"
    />
  );
}
