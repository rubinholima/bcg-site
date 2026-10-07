import type { VenueContractDto } from './boston-city-hall.constants';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function moneyBr(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export function buildVenueContractPrintHtml(contract: VenueContractDto): string {
  const rows = contract.items
    .map(
      (it) => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td class="num">${escapeHtml(it.quantity)}</td>
      <td class="num">${moneyBr(it.unitPrice)}</td>
      <td class="num">${moneyBr(it.totalPrice)}</td>
    </tr>`,
    )
    .join('');

  const terms = contract.terms?.trim()
    ? `<section><h2>Termos e condições</h2><p>${escapeHtml(contract.terms).replace(/\n/g, '<br/>')}</p></section>`
    : '';
  const notes = contract.notes?.trim()
    ? `<section><h2>Observações</h2><p>${escapeHtml(contract.notes).replace(/\n/g, '<br/>')}</p></section>`
    : '';

  const today = formatDate(contract.createdAt);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(contract.contractNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; font-size: 11pt; line-height: 1.5; margin: 0; }
    h1 { font-family: system-ui, sans-serif; font-size: 22pt; margin: 0 0 4px; letter-spacing: 0.02em; }
    .sub { font-family: system-ui, sans-serif; color: #444; margin-bottom: 28px; font-size: 10pt; }
    h2 { font-family: system-ui, sans-serif; font-size: 11pt; margin: 24px 0 8px; border-bottom: 1px solid #333; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.06em; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-family: system-ui, sans-serif; font-size: 10pt; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f0f0f0; font-weight: 600; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; max-width: 340px; margin-left: auto; font-family: system-ui, sans-serif; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 13pt; border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 28px; font-family: system-ui, sans-serif; font-size: 10pt; }
    .label { color: #666; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .signatures { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; font-family: system-ui, sans-serif; font-size: 10pt; }
    .sig-line { border-top: 1px solid #111; margin-top: 56px; padding-top: 8px; }
    .sig-caption { color: #555; font-size: 9pt; }
  </style>
</head>
<body>
  <h1>Boston City Hall</h1>
  <p class="sub">Contrato de prestação de serviços · ${escapeHtml(contract.contractNumber)} · ${today}</p>
  <p class="sub">Proposta de referência: ${escapeHtml(contract.proposalNumber)}</p>

  <section class="grid">
    <div><div class="label">Contratante</div><div>${escapeHtml(contract.contactName)}</div></div>
    <div><div class="label">E-mail</div><div>${escapeHtml(contract.contactEmail)}</div></div>
    ${
      contract.companyName
        ? `<div><div class="label">Empresa</div><div>${escapeHtml(contract.companyName)}</div></div>`
        : ''
    }
    <div><div class="label">Evento</div><div>${escapeHtml(contract.title)}</div></div>
    <div><div class="label">Tipo</div><div>${escapeHtml(contract.eventType ?? '—')}</div></div>
    <div><div class="label">Data do evento</div><div>${formatDate(contract.eventDate)}</div></div>
    <div><div class="label">Convidados</div><div>${contract.guestCount ?? '—'}</div></div>
    <div><div class="label">Vigência</div><div>${formatDate(contract.validFrom)} — ${formatDate(contract.validUntil)}</div></div>
  </section>

  <h2>Objeto e valores</h2>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th class="num">Qtd</th>
        <th class="num">Unitário</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4">Nenhum item</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Subtotal</span><span>${moneyBr(contract.subtotal)}</span></div>
    <div><span>Desconto</span><span>${moneyBr(contract.discount)}</span></div>
    <div><span>Taxas</span><span>${moneyBr(contract.tax)}</span></div>
    <div class="grand"><span>Total</span><span>${moneyBr(contract.total)}</span></div>
  </div>

  ${terms}
  ${notes}

  <div class="signatures">
    <div>
      <div class="sig-line">${escapeHtml(contract.contactName)}</div>
      <div class="sig-caption">Contratante</div>
    </div>
    <div>
      <div class="sig-line">Boston City Hall</div>
      <div class="sig-caption">Contratado</div>
    </div>
  </div>
</body>
</html>`;
}
