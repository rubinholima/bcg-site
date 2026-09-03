/**
 * Validação local do importador HUD — rode:
 * pnpm --filter web exec tsx scripts/validate-hud-import.ts [caminho.xlsx]
 */
import fs from "node:fs";
import path from "node:path";
import {
  parseFilenameSessionHints,
  parseHudWorkbookFromBuffer,
  type GpsImportRosterPlayer,
} from "../src/lib/fisiologia-gps-import";

const defaultFixture = path.join(
  import.meta.dirname,
  "../src/lib/__fixtures__/2026_8_30_Boston_x_Athletic.xlsx",
);
const filePath = process.argv[2] ?? defaultFixture;

const roster: GpsImportRosterPlayer[] = [
  { id: "p-arthur-vilela", name: "Arthur Vilela", jerseyNumber: null },
  { id: "p-arthur-fraga", name: "Arthur Fraga", jerseyNumber: null },
  { id: "p-daniel-eller", name: "Daniel Eller", jerseyNumber: null },
  { id: "p-enzo-belloto", name: "Enzo Belloto", jerseyNumber: null },
  { id: "p-enzo-cunha", name: "Enzo Cunha", jerseyNumber: null },
];

const buffer = fs.readFileSync(filePath);
const fileName = path.basename(filePath);
const filenameHints = parseFilenameSessionHints(fileName);
const result = parseHudWorkbookFromBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), roster, fileName);

const sampleId =
  result.patches.has("p-arthur-vilela")
    ? "p-arthur-vilela"
    : (result.patches.keys().next().value as string | undefined);
const samplePatch = sampleId ? result.patches.get(sampleId) : undefined;
const allAthleteNames = result.athleteMatches.map((m) => m.workbookLabel);

console.log(JSON.stringify({
  file: fileName,
  filenameHints,
  detectedSheets: result.sessionHints.detectedSheets,
  session: {
    date: result.sessionHints.sessionDate,
    type: result.sessionHints.sessionType,
    label: result.sessionHints.sessionLabel,
    trainingType: result.sessionHints.trainingType,
    opponent: result.sessionHints.opponentName,
  },
  workbookAthletes: result.workbookAthleteCount,
  athleteNames: allAthleteNames,
  matched: result.matched,
  unmatched: result.unmatched,
  ambiguous: result.ambiguous,
  arthurFragaMatched: result.patches.has("p-arthur-fraga"),
  arthurVilela: sampleId === "p-arthur-vilela" ? samplePatch : result.patches.get("p-arthur-vilela"),
  sampleAthlete: sampleId
    ? {
        playerId: sampleId,
        patch: samplePatch,
      }
    : null,
}, null, 2));

const failures: string[] = [];
if (!result.sessionHints.detectedSheets?.includes("Distance")) failures.push("aba Distance ausente");
if (result.workbookAthleteCount < 1) failures.push("nenhum atleta na planilha");
if (result.matched < 1) failures.push("nenhum atleta vinculado");
if (!samplePatch?.maxDistanceM) failures.push("distância total não parseada");
if (samplePatch?.lowIntensityDistanceM == null) failures.push("distância baixa (col O) não parseada");
if (samplePatch?.highIntensityDistanceM == null) failures.push("distância alta (col P) não parseada");
if (samplePatch?.sprintCount == null) failures.push("sprints (HSE D) não parseados");
if (samplePatch?.maxSpeedKmh == null) failures.push("velocidade máx (HSE P) não parseada");
if (samplePatch?.gpsData?.accelerations == null) failures.push("acelerações não parseadas");
if (samplePatch?.gpsData?.decelerations == null) failures.push("desacelerações não parseadas");

if (fileName.includes("Boston_x_Athletic")) {
  if (result.sessionHints.sessionType !== "jogo") failures.push("sessão deveria ser jogo");
  if (result.sessionHints.sessionDate !== "2026-08-30") failures.push("data do jogo incorreta");
  const vilela = result.patches.get("p-arthur-vilela");
  if (!vilela) failures.push("Arthur Vilela não vinculado");
  if (vilela && vilela.maxDistanceM !== 5393.9) {
    failures.push(`distância Arthur Vilela esperada 5393.9, obtida ${vilela.maxDistanceM}`);
  }
  if (vilela?.gpsData?.accelerations !== 4811) {
    failures.push(`acelerações Arthur Vilela esperadas 4811, obtidas ${vilela?.gpsData?.accelerations}`);
  }
  if (vilela?.gpsData?.decelerations !== 4829) {
    failures.push(`desacelerações Arthur Vilela esperadas 4829, obtidas ${vilela?.gpsData?.decelerations}`);
  }
  if (result.patches.has("p-arthur-fraga")) {
    failures.push("Arthur Fraga não existe no workbook original — não deveria ser vinculado");
  }
}

if (failures.length) {
  console.error("FALHAS:", failures.join("; "));
  process.exit(1);
}

console.log("OK — importador HUD validado.");
