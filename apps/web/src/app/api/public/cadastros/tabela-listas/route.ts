import { NextRequest, NextResponse } from "next/server";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { buildBackendUrl } from "@/lib/apiProxy";

function csvEscape(value: string): string {
  if (/[,"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Temporadas comuns para dropdown */
const TEMPORADAS_COMUNS = ["2025/2026", "2024/2025", "2023/2024", "2025", "2024"];

/**
 * GET /api/public/cadastros/tabela-listas?format=csv
 * Retorna CSV para colar na aba "Listas" da planilha da tabela de classificação.
 * Colunas: competicao, time, url_logo_time, categoria, temporada
 */
export async function GET(request: NextRequest) {
  const wantCsv = request.nextUrl.searchParams.get("format") === "csv";

  try {
    const [championshipsRes, teamsRes] = await Promise.all([
      fetch(buildBackendUrl("/championships"), { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(buildBackendUrl("/visiting-teams"), { cache: "no-store", headers: { Accept: "application/json" } }),
    ]);

    const championships = championshipsRes.ok
      ? ((await championshipsRes.json()) as Array<{ name: string }>).map((c) => c.name).sort()
      : [];
    const teamsData = teamsRes.ok
      ? (await teamsRes.json()) as Array<{ name: string; logoUrl?: string | null }>
      : [];
    const teamsSorted = [...teamsData].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const teamNames = teamsSorted.map((t) => t.name);
    const categoryValues = FIXTURE_CATEGORIES.map((c) => c.value);

    if (wantCsv) {
      const maxRows = Math.max(
        championships.length,
        teamNames.length,
        categoryValues.length,
        TEMPORADAS_COMUNS.length,
        1
      );
      const rows: string[] = [
        "competicao,time,url_logo_time,categoria,temporada",
      ];
      for (let i = 0; i < maxRows; i++) {
        const a = csvEscape(championships[i] ?? "");
        const b = csvEscape(teamNames[i] ?? "");
        const logoUrl = (teamsSorted[i]?.logoUrl ?? "").trim();
        const c = csvEscape(logoUrl);
        const d = csvEscape(categoryValues[i] ?? "");
        const e = csvEscape(TEMPORADAS_COMUNS[i] ?? "");
        rows.push(`${a},${b},${c},${d},${e}`);
      }
      const csv = "\uFEFF" + rows.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=listas-tabela-dropdowns.csv",
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({
      championships,
      teams: teamsData.map((t) => ({ name: t.name, logoUrl: t.logoUrl || undefined })),
      categories: FIXTURE_CATEGORIES.map((c) => ({ value: c.value, labelPT: c.labelPT, labelEN: c.labelEN })),
      temporadas: TEMPORADAS_COMUNS,
    });
  } catch {
    if (wantCsv) {
      const header = "competicao,time,url_logo_time,categoria,temporada";
      const fallback =
        "\uFEFF" +
        header +
        "\n,,,\"principal\",\"2025/2026\"\n,,,\"sub20\",\"2024/2025\"\n,,,\"sub17\",\"2025\"\n,,,\"sub15\",\"2024\"\n,,,\"sub13\",,\n,,,\"sub11\",,\n,,,\"sub9\",,\n,,,\"feminino\",";
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=listas-tabela-dropdowns.csv",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(
      {
        championships: [],
        teams: [],
        categories: FIXTURE_CATEGORIES.map((c) => ({ value: c.value, labelPT: c.labelPT, labelEN: c.labelEN })),
        temporadas: TEMPORADAS_COMUNS,
      },
      { status: 200 }
    );
  }
}
