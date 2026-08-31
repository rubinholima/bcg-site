import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Rotas de lista por entidade em Cadastros → Futebol. */
export const CADASTRO_LIST_HREFS = {
  categorias: "/dashboard/cadastros/categorias",
  campeonatos: "/dashboard/cadastros/campeonatos",
  estadios: "/dashboard/cadastros/estadios",
  times: "/dashboard/cadastros/times",
  tipos: "/dashboard/cadastros/tipos",
  arbitros: "/dashboard/cadastros/arbitros",
  jogadores: "/dashboard/cadastros/jogadores",
} as const;

export type CadastroEntityKey = keyof typeof CADASTRO_LIST_HREFS;

/**
 * Voltar de formulários CRUD para a lista da entidade.
 * Não usa histórico do browser — destino determinístico.
 */
export function resolveCadastroListBackHref(pathname: string): string | undefined {
  const clean = pathname.split("?")[0]!;
  const match = clean.match(/^\/dashboard\/cadastros\/([^/]+)(\/.*)?$/);
  if (!match) return undefined;

  const entity = match[1]!;
  const rest = match[2] ?? "";
  const listHref = `/dashboard/cadastros/${entity}`;

  if (!rest) return undefined;
  if (rest === "/arquivo" || rest === "/emprestados") return undefined;

  return listHref;
}

/** Após salvar/criar: retorna à lista com banner de sucesso. */
export function finishCadastroSave(router: AppRouterInstance, listHref: string) {
  router.push(`${listHref}?success=true`);
}
