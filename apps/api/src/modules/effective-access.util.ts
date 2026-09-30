export type ModuleOverrideEffect = 'allow' | 'deny';

export type ModuleImplication = { slug: string; impliesSlug?: string | null };

export type EffectiveAccessInput = {
  role: string | null;
  allModuleSlugs: string[];
  implications: ModuleImplication[];
  baseSlugs: string[];
  overrides: Array<{ slug: string; effect: ModuleOverrideEffect }>;
  isSuperAdmin?: boolean;
};

/** Defaults da função + ALLOW − DENY. Fail-closed. */
export function resolveEffectiveModuleSlugs(input: EffectiveAccessInput): string[] {
  if (input.isSuperAdmin || input.role === 'super_admin') {
    return [...input.allModuleSlugs];
  }

  const implied = expandImplications(input.baseSlugs, input.implications);
  const set = new Set(implied);

  for (const o of input.overrides) {
    if (!o.slug) continue;
    if (o.effect === 'allow') {
      set.add(o.slug);
      for (const extra of expandImplications([o.slug], input.implications)) {
        set.add(extra);
      }
    } else if (o.effect === 'deny') {
      set.delete(o.slug);
      const impliedSlug = input.implications.find((m) => m.slug === o.slug)?.impliesSlug;
      if (impliedSlug) set.delete(impliedSlug);
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
