import { PrismaClient } from '@prisma/client';
import { resolveEffectiveModuleSlugs, expandImplications } from '../src/modules/effective-access.util';

const prisma = new PrismaClient();

async function effectiveFor(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { moduleOverrides: { include: { module: true } }, platformFunction: true },
  });
  if (!user) return null;
  const catalog = await prisma.module.findMany({ select: { slug: true, impliesSlug: true } });
  const all = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));
  const fnId = user.platformFunctionId;
  const defs = fnId
    ? await prisma.jobRoleModuleDefault.findMany({
        where: { jobRoleId: fnId },
        include: { module: true },
      })
    : [];
  const base = defs.map((d) => d.module.slug);
  const overrides = user.moduleOverrides.map((o) => ({
    slug: o.module.slug,
    effect: o.effect as 'allow' | 'deny',
  }));
  const slugs = resolveEffectiveModuleSlugs({
    role: user.role ?? 'editor',
    allModuleSlugs: all,
    implications,
    baseSlugs: base,
    overrides,
  });
  return { email: user.email, role: user.role, fn: user.platformFunction?.name, count: slugs.length, slugs };
}

async function main() {
  const ids = ['cmqqn03ej000op8oq0f00sxpk', 'cmqqn0v40000pp8oqve8wd2pr'];
  for (const id of ids) {
    const r = await effectiveFor(id);
    if (!r) continue;
    const has = (p: string) => r.slugs.some((s) => s.includes(p));
    console.log(
      JSON.stringify({
        email: r.email,
        function: r.fn,
        effectiveCount: r.count,
        medico: r.slugs.includes('medico'),
        negociados: has('negociados'),
        tryouts: has('tryouts'),
        captacao: has('captacao'),
        prep_fisica: has('preparacao_fisica'),
        treinador_goleiros: has('treinador_goleiros'),
        prontuarioRoute: has('prontuario') || r.slugs.includes('medico'),
      }),
    );
  }
}

main()
  .finally(() => prisma.$disconnect());
