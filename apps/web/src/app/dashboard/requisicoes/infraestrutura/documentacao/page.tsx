"use client";

import InfraAssetLinksPage from "@/components/dashboard/infraestrutura/InfraAssetLinksPage";

export default function InfraDocumentacaoPage() {
  return (
    <InfraAssetLinksPage
      title="Documentação técnica"
      description="PDF, RouterOS backup/export, diagramas e garantias — vinculados ao patrimônio."
      actionLabel="Gerenciar documentos"
    />
  );
}
