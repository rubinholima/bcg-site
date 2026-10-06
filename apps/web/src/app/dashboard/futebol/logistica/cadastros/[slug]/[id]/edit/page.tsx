import { notFound } from "next/navigation";
import { LogisticaCadastroFormClient } from "../../../LogisticaCadastroFormClient";
import { UniformKitFormClient, type UniformKitDetail } from "../../../UniformKitFormClient";
import { fetchLogisticaCadastroOne } from "@/lib/logistica-cadastros";
import { assertLogisticaCadastroResource, toLogisticaCadastroResourceClient } from "@/lib/logistica-cadastros.config";

export default async function LogisticaCadastroEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { slug, id } = await params;
  const sp = await searchParams;
  let resource;
  try {
    resource = assertLogisticaCadastroResource(slug);
  } catch {
    notFound();
  }

  const initial = await fetchLogisticaCadastroOne(resource.apiPath, id);
  if (!initial) notFound();

  if (slug === "kits-uniforme") {
    return (
      <UniformKitFormClient
        mode="edit"
        initial={initial as UniformKitDetail}
        tenantIdFromQuery={sp.tenantId ?? initial.tenantId ?? undefined}
      />
    );
  }

  if (initial.isSystem) notFound();

  return (
    <LogisticaCadastroFormClient
      resource={toLogisticaCadastroResourceClient(resource)}
      mode="edit"
      initial={initial}
      tenantId={sp.tenantId ?? undefined}
    />
  );
}
