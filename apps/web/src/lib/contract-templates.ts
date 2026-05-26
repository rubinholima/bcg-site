import { CONTRACT_TEMPLATE_TYPES, filterTemplatesForEmployment } from "./contract-template-types";

export interface ContractTemplateRow {
  id: string;
  tenantId: string | null;
  name: string;
  type: string;
  fileKey: string;
  fileUrl: string | null;
  pdfFieldNames: string[] | null;
  fieldMapping: Record<string, string> | null;
  signaturePage: number;
  pageCount: number | null;
  active: boolean;
  notes: string | null;
  tenant?: { id: string; name: string; slug: string } | null;
  _count?: { contracts: number };
}

export interface EmploymentContractRow {
  id: string;
  employmentId: string;
  templateId: string;
  name: string;
  fileUrl: string | null;
  signedFileUrl: string | null;
  status: string;
  signerEmail: string | null;
  signerName: string | null;
  helloSignRequestId: string | null;
  metadata?: { signingUrl?: string } | null;
  createdAt: string;
  template?: { id: string; name: string; type: string; signaturePage?: number };
  tenant?: { id: string; name: string };
  employment?: {
    id: string;
    contractType: string;
    employee?: { id: string; name: string; email?: string | null };
    jobRole?: { name: string };
  };
}

export const CONTRACT_TEMPLATE_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(CONTRACT_TEMPLATE_TYPES.map((t) => [t.value, t.label])),
  contrato_trabalho: "Contrato de trabalho",
  contrato_imagem: "Contrato de imagem",
  procuracao: "Procuração",
  nda: "NDA / Confidencialidade",
};

export { CONTRACT_TEMPLATE_TYPES, filterTemplatesForEmployment };

export const EMPLOYMENT_CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  pending_signature: "Aguardando assinatura",
  signed: "Assinado",
  expired: "Expirado",
  cancelled: "Cancelado",
};

export const CONTRACT_DATA_FIELD_CATALOG = [
  { key: "employee.name", label: "Nome completo" },
  { key: "employee.type", label: "Tipo de colaborador (funcionário, estágio…)" },
  { key: "employee.code", label: "Matrícula RH" },
  { key: "employee.cpf", label: "CPF" },
  { key: "employee.rg", label: "RG" },
  { key: "employee.email", label: "E-mail" },
  { key: "employee.phone", label: "Telefone" },
  { key: "employee.birthDate", label: "Data de nascimento" },
  { key: "employee.pisNumber", label: "PIS" },
  { key: "employee.voterTitle", label: "Título de eleitor" },
  { key: "employee.pixKey", label: "Chave PIX" },
  { key: "employee.ctpsUrl", label: "CTPS digital (URL)" },
  { key: "employee.addressFull", label: "Endereço completo" },
  { key: "employee.addressStreet", label: "Logradouro" },
  { key: "employee.addressNumber", label: "Número" },
  { key: "employee.addressNeighborhood", label: "Bairro" },
  { key: "employee.addressCity", label: "Cidade" },
  { key: "employee.addressState", label: "UF" },
  { key: "employee.addressZip", label: "CEP" },
  { key: "employment.contractType", label: "Tipo de contrato do vínculo" },
  { key: "employment.startDate", label: "Data de admissão / início" },
  { key: "employment.endDate", label: "Data de término" },
  { key: "employment.salaryBase", label: "Salário / bolsa / remuneração" },
  { key: "employment.status", label: "Status do vínculo" },
  { key: "employment.notes", label: "Observações do vínculo" },
  { key: "employment.bankName", label: "Banco" },
  { key: "employment.bankAgency", label: "Agência" },
  { key: "employment.bankAccount", label: "Conta bancária" },
  { key: "employment.cbfRegistration", label: "Nº registro CBF (atleta)" },
  { key: "employment.contractValidity", label: "Validade contrato atleta" },
  { key: "jobRole.name", label: "Cargo" },
  { key: "department.name", label: "Departamento" },
  { key: "tenant.name", label: "Empresa / Clube" },
  { key: "today", label: "Data de hoje" },
] as const;
