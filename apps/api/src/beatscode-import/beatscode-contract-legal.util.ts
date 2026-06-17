export function mapBeatscodeLegalDocType(
  contractTypeName: string | null,
  status: string,
): string {
  const name = (contractTypeName ?? '').toLowerCase();
  if (status === 'additive' || name.includes('aditiv')) return 'aditivo';
  if (name.includes('imagem')) return 'contrato_imagem';
  if (name.includes('formação') || name.includes('formacao')) return 'formacao';
  if (name.includes('rescis')) return 'rescisao';
  if (name.includes('transfer') || name.includes('transf')) return 'transferencia';
  if (name.includes('trabalho') || name.includes('clt') || name.includes('cbf')) {
    return 'contrato_trabalho';
  }
  return 'outro';
}

export function mapBeatscodeLegalDocStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'signed';
    case 'rescinded':
      return 'cancelled';
    case 'completed':
      return 'expired';
    case 'additive':
      return 'signed';
    default:
      return 'draft';
  }
}

export function buildContractDocumentName(
  contractTypeName: string | null,
  number: string | null,
  beatscodeId: number,
  attachmentId: number,
): string {
  const base = contractTypeName?.trim() || 'Contrato';
  const num = number?.trim();
  return num
    ? `${base} nº ${num}`
    : `${base} (Beatscode #${beatscodeId} / anexo ${attachmentId})`;
}
