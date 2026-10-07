import type { VenueProposalDto } from './boston-city-hall.constants';

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

export function buildVenueProposalPrintHtml(proposal: VenueProposalDto): string {
  const rows = proposal.items
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

  const notes = proposal.notes?.trim()
    ? `<section><h2>Observações</h2><p>${escapeHtml(proposal.notes).replace(/\n/g, '<br/>')}</p></section>`
    : '';
  const terms = proposal.terms?.trim()
    ? `<section><h2>Termos</h2><p>${escapeHtml(proposal.terms).replace(/\n/g, '<br/>')}</p></section>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(proposal.proposalNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui,Segoe UI,sans-serif; color: #111; font-size: 11pt; line-height: 1.45; margin: 0; }
    h1 { font-size: 20pt; margin: 0 0 4px; }
    .sub { color: #444; margin-bottom: 24px; }
    h2 { font-size: 12pt; margin: 20px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; font-weight: 600; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 16px; max-width: 320px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: 700; font-size: 13pt; border-top: 2px solid #111; margin-top: 8px; padding-top: 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .label { color: #666; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
  </style>
</head>
<body>
  <h1>Boston City Hall</h1>
  <p class="sub">Proposta comercial · ${escapeHtml(proposal.proposalNumber)}</p>

  <section class="grid">
    <div><div class="label">Cliente</div><div>${escapeHtml(proposal.contactName)}</div></div>
    <div><div class="label">E-mail</div><div>${escapeHtml(proposal.contactEmail)}</div></div>
    ${
      proposal.companyName
        ? `<div><div class="label">Empresa</div><div>${escapeHtml(proposal.companyName)}</div></div>`
        : ''
    }
    <div><div class="label">Evento</div><div>${escapeHtml(proposal.title)}</div></div>
    <div><div class="label">Tipo</div><div>${escapeHtml(proposal.eventType ?? '—')}</div></div>
    <div><div class="label">Data do evento</div><div>${formatDate(proposal.eventDate)}</div></div>
    <div><div class="label">Convidados</div><div>${proposal.guestCount ?? '—'}</div></div>
    <div><div class="label">Validade</div><div>${formatDate(proposal.validUntil)}</div></div>
  </section>

  <h2>Itens</h2>
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
    <div><span>Subtotal</span><span>${moneyBr(proposal.subtotal)}</span></div>
    <div><span>Desconto</span><span>${moneyBr(proposal.discount)}</span></div>
    <div><span>Taxas</span><span>${moneyBr(proposal.tax)}</span></div>
    <div class="grand"><span>Total</span><span>${moneyBr(proposal.total)}</span></div>
  </div>

  ${notes}
  ${terms}
</body>
</html>`;
}
