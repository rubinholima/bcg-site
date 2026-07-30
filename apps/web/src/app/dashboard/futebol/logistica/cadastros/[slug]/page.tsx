import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogisticaCadastroListClient } from "../LogisticaCadastroListClient";
import { LogisticaCadastroTenantFilter } from "../LogisticaCadastroTenantFilter";
import { fetchLogisticaCadastroList } from "@/lib/logistica-cadastros";
import { assertLogisticaCadastroResource } from "@/lib/logistica-cadastros.config";

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
  const rows =
    resource.requiresTenant && !tenantId
      ? []
      : await fetchLogisticaCadastroList(resource.apiPath, {
          tenantId: resource.requiresTenant ? tenantId : undefined,
        });

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
          resource={resource}
          initialRows={rows}
          tenantId={tenantId || undefined}
          showSuccess={sp.success === "true"}
        />
      )}
    </div>
  );
}
