export const REQUISITION_STATUS = {
  RASCUNHO: 'rascunho',
  ENVIADA: 'enviada',
  EM_COTACAO: 'em_cotacao',
  AGUARDANDO_FINANCEIRO: 'aguardando_financeiro',
  AGUARDANDO_DIRETORIA: 'aguardando_diretoria',
  APROVADA: 'aprovada',
  REPROVADA: 'reprovada',
  EM_COMPRA: 'em_compra',
  RECEBIDA_COMPRAS: 'recebida_compras',
  AGUARDANDO_ASSINATURA: 'aguardando_assinatura',
  CONCLUIDA: 'concluida',
} as const;

export type RequisitionStatus = (typeof REQUISITION_STATUS)[keyof typeof REQUISITION_STATUS];

export const REQUISITION_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  em_cotacao: 'Em cotação',
  aguardando_financeiro: 'Aguardando financeiro',
  aguardando_diretoria: 'Aguardando diretoria',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  em_compra: 'Em compra',
  recebida_compras: 'Recebida (Compras)',
  aguardando_assinatura: 'Aguardando assinatura',
  concluida: 'Concluída',
};

export const APPROVAL_ROLE = {
  FINANCEIRO: 'financeiro',
  DIRETORIA: 'diretoria',
} as const;

export const DEFAULT_PURCHASE_SETTINGS = {
  approvalThresholdBrl: 5000,
  minQuotes: 2,
  maxQuotes: 4,
};

export const requisitionInclude = {
  tenant: { select: { id: true, name: true, slug: true } },
  quotes: {
    orderBy: { totalAmount: 'asc' as const },
    include: { supplier: { select: { id: true, name: true, email: true } } },
  },
  selectedQuote: {
    include: { supplier: { select: { id: true, name: true, email: true } } },
  },
  approvals: { orderBy: { decidedAt: 'desc' as const } },
  receipt: true,
  purchaseOrders: {
    include: { supplier: { select: { id: true, name: true } } },
  },
  assets: { select: { id: true, description: true, tagNumber: true } },
};
