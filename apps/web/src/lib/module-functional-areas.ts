/**
 * Chaves de agrupamento funcional (Module.functionalArea no banco).
 * Ordem de exibição na tela de permissões.
 */
export const MODULE_AREA_ORDER = [
  "estrategico",
  "empresa_usuarios",
  "futebol_cadastro",
  "futebol_tecnico",
  "saude_dados_sensiveis",
  "conteudo_midia",
  "adm_departamentos",
  "ferramentas",
  "relatorios_socio",
  "sistema",
  "outros",
] as const;

export type ModuleAreaKey = (typeof MODULE_AREA_ORDER)[number];

export const MODULE_AREA_META: Record<
  ModuleAreaKey,
  { title: string; description: string }
> = {
  estrategico: {
    title: "Visão estratégica",
    description: "Painéis de grupo, dashboard e diretoria.",
  },
  empresa_usuarios: {
    title: "Empresa e acesso",
    description: "Empresas, usuários e governança de quem entra no sistema.",
  },
  futebol_cadastro: {
    title: "Futebol — cadastros",
    description: "Atletas, categorias, competições e bases esportivas.",
  },
  futebol_tecnico: {
    title: "Futebol — operação técnica",
    description: "Comissão, fisiologia, desempenho e logística.",
  },
  saude_dados_sensiveis: {
    title: "Saúde e dados sensíveis",
    description: "Médico, psicologia e jurídico (LGPD e confidencialidade).",
  },
  conteudo_midia: {
    title: "Conteúdo e mídia",
    description: "Páginas, notícias, mídia, eventos e marketing.",
  },
  adm_departamentos: {
    title: "Administrativo & financeiro",
    description: "Financeiro, compras, estoque, RH, patrimônio e nutrição.",
  },
  ferramentas: {
    title: "Ferramentas",
    description: "E-mail corporativo e cofre de senhas (níveis de operação).",
  },
  relatorios_socio: {
    title: "Relatórios e sócio-torcedor",
    description: "BI e programa de sócios.",
  },
  sistema: {
    title: "Sistema",
    description: "Configurações gerais da plataforma.",
  },
  outros: {
    title: "Outros",
    description: "Módulos sem classificação (novos recursos ou legado).",
  },
};

export function getAreaMeta(area: string): { title: string; description: string } {
  if (area in MODULE_AREA_META) {
    return MODULE_AREA_META[area as ModuleAreaKey];
  }
  return {
    title: area,
    description: MODULE_AREA_META.outros.description,
  };
}

export function sortAreaKeys(areas: string[]): string[] {
  const order = new Map<string, number>(MODULE_AREA_ORDER.map((k, i) => [k, i]));
  return [...new Set(areas)].sort((a, b) => {
    const ia = order.get(a) ?? 999;
    const ib = order.get(b) ?? 999;
    if (ia !== ib) return ia - ib;
    return a.localeCompare(b);
  });
}
