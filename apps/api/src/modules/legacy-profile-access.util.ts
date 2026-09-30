import { moduleMatrixRoleSlug } from './module-matrix-role.util';
import {
  isFootballManagementRole,
  isFootballOperationalModuleSlug,
} from './football-domain-access.util';
import { expandImplications } from './effective-access.util';

export type ModuleCatalogRow = {
  slug: string;
  impliesSlug: string | null;
  functionalArea: string | null;
};

/** Matriz ModuleRole + auto-grant Futebol (gestão) — fonte legada de perfil. */
export function computeLegacyProfileSlugs(
  role: string,
  matrixGrantSlugs: string[],
  catalog: ModuleCatalogRow[],
  allModuleSlugs: string[],
): string[] {
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));
  let slugs = expandImplications(matrixGrantSlugs, implications);
  if (isFootballManagementRole(role)) {
    const football = catalog
      .filter((m) => isFootballOperationalModuleSlug(m.slug, m.functionalArea))
      .map((m) => m.slug);
    slugs = expandImplications([...new Set([...slugs, ...football])], implications);
  }
  return slugs.filter((s) => allModuleSlugs.includes(s)).sort();
}

export function matrixRoleForAccess(role: string): string {
  return moduleMatrixRoleSlug(role);
}
