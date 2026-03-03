import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/apiProxy";

import { buildBackendUrl, getAppBaseUrl } from "@/lib/apiProxy";

const SYNC_TYPES = ["times_categorias", "proximos_jogos", "tabela_classificacao"] as const;

/**
 * POST /api/integrations/sync
 * Body: { type, slug?, tenantName? }
 * Usa config única por tipo. Sistema filtra por slug ao buscar.
 */
export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { type?: string; slug?: string; tenantName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { type, slug, tenantName } = body;
  if (!type || !SYNC_TYPES.includes(type as (typeof SYNC_TYPES)[number])) {
    return NextResponse.json(
      { error: `type deve ser um de: ${SYNC_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Buscar config única do tipo
  const configRes = await fetch(
    buildBackendUrl(`/settings/integrations/by-type?type=${encodeURIComponent(type)}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );
  if (!configRes.ok) {
    return NextResponse.json(
      { error: "Não foi possível obter a configuração de integração" },
      { status: configRes.status }
    );
  }
  const item = (await configRes.json()) as { spreadsheetUrl?: string; gid?: string } | null;
  const spreadsheetUrl = item?.spreadsheetUrl?.trim();
  const gid = item?.gid?.trim() || "0";

  if (!spreadsheetUrl) {
    return NextResponse.json(
      {
        error: `Integração não configurada. Acesse Configurações → Integrações e defina a planilha para "${type}".`,
      },
      { status: 400 }
    );
  }

  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams();
  params.set("spreadsheetId", spreadsheetUrl);
  params.set("gid", gid);
  if (slug?.trim()) params.set("slug", slug.trim());
  if (tenantName?.trim() && type === "times_categorias") params.set("tenantName", tenantName.trim());

  const apiPath =
    type === "times_categorias"
      ? "/api/google-sheets/times-categorias"
      : type === "proximos_jogos"
        ? "/api/google-sheets/proximos-jogos"
        : "/api/google-sheets/tabela-classificacao";

  const res = await fetch(`${baseUrl}${apiPath}?${params}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
