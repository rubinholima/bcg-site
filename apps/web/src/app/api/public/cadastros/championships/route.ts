import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";

/** Escapa um valor para CSV (aspas se tiver vírgula, aspas ou quebra de linha). */
function csvEscape(value: string): string {
  if (/[,"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * GET /api/public/cadastros/championships
 * Retorna lista de campeonatos cadastrados (para validação de dados no Google Sheets).
 * ?format=csv → retorna CSV (uma coluna "name") para IMPORTDATA na planilha.
 */
export async function GET(request: NextRequest) {
  const wantCsv = request.nextUrl.searchParams.get("format") === "csv";

  try {
    const res = await fetch(buildBackendUrl("/championships"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao buscar campeonatos" }, { status: 502 });
    }
    const data = await res.json();
    const items = Array.isArray(data)
      ? data.map((c: { id: string; name: string; logoUrl?: string; standingsFormula?: string }) => ({
          id: c.id,
          name: c.name,
          logoUrl: c.logoUrl ?? null,
          standingsFormula: c.standingsFormula ?? null,
        }))
      : [];

    if (wantCsv) {
      const names = items.map((c: { name: string }) => c.name).sort();
      const csv = "\uFEFFname\n" + names.map((n) => csvEscape(n)).join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar campeonatos" }, { status: 502 });
  }
}
