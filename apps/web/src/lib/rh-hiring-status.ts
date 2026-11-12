export const HIRING_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  solicitacao_recebida: "Solicitação recebida",
  docs_conferencia: "Documentos em conferência",
  docs_pendentes: "Documentos pendentes",
  exame_pendente: "Exame admissional pendente",
  exame_agendado: "Exame agendado",
  exame_realizado: "Exame realizado",
  encaminhado_juridico: "Encaminhado ao Jurídico",
  juridico_analise: "Análise jurídica",
  pronto_contabilidade: "Pronto para Contabilidade",
  enviado_contabilidade: "Enviado à Contabilidade",
  aguardando_contabilidade: "Aguardando Contabilidade",
  correcao_solicitada: "Correção solicitada",
  retorno_contabilidade: "Retorno da Contabilidade recebido",
  pronto_admissao: "Pronto para admissão",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function hiringStatusLabel(status: string): string {
  return HIRING_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}
