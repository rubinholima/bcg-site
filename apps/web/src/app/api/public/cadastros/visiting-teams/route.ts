import { NextRequest, NextResponse } from "next/server";
import { buildBackendUrl } from "@/lib/apiProxy";

function csvEscape(value: string): string {
  if (/[,"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * GET /api/public/cadastros/visiting-teams
 * Retorna lista de times visitantes cadastrados. ?format=csv → CSV (coluna name) para IMPORTDATA.
 */
export async function GET(request: NextRequest) {
  const wantCsv = request.nextUrl.searchParams.get("format") === "csv";

  try {
    const res = await fetch(buildBackendUrl("/visiting-teams"), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Erro ao buscar times visitantes" }, { status: 502 });
    }
    const data = await res.json();
    const teams = Array.isArray(data)
      ? data.map((t: { name: string; logoUrl?: string | null }) => ({
          name: t.name,
          logoUrl: t.logoUrl || undefined,
        }))
      : [];

    if (wantCsv) {
      const names = teams.map((t) => t.name).sort();
      const csv = "\uFEFFname\n" + names.map((n) => csvEscape(n)).join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json({ items: teams });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar times visitantes" }, { status: 502 });
  }
}
