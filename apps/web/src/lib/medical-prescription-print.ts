import { ReportLegacyDocument } from "@/lib/report-print-layout";
import { formatDateDayMonYear } from "@/lib/format-date";
import {
  printHtmlDocument,
  reportLogoUrlForPrint,
  resolveLogoUrlForPrint,
} from "@/lib/futebol-relatorios-print";
import type { MedicalEncounter, MedicalPrescriptionItem } from "@/types/medical-encounter";

export type MedicalPhysicianPrintProfile = {
  id?: string;
  name: string;
  crmCoren?: string | null;
  registryState?: string | null;
  specialty?: string | null;
  email?: string | null;
  phone?: string | null;
  institution?: string | null;
  signatureImageUrl?: string | null;
};

function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPhysicianRegistry(profile: MedicalPhysicianPrintProfile | null | undefined): string {
  if (!profile) return "";
  const crm = profile.crmCoren?.trim();
  const uf = profile.registryState?.trim();
  if (crm && uf) return `${crm} / ${uf}`;
  return crm || uf || "";
}

export function buildMedicalPrescriptionPrintHtml(input: {
  encounter: MedicalEncounter & {
    physicianCrm?: string | null;
    physicianProfile?: MedicalPhysicianPrintProfile | null;
    player?: {
      name?: string;
      category?: string | null;
      birthDate?: string | null;
    };
    tenant?: { name?: string; logoUrl?: string | null };
  };
}): string {
  const enc = input.encounter;
  const playerName = enc.player?.name ?? "Atleta";
  const when = formatDateDayMonYear(new Date(enc.occurredAt));
  const profile = enc.physicianProfile;
  const physician = profile?.name ?? enc.physicianName ?? "Médico responsável";
  const registry =
    formatPhysicianRegistry(profile) || enc.physicianCrm?.trim() || "";
  const rx = (enc.prescriptions ?? []) as MedicalPrescriptionItem[];

  const tenantName = enc.tenant?.name?.trim() ?? "";
  const logoRaw = reportLogoUrlForPrint(enc.tenant?.logoUrl ?? null, false);
  const logoSrc = logoRaw ? resolveLogoUrlForPrint(logoRaw) : "";
  const headerLogo = logoSrc
    ? `<img class="club-logo" src="${esc(logoSrc)}" alt="" />`
    : "";

  const contactParts = [
    profile?.institution?.trim(),
    profile?.specialty?.trim() ? `Especialidade: ${profile.specialty.trim()}` : "",
    profile?.phone?.trim(),
    profile?.email?.trim(),
  ].filter(Boolean);

  const signatureUrl = profile?.signatureImageUrl?.trim()
    ? resolveLogoUrlForPrint(profile.signatureImageUrl)
    : "";
  const signatureBlock = signatureUrl
    ? `<img class="signature" src="${esc(signatureUrl)}" alt="Assinatura" />`
    : `<div class="signature-line"></div>`;

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

  const birth =
    enc.player?.birthDate?.trim() ?
      formatDateDayMonYear(new Date(`${enc.player.birthDate.trim()}T12:00:00`))
    : null;

  const disclaimer = `<p class="disc"><strong>Documento interno de uso clínico.</strong> Registro gráfico de prescrição para arquivo do clube. Não constitui receita eletrônica, assinatura digital certificada (ICP-Brasil) nem prescrição regulada.</p>`;

  const body = `<header class="doc-header">
      ${headerLogo}
      <div class="club-block">
        <p class="club-name">${esc(tenantName || "Instituição")}</p>
        ${contactParts.length ? `<p class="club-meta">${esc(contactParts.join(" · "))}</p>` : ""}
      </div>
    </header>
    <h1>Prescrição médica</h1>
    <p class="meta">Data do atendimento: ${when}</p>
    <table class="info">
      <tr><th>Paciente / atleta</th><td>${esc(playerName)}${enc.player?.category ? ` · ${esc(enc.player.category)}` : ""}${birth ? `<br/><span class="sub">Nasc.: ${esc(birth)}</span>` : ""}</td></tr>
      <tr><th>Médico(a)</th><td>${esc(physician)}${registry ? `<br/><span class="sub">${esc(registry)}</span>` : ""}${profile?.specialty ? `<br/><span class="sub">${esc(profile.specialty)}</span>` : ""}</td></tr>
    </table>
    <h2>Medicamentos e orientações</h2>
    <table class="rx">
      <thead><tr><th>Medicamento</th><th>Dose / Via</th><th>Posologia</th><th>Instruções</th></tr></thead>
      <tbody>${rows || "<tr><td colspan=\"4\">Sem itens prescritos.</td></tr>"}</tbody>
    </table>
    <div class="sign-block">
      ${signatureBlock}
      <p class="sign-name">${esc(physician)}</p>
      ${registry ? `<p class="sign-registry">${esc(registry)}</p>` : ""}
    </div>
    ${disclaimer}`;

  return ReportLegacyDocument(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Prescrição — ${esc(playerName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111; }
  .doc-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #222; }
  .club-logo { max-height: 52px; max-width: 120px; object-fit: contain; }
  .club-name { font-size: 14px; font-weight: 700; margin: 0; }
  .club-meta { font-size: 10px; color: #444; margin: 2px 0 0; }
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
  .sign-block { margin-top: 28px; text-align: center; max-width: 280px; }
  .signature { max-height: 64px; max-width: 220px; object-fit: contain; display: block; margin: 0 auto 4px; }
  .signature-line { border-bottom: 1px solid #333; height: 48px; margin-bottom: 6px; }
  .sign-name { font-weight: 600; margin: 0; }
  .sign-registry { font-size: 10px; color: #444; margin: 2px 0 0; }
  .disc { margin-top: 20px; font-size: 9px; color: #555; border-top: 1px solid #ddd; padding-top: 8px; line-height: 1.4; }
</style>
</head>
<body>${body}</body>
</html>`);
}

export function printMedicalPrescription(
  encounter: MedicalEncounter & {
    physicianCrm?: string | null;
    physicianProfile?: MedicalPhysicianPrintProfile | null;
    player?: { name?: string; category?: string | null; birthDate?: string | null };
    tenant?: { name?: string; logoUrl?: string | null };
  },
): void {
  const title = `Prescrição — ${encounter.player?.name ?? "Atleta"}`;
  printHtmlDocument(buildMedicalPrescriptionPrintHtml({ encounter }), title);
}

export async function issueAndPrintMedicalPrescription(
  encounterId: string,
): Promise<void> {
  const { api } = await import("@/lib/api");
  const { data } = await api.post<{
    encounter: MedicalEncounter & {
      physicianProfile?: MedicalPhysicianPrintProfile | null;
      tenant?: { name?: string; logoUrl?: string | null };
    };
  }>(`/medical-encounters/${encounterId}/prescription-issue`, {});
  printMedicalPrescription(data.encounter);
}
