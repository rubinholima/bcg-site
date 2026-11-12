export const PAYSLIP_STATUS_LABELS: Record<string, string> = {
  PENDENTE_DE_SEPARACAO: "Pendente de separação",
  SEPARADO: "Separado",
  EM_CONFERENCIA: "Em conferência",
  APROVADO: "Aprovado",
  DISPONIBILIZADO: "Disponibilizado",
  CIENCIA_PENDENTE: "Ciência pendente",
  CIENCIA_REALIZADA: "Ciência realizada",
  CORRECAO_NECESSARIA: "Correção necessária",
};

export const TIME_OCCURRENCE_TREATMENTS = [
  { value: "DESCONTO_FOLHA", label: "Desconto em folha" },
  { value: "ABATER_BANCO_HORAS", label: "Abater do banco de horas" },
  { value: "JUSTIFICADA", label: "Justificada" },
  { value: "PAGAR_HORA_EXTRA", label: "Pagar hora extra" },
  { value: "BANCO_HORAS_CREDITO", label: "Crédito no banco de horas" },
  { value: "OUTRO", label: "Outro" },
] as const;

export const EPI_DELIVERY_STATUS_LABELS: Record<string, string> = {
  ENTREGUE: "Entregue",
  PENDENTE: "Pendente",
  DEVOLVIDO: "Devolvido",
  PERDIDO: "Perdido",
  SUBSTITUIDO: "Substituído",
};

export const RH_TAB_LABELS = {
  colaboradores: "Colaboradores",
  folha: "Folha de Pagamento",
  contracheques: "Contracheques",
  controlePonto: "Controle de Ponto",
  epi: "EPI",
  contratacoes: "Contratações",
  aprovacoes: "Aprovações",
  departamentos: "Departamentos",
  cargos: "Cargos",
  vinculos: "Vínculos",
  ferias: "Férias",
} as const;
