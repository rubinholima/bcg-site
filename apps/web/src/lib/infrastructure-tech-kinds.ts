/** Categorias de patrimônio com aba Infraestrutura (espelha API). */
export const TECHNOLOGY_ASSET_KINDS = [
  "it_equipment",
  "infrastructure",
  "audiovisual",
  "security",
] as const;

export function isTechnologyAssetKind(kind: string | null | undefined): boolean {
  if (!kind) return false;
  return (TECHNOLOGY_ASSET_KINDS as readonly string[]).includes(kind);
}

export const INFRA_NAV = [
  { href: "/dashboard/requisicoes/infraestrutura", label: "Dashboard", exact: true },
  { href: "/dashboard/requisicoes/infraestrutura/rede", label: "Rede" },
  { href: "/dashboard/requisicoes/infraestrutura/topologia", label: "Topologia" },
  { href: "/dashboard/requisicoes/infraestrutura/backbone", label: "Backbone" },
  { href: "/dashboard/requisicoes/infraestrutura/racks", label: "Racks" },
  { href: "/dashboard/requisicoes/infraestrutura/documentacao", label: "Documentação" },
  { href: "/dashboard/requisicoes/infraestrutura/credenciais", label: "Credenciais" },
  { href: "/dashboard/requisicoes/infraestrutura/backups", label: "Backups" },
  { href: "/dashboard/requisicoes/infraestrutura/disaster-recovery", label: "Disaster Recovery" },
  { href: "/dashboard/requisicoes/infraestrutura/monitoramento", label: "Monitoramento" },
  { href: "/dashboard/requisicoes/infraestrutura/configuracoes", label: "Configurações" },
] as const;
