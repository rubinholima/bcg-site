import { ModulesService } from './modules.service';
import { EffectiveAccessService } from './effective-access.service';

describe('ModulesService — super_admin', () => {
  const allSlugs = ['dashboard', 'medico', 'configuracoes', 'futebol_tryouts'];

  function makeService() {
    const prisma = {
      module: {
        findMany: jest.fn().mockResolvedValue(allSlugs.map((slug) => ({ slug }))),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 'u1' }),
      },
    };
    const effectiveAccess = {
      getEffectiveSlugsForUser: jest.fn().mockResolvedValue(['dashboard']),
      getEffectiveSlugsForRole: jest.fn(),
    } as unknown as EffectiveAccessService;
    const rolesService = { getManagedRoleSlugs: jest.fn().mockResolvedValue([]) };
    const service = new ModulesService(prisma as never, rolesService as never, effectiveAccess);
    return { service, effectiveAccess, prisma };
  }

  it('getSlugsForUser ignora função/overrides e retorna catálogo completo', async () => {
    const { service, effectiveAccess } = makeService();
    const slugs = await service.getSlugsForUser('u1', 'super_admin');
    expect(slugs.sort()).toEqual([...allSlugs].sort());
    expect(effectiveAccess.getEffectiveSlugsForUser).not.toHaveBeenCalled();
  });

  it('getSlugsForActor retorna catálogo completo mesmo com usuário convertido', async () => {
    const { service, effectiveAccess } = makeService();
    const slugs = await service.getSlugsForActor('cognito-sub', 'super_admin');
    expect(slugs.sort()).toEqual([...allSlugs].sort());
    expect(effectiveAccess.getEffectiveSlugsForUser).not.toHaveBeenCalled();
  });
});
