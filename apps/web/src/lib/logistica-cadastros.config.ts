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
  Plane,
  Receipt,
  Store,
  Tags,
  MapPinned,
  Navigation,
  Package,
  LifeBuoy,
} from "lucide-react";

export type LogisticaCadastroFieldType = "text" | "number" | "date" | "textarea" | "select" | "email";

export interface LogisticaCadastroField {
  key: string;
  label: string;
  type: LogisticaCadastroFieldType;
  required?: boolean;
  placeholder?: string;
  /** Opções fixas */
  selectOptions?: { value: string; label: string }[];
  /** API relativa em logistica-cadastros */
  selectFromApi?: "transport-companies" | "expense-categories" | "supplier-categories";
  min?: number;
}

export interface LogisticaCadastroColumn {
  key: string;
  label: string;
  format?: "date" | "guestType";
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
  /** Ordem no menu/hub (menor = primeiro) */
  menuOrder?: number;
}

/** Tipos de convidado / pessoa autorizada */
export const LOGISTICS_GUEST_TYPES = [
  { value: "FAMILIAR", label: "Familiar" },
  { value: "AUTORIDADE", label: "Autoridade" },
  { value: "PARCEIRO", label: "Parceiro" },
  { value: "IMPRENSA", label: "Imprensa" },
  { value: "CONVIDADO_ESPECIAL", label: "Convidado especial" },
  { value: "STAFF_EXTERNO", label: "Staff externo" },
  { value: "OUTRO", label: "Outro" },
] as const;

export function guestTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const found = LOGISTICS_GUEST_TYPES.find((t) => t.value === value);
  return found?.label ?? value;
}

/** Breadcrumb da seção Cadastros dentro de Logística */
export const LOGISTICA_CADASTROS_SECTION = "Cadastros";
export const LOGISTICA_CADASTROS_BREADCRUMB = `Logística → ${LOGISTICA_CADASTROS_SECTION}`;

/** Props serializáveis para client components (sem ícone Lucide). */
export type LogisticaCadastroResourceClient = Omit<LogisticaCadastroResource, "icon">;

export function toLogisticaCadastroResourceClient(
  resource: LogisticaCadastroResource,
): LogisticaCadastroResourceClient {
  const { icon: _icon, ...client } = resource;
  return client;
}

const LOGISTICA_CADASTRO_RESOURCES_RAW: LogisticaCadastroResource[] = [
  {
    slug: "aeroportos",
    label: "Aeroporto",
    labelPlural: "Aeroportos",
    description: "Aeroportos de embarque e desembarque com código IATA — reutilizados em viagens e passagens.",
    apiPath: "airports",
    icon: Plane,
    menuOrder: 10,
    columns: [
      { key: "name", label: "Nome" },
      { key: "code", label: "Código IATA" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: VITÓRIA" },
      { key: "code", label: "Código IATA", type: "text", placeholder: "Ex.: VIX" },
    ],
  },
  {
    slug: "categorias-despesas",
    label: "Categoria de despesa",
    labelPlural: "Categorias de despesas",
    description: "Classificação de despesas de viagem (alimentação, transporte, hospedagem, etc.).",
    apiPath: "expense-categories",
    icon: Receipt,
    menuOrder: 20,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: ALIMENTAÇÃO" }],
  },
  {
    slug: "categorias-fornecedores",
    label: "Categoria de fornecedor",
    labelPlural: "Categorias de fornecedores",
    description: "Tipos de fornecedor (hotel, restaurante, cia aérea, etc.) — compartilhado entre departamentos.",
    apiPath: "supplier-categories",
    icon: Tags,
    menuOrder: 30,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: HOTEL" }],
  },
  {
    slug: "fornecedores",
    label: "Fornecedor",
    labelPlural: "Fornecedores",
    description:
      "Cadastro global de fornecedores reutilizável por logística, compras e demais departamentos — evita recadastro.",
    apiPath: "suppliers",
    icon: Store,
    menuOrder: 40,
    columns: [
      { key: "name", label: "Nome" },
      { key: "category", label: "Categoria", nestedKey: "name" },
      { key: "phone", label: "Telefone" },
      { key: "contactName", label: "Contato" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      {
        key: "categoryId",
        label: "Categoria",
        type: "select",
        selectFromApi: "supplier-categories",
      },
      { key: "document", label: "CPF/CNPJ", type: "text" },
      { key: "contactName", label: "Nome do contato", type: "text" },
      { key: "email", label: "E-mail", type: "email", placeholder: "contato@empresa.com" },
      { key: "phone", label: "Telefone", type: "text", placeholder: "(31) 99999-9999" },
    ],
  },
  {
    slug: "convidados",
    label: "Pessoa autorizada",
    labelPlural: "Pessoas autorizadas",
    description:
      "Pessoas externas autorizadas a integrar viagens (familiares, autoridades, parceiros) com documentos e tipo.",
    apiPath: "guests",
    icon: Users,
    requiresTenant: true,
    menuOrder: 50,
    columns: [
      { key: "name", label: "Nome" },
      { key: "guestType", label: "Tipo", format: "guestType" },
      { key: "birthDate", label: "Data nasc.", format: "date" },
      { key: "phone", label: "Telefone" },
      { key: "rg", label: "RG/RNE" },
      { key: "cpf", label: "CPF/CNI" },
      { key: "passport", label: "Passaporte" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      {
        key: "guestType",
        label: "Tipo de convidado",
        type: "select",
        required: true,
        selectOptions: LOGISTICS_GUEST_TYPES.map(({ value, label }) => ({ value, label })),
      },
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
    slug: "apoio-logistico",
    label: "Apoio logístico",
    labelPlural: "Apoio logístico",
    description: "Locais de interesse próximos à concentração (farmácia, hospital, restaurante, supermercado, etc.).",
    apiPath: "points-of-interest",
    icon: LifeBuoy,
    menuOrder: 60,
    columns: [{ key: "name", label: "Local" }],
    fields: [{ key: "name", label: "Local", type: "text", required: true, placeholder: "Ex.: FARMÁCIA" }],
  },
  {
    slug: "destinos",
    label: "Destino",
    labelPlural: "Destinos",
    description: "Locais de saída e chegada reutilizáveis (CDT, cidades, estádios, bases de concentração).",
    apiPath: "destinations",
    icon: Navigation,
    menuOrder: 70,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: CDT - BOSTON CITY" }],
  },
  {
    slug: "servicos-produtos",
    label: "Serviço/produto",
    labelPlural: "Serviços e produtos",
    description: "Itens de despesa padronizados vinculados à categoria (receptivo, diárias, fretamento, etc.).",
    apiPath: "service-products",
    icon: Package,
    menuOrder: 80,
    columns: [
      { key: "name", label: "Serviço/produto" },
      { key: "expenseCategory", label: "Categoria despesa", nestedKey: "name" },
    ],
    fields: [
      { key: "name", label: "Serviço/produto", type: "text", required: true },
      {
        key: "expenseCategoryId",
        label: "Categoria de despesa",
        type: "select",
        selectFromApi: "expense-categories",
      },
    ],
  },
  {
    slug: "companhias-transporte",
    label: "Transportadora",
    labelPlural: "Transportadoras",
    description: "Empresas de transporte aéreo, ônibus clube e fretado — usadas em viagens e passagens.",
    apiPath: "transport-companies",
    icon: Truck,
    menuOrder: 90,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: AZUL" }],
  },
  {
    slug: "momentos-uso",
    label: "Finalidade do deslocamento",
    labelPlural: "Finalidades do deslocamento",
    description: "Motivo da viagem ou deslocamento (jogo, treino, concentração, etc.).",
    apiPath: "usage-moments",
    icon: Clock,
    menuOrder: 100,
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
    menuOrder: 110,
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
    menuOrder: 120,
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
    menuOrder: 130,
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
    menuOrder: 140,
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
    menuOrder: 150,
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

export const LOGISTICA_CADASTRO_RESOURCES: LogisticaCadastroResource[] = [...LOGISTICA_CADASTRO_RESOURCES_RAW].sort(
  (a, b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999),
);

export function getLogisticaCadastroResource(slug: string): LogisticaCadastroResource | undefined {
  return LOGISTICA_CADASTRO_RESOURCES.find((r) => r.slug === slug);
}

export function assertLogisticaCadastroResource(slug: string): LogisticaCadastroResource {
  const resource = getLogisticaCadastroResource(slug);
  if (!resource) throw new Error("Cadastro não encontrado");
  return resource;
}

export const LOGISTICA_CADASTROS_BASE = "/dashboard/futebol/logistica/cadastros";
