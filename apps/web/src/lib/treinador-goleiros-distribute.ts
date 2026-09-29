import { api } from "@/lib/api";

export async function distributeGkReport(input: {
  tenantId: string;
  kind: string;
  referenceId: string;
  summary: string;
}) {
  const { data } = await api.post<{ ok: boolean; recipientCount?: number }>(
    "/treinador-goleiros/distribute",
    input,
  );
  return data;
}
