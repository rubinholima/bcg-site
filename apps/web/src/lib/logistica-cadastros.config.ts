import type { LucideIcon } from "lucide-react";
import {
  Truck,
  Users,
  Clock,
  Star,
  CreditCard,
  Hotel,
  FileText,
  Building2,
} from "lucide-react";

export type LogisticaCadastroFieldType = "text" | "number" | "date" | "textarea" | "select";

export interface LogisticaCadastroField {
  key: string;
  label: string;
  type: LogisticaCadastroFieldType;
  required?: boolean;
  placeholder?: string;
  /** Opções fixas ou API relativa em logistica-cadastros */
  selectOptions?: { value: string; label: string }[];
  selectFromApi?: "transport-companies";
  min?: number;
}

export interface LogisticaCadastroColumn {
  key: string;
  label: string;
  format?: "date";
  /** nested key ex.: transportCompany.name */
  nestedKey?: string;
}

export interface LogisticaCadastroResource {
  slug: string;
  label: string;
  labelPlural: string;
  description: string;
  apiPath: string;
  icon: LucideIcon;
  columns: LogisticaCadastroColumn[];
  fields: LogisticaCadastroField[];
  /** Pessoas autorizadas exigem tenantId */
  requiresTenant?: boolean;
}

/** Nomenclatura BCG — seção de referências auxiliares da logística (não espelhar Beatscode). */
export const LOGISTICA_REFERENCIAS_SECTION = "Referências";
export const LOGISTICA_REFERENCIAS_BREADCRUMB = `Logística → ${LOGISTICA_REFERENCIAS_SECTION}`;

export const LOGISTICA_CADASTRO_RESOURCES: LogisticaCadastroResource[] = [
  {
    slug: "companhias-transporte",
    label: "Transportadora",
    labelPlural: "Transportadoras",
    description: "Empresas de transporte aéreo, ônibus clube e fretado — usadas em viagens e passagens.",
    apiPath: "transport-companies",
    icon: Truck,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: AZUL" }],
  },
  {
    slug: "convidados",
    label: "Pessoa autorizada",
    labelPlural: "Pessoas autorizadas",
    description:
      "Pessoas externas autorizadas a integrar viagens (familiares, autoridades, parceiros) com documentos.",
    apiPath: "guests",
    icon: Users,
    requiresTenant: true,
    columns: [
      { key: "name", label: "Nome" },
      { key: "birthDate", label: "Data nasc.", format: "date" },
      { key: "phone", label: "Telefone" },
      { key: "rg", label: "RG/RNE" },
      { key: "cpf", label: "CPF/CNI" },
      { key: "passport", label: "Passaporte" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "birthDate", label: "Data de nascimento", type: "date" },
      { key: "phone", label: "Telefone", type: "text", placeholder: "(31) 99999-9999" },
      { key: "rg", label: "RG / RNE", type: "text" },
      { key: "rgIssuer", label: "Órgão expedidor", type: "text", placeholder: "Ex.: SSPMG" },
      { key: "cpf", label: "CPF / CNI", type: "text" },
      { key: "passport", label: "Passaporte", type: "text" },
      { key: "passportExpiry", label: "Validade do passaporte", type: "date" },
      { key: "notes", label: "Observações", type: "textarea" },
    ],
  },
  {
    slug: "momentos-uso",
    label: "Finalidade do deslocamento",
    labelPlural: "Finalidades do deslocamento",
    description: "Motivo da viagem ou deslocamento (jogo, treino, concentração, etc.).",
    apiPath: "usage-moments",
    icon: Clock,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: JOGO" }],
  },
  {
    slug: "programas-fidelidade",
    label: "Programa de milhas",
    labelPlural: "Programas de milhas",
    description: "Programas de milhas e benefícios das transportadoras (Tudo Azul, Smiles, etc.).",
    apiPath: "loyalty-programs",
    icon: Star,
    columns: [
      { key: "name", label: "Nome" },
      { key: "transportCompany", label: "Transportadora", nestedKey: "name" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      {
        key: "transportCompanyId",
        label: "Transportadora",
        type: "select",
        selectFromApi: "transport-companies",
      },
    ],
  },
  {
    slug: "tipos-pagamento",
    label: "Forma de pagamento",
    labelPlural: "Formas de pagamento",
    description: "Meios de pagamento em despesas de logística.",
    apiPath: "payment-types",
    icon: CreditCard,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true }],
  },
  {
    slug: "tipos-quarto",
    label: "Categoria de acomodação",
    labelPlural: "Categorias de acomodação",
    description: "Tipos de quarto e capacidade para hospedagem em viagens.",
    apiPath: "room-types",
    icon: Hotel,
    columns: [
      { key: "name", label: "Nome" },
      { key: "capacity", label: "Capacidade" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: SINGLE" },
      { key: "capacity", label: "Capacidade", type: "number", required: true, min: 1, placeholder: "1" },
    ],
  },
  {
    slug: "tipos-visto",
    label: "Visto internacional",
    labelPlural: "Vistos internacionais",
    description: "Classificação de vistos para deslocamentos internacionais.",
    apiPath: "visa-types",
    icon: FileText,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true }],
  },
  {
    slug: "hoteis",
    label: "Hospedagem",
    labelPlural: "Rede de hospedagem",
    description: "Hotéis e estabelecimentos reutilizáveis em viagens e convocações.",
    apiPath: "hotels",
    icon: Building2,
    columns: [
      { key: "name", label: "Nome" },
      { key: "city", label: "Cidade" },
      { key: "phone", label: "Telefone" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      { key: "city", label: "Cidade", type: "text" },
      { key: "state", label: "Estado", type: "text" },
      { key: "country", label: "País", type: "text" },
      { key: "address", label: "Endereço", type: "textarea" },
      { key: "phone", label: "Telefone", type: "text" },
    ],
  },
];

export function getLogisticaCadastroResource(slug: string): LogisticaCadastroResource | undefined {
  return LOGISTICA_CADASTRO_RESOURCES.find((r) => r.slug === slug);
}

export function assertLogisticaCadastroResource(slug: string): LogisticaCadastroResource {
  const resource = getLogisticaCadastroResource(slug);
  if (!resource) throw new Error("Cadastro não encontrado");
  return resource;
}

export const LOGISTICA_CADASTROS_BASE = "/dashboard/futebol/logistica/cadastros";
