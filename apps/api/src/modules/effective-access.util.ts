export type ModuleOverrideEffect = 'allow' | 'deny';

export type ModuleImplication = { slug: string; impliesSlug?: string | null };

export type EffectiveAccessInput = {
  role: string | null;
  allModuleSlugs: string[];
  implications: ModuleImplication[];
  /** Defaults da função CUP360 (JobRoleModuleDefault). */
  baseSlugs: string[];
  /**
   * Transição: permissões ainda ativas na matriz ModuleRole / perfil legado (PlatformRole).
   * União com baseSlugs — nunca reduz acesso só porque a função existe.
   */
  legacyProfileSlugs?: string[];
  overrides: Array<{ slug: string; effect: ModuleOverrideEffect }>;
  isSuperAdmin?: boolean;
};

/**
 * Composição efetiva (transição):
 *   expand(baseSlugs ∪ legacyProfileSlugs) − DENY + ALLOW
 * super_admin: todos os módulos.
 */
export function resolveEffectiveModuleSlugs(input: EffectiveAccessInput): string[] {
  if (input.isSuperAdmin || input.role === 'super_admin') {
    return [...input.allModuleSlugs];
  }

  const mergedBase = [
    ...new Set([...input.baseSlugs, ...(input.legacyProfileSlugs ?? [])]),
  ];
  const implied = expandImplications(mergedBase, input.implications);
  const set = new Set(implied);

  const allows = input.overrides.filter((o) => o.effect === 'allow' && o.slug);
  const denies = input.overrides.filter((o) => o.effect === 'deny' && o.slug);

  for (const o of denies) {
    set.delete(o.slug!);
    const impliedSlug = input.implications.find((m) => m.slug === o.slug)?.impliesSlug;
    if (impliedSlug) set.delete(impliedSlug);
  }

  for (const o of allows) {
    set.add(o.slug!);
    for (const extra of expandImplications([o.slug!], input.implications)) {
      set.add(extra);
    }
  }

  return [...set].filter((s) => input.allModuleSlugs.includes(s)).sort();
}

export function expandImplications(slugs: string[], implications: ModuleImplication[]): string[] {
  const out = new Set(slugs);
  for (const s of slugs) {
    const row = implications.find((m) => m.slug === s);
    if (row?.impliesSlug) out.add(row.impliesSlug);
  }
  return [...out];
}
