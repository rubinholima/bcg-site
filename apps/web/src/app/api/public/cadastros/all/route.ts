import { NextRequest, NextResponse } from "next/server";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { buildBackendUrl } from "@/lib/apiProxy";

function csvEscape(value: string): string {
  if (/[,"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * GET /api/public/cadastros/all
 * Retorna todos os cadastros. ?format=csv → CSV único para colar na aba "Listas" da planilha.
 */
export async function GET(request: NextRequest) {
  const wantCsv = request.nextUrl.searchParams.get("format") === "csv";

  try {
    const [championshipsRes, stadiumsRes, teamsRes] = await Promise.all([
      fetch(buildBackendUrl("/championships"), { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(buildBackendUrl("/stadiums"), { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(buildBackendUrl("/visiting-teams"), { cache: "no-store", headers: { Accept: "application/json" } }),
    ]);

    const championships = championshipsRes.ok
      ? ((await championshipsRes.json()) as Array<{ name: string }>).map((c) => c.name).sort()
      : [];
    const stadiums = stadiumsRes.ok
      ? ((await stadiumsRes.json()) as Array<{ name: string }>).map((s) => s.name).sort()
      : [];
    const teamsData = teamsRes.ok
      ? (await teamsRes.json()) as Array<{ name: string; logoUrl?: string | null }>
      : [];
    const teamsSorted = [...teamsData].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    const teamNames = teamsSorted.map((t) => t.name);
    const categoryValues = FIXTURE_CATEGORIES.map((c) => c.value);
    const destaqueList = ["sim", "não"];
    const nossoTimeList = ["casa", "visitante"];

    if (wantCsv) {
      const maxRows = Math.max(
        championships.length,
        stadiums.length,
        teamNames.length,
        categoryValues.length,
        destaqueList.length,
        nossoTimeList.length,
        1
      );
      const rows: string[] = [
        "competicao,local,time_visitante,url_logo_time,categoria,destaque,nosso_time",
      ];
      for (let i = 0; i < maxRows; i++) {
        const a = csvEscape(championships[i] ?? "");
        const b = csvEscape(stadiums[i] ?? "");
        const c = csvEscape(teamNames[i] ?? "");
        const logoUrl = (teamsSorted[i]?.logoUrl ?? "").trim();
        const d = csvEscape(logoUrl);
        const e = csvEscape(categoryValues[i] ?? "");
        const f = csvEscape(destaqueList[i] ?? "");
        const g = csvEscape(nossoTimeList[i] ?? "");
        rows.push(`${a},${b},${c},${d},${e},${f},${g}`);
      }
      const csv = rows.join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=listas-dropdowns.csv",
          "Cache-Control": "no-store",
        },
      });
    }

    const categories = FIXTURE_CATEGORIES.map((c) => ({
      value: c.value,
      labelPT: c.labelPT,
      labelEN: c.labelEN,
    }));
    const visitingTeams = teamsData.map((t) => ({
      name: t.name,
      logoUrl: t.logoUrl || undefined,
    }));

    return NextResponse.json({
      championships,
      stadiums,
      visitingTeams,
      categories,
    });
  } catch {
    if (request.nextUrl.searchParams.get("format") === "csv") {
      const header = "competicao,local,time_visitante,url_logo_time,categoria,destaque,nosso_time";
      const fallback =
        header +
        "\n,,,,\"principal\",sim,casa\n,,,,\"sub20\",não,visitante\n,,,,\"sub17\",,,\n,,,,\"sub15\",,,\n,,,,\"sub13\",,,\n,,,,\"sub11\",,,\n,,,,\"sub9\",,,\n,,,,\"feminino\",,,";
      return new NextResponse(fallback, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=listas-dropdowns.csv",
          "Cache-Control": "no-store",
        },
      });
    }
    return NextResponse.json(
      {
        championships: [],
        stadiums: [],
        visitingTeams: [],
        categories: FIXTURE_CATEGORIES.map((c) => ({
          value: c.value,
          labelPT: c.labelPT,
          labelEN: c.labelEN,
        })),
      },
      { status: 200 }
    );
  }
}
