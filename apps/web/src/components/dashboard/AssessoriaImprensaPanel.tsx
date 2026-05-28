"use client";

import { Camera, KeyRound } from "lucide-react";
import { TenantPressCard } from "@/components/dashboard/TenantPressCard";
import { ImprensaPageAccessCodes } from "@/components/dashboard/ImprensaPageAccessCodes";
import { ImprensaPressReleasesEditor } from "@/components/dashboard/ImprensaPressReleasesEditor";
import { ImprensaJornalistasCard } from "@/components/dashboard/ImprensaJornalistasCard";
import { AssessoriaCollapsible } from "@/components/dashboard/AssessoriaCollapsible";
import { getImprensaPageHref } from "@/lib/imprensa-display";

export function AssessoriaImprensaPanel({
  tenantId,
  clubSlug,
  clubName,
}: {
  tenantId: string;
  clubSlug: string;
  clubName: string;
}) {
  const imprensaPublicUrl = getImprensaPageHref(clubSlug);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Gerenciando <strong className="text-foreground">{clubName}</strong>
      </p>

      <ImprensaPressReleasesEditor tenantId={tenantId} />

      <div className="grid gap-5 xl:grid-cols-2">
        <ImprensaJornalistasCard tenantId={tenantId} />

        <AssessoriaCollapsible
          title="Códigos de acesso"
          description={`Página protegida — ${imprensaPublicUrl}`}
          icon={KeyRound}
          borderClassName="border-sky-500/20"
        >
          <ImprensaPageAccessCodes tenantId={tenantId} />
        </AssessoriaCollapsible>
      </div>

      <AssessoriaCollapsible
        title="Fotos de jogos e links"
        description="Upload oficial, link para fotógrafos e galeria para jornalistas."
        icon={Camera}
        borderClassName="border-violet-500/20"
      >
        <TenantPressCard tenantId={tenantId} clubSlug={clubSlug} embedded />
      </AssessoriaCollapsible>
    </div>
  );
}
