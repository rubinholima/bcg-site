import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogisticaCadastroListClient } from "../LogisticaCadastroListClient";
import { LogisticaCadastroTenantFilter } from "../LogisticaCadastroTenantFilter";
import { fetchLogisticaCadastroList } from "@/lib/logistica-cadastros";
import { assertLogisticaCadastroResource, toLogisticaCadastroResourceClient } from "@/lib/logistica-cadastros.config";

export default async function LogisticaCadastroListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; tenantId?: string }>;
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
  let rows: Awaited<ReturnType<typeof fetchLogisticaCadastroList>> = [];
  let loadError: string | null = null;

  if (!(resource.requiresTenant && !tenantId)) {
    try {
      rows = await fetchLogisticaCadastroList(resource.apiPath, {
        tenantId: resource.requiresTenant ? tenantId : undefined,
      });
    } catch (err) {
      loadError = err instanceof Error ? err.message : "Erro ao carregar registros";
    }
  }

  const resourceClient = toLogisticaCadastroResourceClient(resource);

  return (
    <div className="space-y-6">
      {resource.requiresTenant && (
        <Suspense fallback={null}>
          <LogisticaCadastroTenantFilter />
        </Suspense>
      )}
      {resource.requiresTenant && !tenantId ? (
        <p className="text-muted-foreground text-sm">
          Selecione um clube para listar as pessoas autorizadas cadastradas.
        </p>
      ) : (
        <LogisticaCadastroListClient
          resource={resourceClient}
          initialRows={rows}
          tenantId={tenantId || undefined}
          showSuccess={sp.success === "true"}
          loadError={loadError}
        />
      )}
    </div>
  );
}
