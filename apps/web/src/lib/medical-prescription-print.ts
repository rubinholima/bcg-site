import { ReportLegacyDocument } from "@/lib/report-print-layout";
import { formatDateDayMonYear } from "@/lib/format-date";
import { printHtmlDocument } from "@/lib/futebol-relatorios-print";
import type { MedicalEncounter, MedicalPrescriptionItem } from "@/types/medical-encounter";

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMedicalPrescriptionPrintHtml(input: {
  encounter: MedicalEncounter & {
    physicianCrm?: string | null;
    player?: { name?: string; category?: string | null; birthDate?: string | null };
    tenant?: { name?: string };
  };
}): string {
  const enc = input.encounter;
  const playerName = enc.player?.name ?? "Atleta";
  const when = formatDateDayMonYear(new Date(enc.occurredAt));
  const physician = enc.physicianName ?? "Médico responsável";
  const crm = enc.physicianCrm?.trim();
  const rx = (enc.prescriptions ?? []) as MedicalPrescriptionItem[];

  const rows = rx
    .map(
      (p) => `<tr>
        <td><strong>${esc(p.medication)}</strong>${p.presentation ? `<br/><span class="sub">${esc(p.presentation)}</span>` : ""}</td>
        <td>${esc([p.dose, p.route].filter(Boolean).join(" · "))}</td>
        <td>${esc([p.frequency, p.duration].filter(Boolean).join(" · "))}</td>
        <td>${esc(p.instructions)?.replace(/\n/g, "<br/>") ?? "—"}</td>
      </tr>`,
    )
    .join("");

  const disclaimer =
    "<p class=\"disc\">Documento interno de registro clínico. Não constitui receita eletrônica assinada ou certificada.</p>";

  const body = `<h1>Prescrição médica — uso interno</h1>
    <p class="meta">${esc(enc.tenant?.name ?? "")}${enc.tenant?.name ? " · " : ""}${when}</p>
    <table class="info">
      <tr><th>Atleta</th><td>${esc(playerName)}${enc.player?.category ? ` · ${esc(enc.player.category)}` : ""}</td></tr>
      <tr><th>Médico</th><td>${esc(physician)}${crm ? ` · ${esc(crm)}` : ""}</td></tr>
      ${enc.diagnosis ? `<tr><th>Hipótese / Dx</th><td>${esc(enc.diagnosis)}</td></tr>` : ""}
    </table>
    <h2>Medicamentos</h2>
    <table class="rx">
      <thead><tr><th>Medicamento</th><th>Dose / Via</th><th>Posologia</th><th>Instruções</th></tr></thead>
      <tbody>${rows || "<tr><td colspan=\"4\">Sem itens prescritos.</td></tr>"}</tbody>
    </table>
    ${disclaimer}`;

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Prescrição — ${esc(playerName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  h2 { font-size: 12px; margin: 16px 0 6px; }
  .meta { color: #444; margin: 0 0 12px; }
  table.info { width: 100%; margin-bottom: 8px; border-collapse: collapse; }
  table.info th { width: 28%; text-align: left; padding: 3px 8px 3px 0; vertical-align: top; }
  table.info td { padding: 3px 0; }
  table.rx { width: 100%; border-collapse: collapse; }
  table.rx th, table.rx td { border: 1px solid #ccc; padding: 6px 8px; vertical-align: top; }
  table.rx th { background: #f3f3f3; font-size: 10px; }
  .sub { font-size: 10px; color: #444; }
  .disc { margin-top: 16px; font-size: 10px; color: #555; border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>${body}</body>
</html>`);
}

export function printMedicalPrescription(
  encounter: MedicalEncounter & {
    physicianCrm?: string | null;
    player?: { name?: string; category?: string | null };
    tenant?: { name?: string };
  },
): void {
  const title = `Prescrição — ${encounter.player?.name ?? "Atleta"}`;
  printHtmlDocument(buildMedicalPrescriptionPrintHtml({ encounter }), title);
}
