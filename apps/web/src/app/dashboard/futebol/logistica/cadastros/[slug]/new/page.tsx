import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogisticaCadastroFormClient } from "../../LogisticaCadastroFormClient";
import { LogisticaCadastroTenantFilter } from "../../LogisticaCadastroTenantFilter";
import { assertLogisticaCadastroResource, toLogisticaCadastroResourceClient } from "@/lib/logistica-cadastros.config";

export default async function LogisticaCadastroNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  let resource;
  try {
    resource = assertLogisticaCadastroResource(slug);
  } catch {
    notFound();
  }

  const tenantId = sp.tenantId ?? "";

  return (
    <div className="space-y-6">
      {resource.requiresTenant && (
        <Suspense fallback={null}>
          <LogisticaCadastroTenantFilter />
        </Suspense>
      )}
      <LogisticaCadastroFormClient
        resource={toLogisticaCadastroResourceClient(resource)}
        mode="create"
        tenantId={tenantId || undefined}
      />
    </div>
  );
}
