import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/lib/apiProxy";
import { buildBackendUrl, getAppBaseUrl } from "@/lib/apiProxy";

/**
 * POST /api/integrations/sync-players
 * Importa TODOS os jogadores da planilha Times por Categorias.
 * Usa a coluna clube/slug para determinar o clube de cada jogador.
 */
export async function POST(request: NextRequest) {
  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 1. Buscar config única de times_categorias
  const configRes = await fetch(
    buildBackendUrl("/settings/integrations/by-type?type=times_categorias"),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );
  if (!configRes.ok) {
    const errBody = await configRes.json().catch(() => ({}));
    const msg = errBody?.message ?? errBody?.error ?? "Não foi possível obter a configuração de integração";
    return NextResponse.json({ error: msg }, { status: configRes.status });
  }
  const item = (await configRes.json()) as { spreadsheetUrl?: string; gid?: string } | null;
  const spreadsheetUrl = item?.spreadsheetUrl?.trim();
  const gid = item?.gid?.trim() || "0";

  if (!spreadsheetUrl) {
    return NextResponse.json(
      {
        error:
          'Integração não configurada. Acesse Configurações → Integrações e defina a planilha "Times por Categorias".',
      },
      { status: 400 }
    );
  }

  // 2. Chamar API times-categorias (sem filtro = todos os jogadores)
  const params = new URLSearchParams();
  params.set("spreadsheetId", spreadsheetUrl);
  params.set("gid", gid);

  const baseUrl = getAppBaseUrl();
  const sheetRes = await fetch(
    `${baseUrl}/api/google-sheets/times-categorias?${params}`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  const sheetData = await sheetRes.json();
  if (!sheetRes.ok || !Array.isArray(sheetData.categories)) {
    return NextResponse.json(
      sheetData.error
        ? { error: sheetData.error }
        : { error: "Erro ao buscar dados da planilha" },
      { status: sheetRes.ok ? 400 : sheetRes.status }
    );
  }

  // 3. Enviar para Nest sync-from-sheet-all
  const syncRes = await fetch(buildBackendUrl("/players/sync-from-sheet-all"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      categories: sheetData.categories,
    }),
  });

  const syncResult = await syncRes.json().catch(() => ({}));
  if (!syncRes.ok) {
    const msg = syncResult?.message ?? syncResult?.error ?? "Erro ao sincronizar jogadores";
    return NextResponse.json({ error: msg }, { status: syncRes.status });
  }
  return NextResponse.json(syncResult);
}
