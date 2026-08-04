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
  MapPinned,
  Navigation,
  Package,
  LifeBuoy,
  Shirt,
  Layers,
  Tag,
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
  selectFromApi?:
    | "transport-companies"
    | "expense-categories"
    | "clothing-groups"
    | "clothing-categories"
    | "uniform-types";
  min?: number;
}

export interface LogisticaCadastroColumn {
  key: string;
  label: string;
  format?: "date" | "guestType" | "image";
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
  {
    slug: "grupos-roupas",
    label: "Grupo de roupa",
    labelPlural: "Grupos de roupa",
    description: "Grupos (superiores, inferiores, calçados/meias) para classificar peças.",
    apiPath: "clothing-groups",
    icon: Shirt,
    menuOrder: 160,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: Roupas Superiores" }],
  },
  {
    slug: "categorias-roupas",
    label: "Categoria de roupa",
    labelPlural: "Categorias de roupas",
    description: "Tipos de peça (camiseta, calção, meião…) vinculados a um grupo.",
    apiPath: "clothing-categories",
    icon: Layers,
    menuOrder: 170,
    columns: [
      { key: "name", label: "Nome" },
      { key: "group", label: "Grupo", nestedKey: "name" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: Camisetas" },
      {
        key: "groupId",
        label: "Grupo de roupa",
        type: "select",
        required: true,
        selectFromApi: "clothing-groups",
      },
    ],
  },
  {
    slug: "tipos-uniforme",
    label: "Tipo de uniforme",
    labelPlural: "Tipos de uniforme",
    description: "Momento de uso do uniforme: jogo, viagem, treino, passeio.",
    apiPath: "uniform-types",
    icon: Tag,
    menuOrder: 180,
    columns: [{ key: "name", label: "Nome" }],
    fields: [{ key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: Jogo" }],
  },
  {
    slug: "roupas",
    label: "Roupa",
    labelPlural: "Roupas",
    description: "Peças individuais com imagem, temporada e tipo de uso.",
    apiPath: "clothing-items",
    icon: Shirt,
    menuOrder: 190,
    columns: [
      { key: "imageUrl", label: "Imagem", format: "image" },
      { key: "name", label: "Nome" },
      { key: "group", label: "Grupo", nestedKey: "name" },
      { key: "category", label: "Categoria", nestedKey: "name" },
      { key: "uniformType", label: "Tipo", nestedKey: "name" },
      { key: "season", label: "Temporada" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true },
      {
        key: "groupId",
        label: "Grupo",
        type: "select",
        selectFromApi: "clothing-groups",
      },
      {
        key: "categoryId",
        label: "Categoria",
        type: "select",
        selectFromApi: "clothing-categories",
      },
      {
        key: "uniformTypeId",
        label: "Tipo de uniforme",
        type: "select",
        selectFromApi: "uniform-types",
      },
      { key: "season", label: "Temporada", type: "text", placeholder: "Ex.: 2025" },
      { key: "imageUrl", label: "URL da imagem", type: "text", placeholder: "/media/logistica-uniforms/…" },
    ],
  },
  {
    slug: "kits-uniforme",
    label: "Kit / uniforme",
    labelPlural: "Kits / uniformes",
    description: "Conjuntos (KIT) usados na convocação — jogo CT, viagem atleta, goleiro etc.",
    apiPath: "uniform-kits",
    icon: Package,
    menuOrder: 200,
    columns: [
      { key: "imageUrl", label: "Imagem", format: "image" },
      { key: "name", label: "Nome" },
      { key: "uniformType", label: "Tipo", nestedKey: "name" },
      { key: "season", label: "Temporada" },
    ],
    fields: [
      { key: "name", label: "Nome", type: "text", required: true, placeholder: "Ex.: Uniforme 1" },
      {
        key: "uniformTypeId",
        label: "Tipo de uniforme",
        type: "select",
        selectFromApi: "uniform-types",
      },
      { key: "season", label: "Temporada", type: "text", placeholder: "Ex.: 2025" },
      { key: "imageUrl", label: "URL da imagem", type: "text" },
      { key: "description", label: "Descrição", type: "textarea" },
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
