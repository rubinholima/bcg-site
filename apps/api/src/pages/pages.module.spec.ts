import { Test, TestingModule } from '@nestjs/testing';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { ModulesService } from '../modules/modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { PagesModule } from './pages.module';

const modulesServiceMock = {
  userHasModuleAccess: jest.fn(),
  getSlugsForRole: jest.fn(),
};

describe('PagesModule DI', () => {
  it('resolve ModuleAccessGuard e ModulesService no contexto do módulo', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PagesModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(RolesService)
      .useValue({})
      .overrideProvider(UsersService)
      .useValue({})
      .overrideProvider(ModulesService)
      .useValue(modulesServiceMock)
      .compile();

    expect(moduleRef.get(ModuleAccessGuard, { strict: false })).toBeInstanceOf(ModuleAccessGuard);
    expect(moduleRef.get(ModulesService, { strict: false })).toBe(modulesServiceMock);
  });
});
