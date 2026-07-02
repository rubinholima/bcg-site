"use client";

import InfraAssetLinksPage from "@/components/dashboard/infraestrutura/InfraAssetLinksPage";

export default function InfraCredenciaisPage() {
  return (
    <InfraAssetLinksPage
      title="Credenciais por equipamento"
      description="Senhas criptografadas, auditoria de visualização e cópia — na ficha de cada patrimônio."
      actionLabel="Abrir credenciais"
    />
  );
}
