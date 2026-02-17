import { NextResponse } from "next/server";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";

function csvEscape(value: string): string {
  if (/[,"\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * GET /api/public/templates/proximos-jogos
 * Retorna o template CSV de Próximos Jogos já preenchido com competições,
 * estádios e times cadastrados no site (para baixar e ajustar o restante).
 */
export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  let championships: string[] = [];
  let stadiums: string[] = [];
  let teams: Array<{ name: string; logoUrl?: string | null }> = [];

  try {
    const [champRes, stadiumRes, teamsRes] = await Promise.all([
      fetch(`${apiUrl}/championships`, { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(`${apiUrl}/stadiums`, { cache: "no-store", headers: { Accept: "application/json" } }),
      fetch(`${apiUrl}/visiting-teams`, { cache: "no-store", headers: { Accept: "application/json" } }),
    ]);
    if (champRes.ok) {
      const data = (await champRes.json()) as Array<{ name: string }>;
      championships = Array.isArray(data) ? data.map((c) => c.name).sort() : [];
    }
    if (stadiumRes.ok) {
      const data = (await stadiumRes.json()) as Array<{ name: string }>;
      stadiums = Array.isArray(data) ? data.map((s) => s.name).sort() : [];
    }
    if (teamsRes.ok) {
      const data = (await teamsRes.json()) as Array<{ name: string; logoUrl?: string | null }>;
      teams = Array.isArray(data) ? data : [];
    }
  } catch {
    // fallback vazio
  }

  const header =
    "data,hora,time_casa,time_visitante,competicao,local,url_assistir,url_ingresso,categoria,destaque,logo_casa,logo_visitante,nosso_time";
  const rows: string[] = [header];

  const catValues = FIXTURE_CATEGORIES.map((c) => c.value);
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

  const maxFixtureRows = 5;
  if (teams.length === 0 && championships.length === 0 && stadiums.length === 0) {
    rows.push("2025-03-15,20:00,Nosso Clube,Adversário A,Campeonato Estadual,Estádio Municipal,,,principal,não,,,casa");
    rows.push("2025-03-22,16:00,Adversário B,Nosso Clube,Copa Regional,,https://tv.exemplo.com,,principal,sim,,,visitante");
  } else {
    const n = Math.min(Math.max(teams.length, 1), maxFixtureRows);
    for (let i = 0; i < n; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + 7 * (i + 1));
      const dataStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const horaStr = i % 2 === 1 ? "16:00" : "20:00";
      const isOurHome = i % 2 === 0;
      const timeCasa = isOurHome ? "Nosso Clube" : (teams[i % teams.length]?.name ?? "Adversário");
      const timeVisitante = isOurHome ? (teams[i % teams.length]?.name ?? "Adversário") : "Nosso Clube";
      const comp = championships[i % championships.length] ?? championships[0] ?? "Campeonato";
      const local = stadiums[i % stadiums.length] ?? stadiums[0] ?? "";
      const cat = catValues[i % catValues.length] ?? "principal";
      const destaque = i === 0 ? "sim" : "não";
      const nossoTime = isOurHome ? "casa" : "visitante";
      const logoCasa = isOurHome ? "" : (teams[i % teams.length]?.logoUrl ?? "");
      const logoVisitante = isOurHome ? (teams[i % teams.length]?.logoUrl ?? "") : "";

      rows.push(
        [
          dataStr,
          horaStr,
          csvEscape(timeCasa),
          csvEscape(timeVisitante),
          csvEscape(comp),
          csvEscape(local),
          "",
          "",
          cat,
          destaque,
          csvEscape(logoCasa),
          csvEscape(logoVisitante),
          nossoTime,
        ].join(",")
      );
    }
  }

  // Seção Listas: todas as opções para colar na aba "Listas" e usar em validação de dados
  rows.push("");
  rows.push("LISTAS (cole na aba Listas da planilha para dropdowns)");
  rows.push("competicao,local,time_visitante,url_logo_time,categoria,destaque,nosso_time");
  const listasChamp = championships.length ? championships : ["Campeonato"];
  const listasStadium = stadiums.length ? stadiums : ["Estádio"];
  const teamsSorted = [...teams].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const listasTeamNames = teamsSorted.map((t) => t.name);
  const listasTeamLogos = teamsSorted.map((t) => (t.logoUrl ?? "").trim());
  const listasCat = FIXTURE_CATEGORIES.map((c) => c.value);
  const listasDestaque = ["sim", "não"];
  const listasNossoTime = ["casa", "visitante"];
  const maxListas = Math.max(
    listasChamp.length,
    listasStadium.length,
    listasTeamNames.length,
    listasCat.length,
    listasDestaque.length,
    listasNossoTime.length,
    1
  );
  for (let i = 0; i < maxListas; i++) {
    rows.push(
      [
        csvEscape(listasChamp[i] ?? ""),
        csvEscape(listasStadium[i] ?? ""),
        csvEscape(listasTeamNames[i] ?? ""),
        csvEscape(listasTeamLogos[i] ?? ""),
        csvEscape(listasCat[i] ?? ""),
        listasDestaque[i] ?? "",
        listasNossoTime[i] ?? "",
      ].join(",")
    );
  }

  const csv = rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=proximos-jogos-template.csv",
      "Cache-Control": "no-store",
    },
  });
}
