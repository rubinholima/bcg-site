function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(v: unknown): string {
  if (!v) return '—';
  const s = typeof v === 'string' ? v : v instanceof Date ? v.toISOString() : String(v);
  return s.slice(0, 10);
}

export type ContractualDossierPrintInput = {
  generatedAt: string;
  tenantName: string;
  player: { name: string; category?: string | null; status?: string | null };
  summary: Record<string, unknown>;
  evaluation: Record<string, unknown> | null;
  federative: Record<string, unknown> | null;
  professionalization: Record<string, unknown> | null;
  contracts: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
  parties: Array<Record<string, unknown>>;
  participations: Array<Record<string, unknown>>;
  pendingItems: string[];
  financialSummary?: Record<string, unknown> | null;
  showFinancial: boolean;
  showSalary: boolean;
};

export function buildContractualDossierPrintHtml(input: ContractualDossierPrintInput): string {
  const primary = input.contracts.find((c) =>
    ['ACTIVE', 'EXPIRING', 'PENDING_SIGNATURE'].includes(String(c.status)),
  );

  const rows = input.contracts
    .map(
      (c) => `<tr>
        <td>${escapeHtml(String((c.contractType as { name?: string })?.name ?? c.createdSource ?? '—'))}</td>
        <td>${escapeHtml(String(c.status ?? '—'))}</td>
        <td>${fmtDate(c.startDate)}</td>
        <td>${fmtDate(c.endDate)}</td>
        <td>${fmtDate(c.terminationDate)}</td>
        <td>${escapeHtml(String(c.signatureStatus ?? '—'))}</td>
      </tr>`,
    )
    .join('');

  const docs = input.attachments
    .map(
      (a) => `<tr>
        <td>${escapeHtml(String(a.category ?? '—'))}</td>
        <td>${escapeHtml(String(a.documentType ?? '—'))}</td>
        <td>${escapeHtml(String(a.description ?? '—'))}</td>
        <td>${fmtDate(a.issueDate)}</td>
        <td>${fmtDate(a.expirationDate)}</td>
      </tr>`,
    )
    .join('');

  const finBlock =
    input.showFinancial && input.financialSummary
      ? `<h2>Resumo financeiro</h2>
        <pre style="font-size:11px;white-space:pre-wrap">${escapeHtml(JSON.stringify(input.financialSummary, null, 2))}</pre>`
      : input.showFinancial
        ? '<p><em>Sem lançamentos vinculados.</em></p>'
        : '<p><em>Resumo financeiro restrito ao seu perfil.</em></p>';

  const salaryNote = input.showSalary
    ? ''
    : '<p><em>Dados salariais/RH omitidos por permissão.</em></p>';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Dossiê Contratual — ${escapeHtml(input.player.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; font-size: 12px; }
    h1 { font-size: 20px; margin: 0 0 8px; color: #00205B; }
    h2 { font-size: 14px; margin: 20px 0 8px; color: #C8102E; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #E8EEF7; }
    .meta { color: #444; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  </style>
</head>
<body>
  <h1>Dossiê Contratual do Atleta</h1>
  <p class="meta">${escapeHtml(input.tenantName)} · Gerado em ${escapeHtml(input.generatedAt.slice(0, 19))} UTC</p>

  <h2>Identidade</h2>
  <div class="grid">
    <div><strong>Nome:</strong> ${escapeHtml(input.player.name)}</div>
    <div><strong>Categoria:</strong> ${escapeHtml(String(input.player.category ?? '—'))}</div>
    <div><strong>Situação avaliação:</strong> ${escapeHtml(String(input.summary.athleteSituation ?? '—'))}</div>
    <div><strong>Situação federativa:</strong> ${escapeHtml(String(input.summary.federativeSituation ?? '—'))}</div>
    <div><strong>Profissionalização:</strong> ${escapeHtml(String(input.professionalization?.status ?? '—'))}</div>
    <div><strong>Contrato principal:</strong> ${escapeHtml(String(input.summary.primaryContractType ?? '—'))}</div>
    <div><strong>Vigência:</strong> ${fmtDate(input.summary.startDate)} → ${fmtDate(input.summary.endDate)}</div>
    <div><strong>Dias p/ vencimento:</strong> ${escapeHtml(String(input.summary.daysUntilExpiry ?? '—'))}</div>
    <div><strong>Assinatura:</strong> ${escapeHtml(String(input.summary.signatureStatus ?? '—'))}</div>
  </div>

  ${salaryNote}

  <h2>Contrato principal</h2>
  ${
    primary
      ? `<p>${escapeHtml(String((primary.contractType as { name?: string })?.name ?? '—'))} — ${escapeHtml(String(primary.status ?? ''))}</p>`
      : '<p>—</p>'
  }

  <h2>Contratos ativos e histórico</h2>
  <table>
    <thead><tr><th>Tipo</th><th>Status</th><th>Início</th><th>Fim</th><th>Rescisão</th><th>Assinatura</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">—</td></tr>'}</tbody>
  </table>

  <h2>Partes e participações</h2>
  <p><strong>Partes:</strong> ${input.parties.length}</p>
  <p><strong>Participações:</strong> ${input.participations.length}</p>

  <h2>Documentos</h2>
  <table>
    <thead><tr><th>Categoria</th><th>Tipo</th><th>Descrição</th><th>Emissão</th><th>Validade</th></tr></thead>
    <tbody>${docs || '<tr><td colspan="5">—</td></tr>'}</tbody>
  </table>

  <h2>Pendências e alertas</h2>
  <ul>${input.pendingItems.map((p) => `<li>${escapeHtml(p)}</li>`).join('') || '<li>—</li>'}</ul>

  ${finBlock}
</body>
</html>`;
}
