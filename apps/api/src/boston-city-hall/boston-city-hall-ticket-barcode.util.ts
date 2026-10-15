import bwipjs from 'bwip-js';

/** Code 128 PNG do código BCH-… — leitores 1D (ex.: NETUM NT-1228BC). */
export function renderTicketCode128Png(ticketCode: string): Promise<Buffer> {
  const text = ticketCode.trim();
  if (!text) {
    return Promise.reject(new Error('Código do ingresso vazio.'));
  }
  return bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 14,
    includetext: true,
    textxalign: 'center',
    paddingwidth: 8,
    paddingheight: 8,
  });
}
