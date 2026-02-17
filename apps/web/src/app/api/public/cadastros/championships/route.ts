import { NextRequest, NextResponse } from "next/server";

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const wantCsv = request.nextUrl.searchParams.get("format") === "csv";

  try {
    const res = await fetch(`${apiUrl}/championships`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao buscar campeonatos" }, { status: 502 });
    }
    const data = await res.json();
    const names = Array.isArray(data) ? data.map((c: { name: string }) => c.name).sort() : [];

    if (wantCsv) {
      const csv = "name\n" + names.map((n) => csvEscape(n)).join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ items: names });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar campeonatos" }, { status: 502 });
  }
}
