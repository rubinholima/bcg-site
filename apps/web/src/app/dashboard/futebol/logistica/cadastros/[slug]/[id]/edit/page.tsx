import { notFound } from "next/navigation";
import { LogisticaCadastroFormClient } from "../../../LogisticaCadastroFormClient";
import { fetchLogisticaCadastroOne } from "@/lib/logistica-cadastros";
import { assertLogisticaCadastroResource } from "@/lib/logistica-cadastros.config";

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
  if (initial.isSystem) notFound();

  return (
    <LogisticaCadastroFormClient
      resource={resource}
      mode="edit"
      initial={initial}
      tenantId={sp.tenantId ?? undefined}
    />
  );
}
