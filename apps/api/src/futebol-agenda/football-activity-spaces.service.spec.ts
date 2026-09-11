import { Prisma } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { FootballActivitySpacesService } from './football-activity-spaces.service';

describe('FootballActivitySpacesService.resolveByName', () => {
  let service: FootballActivitySpacesService;

  const prisma = {
    footballActivitySpace: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const tenants = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FootballActivitySpacesService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantsService, useValue: tenants },
      ],
    }).compile();
    service = module.get(FootballActivitySpacesService);
  });

  it('reutiliza espaço existente ativo sem criar', async () => {
    prisma.footballActivitySpace.findFirst.mockResolvedValue({
      id: 'space-1',
      active: true,
      name: 'Campo 1',
    });

    const id = await service.resolveByName('tenant-a', 'Campo 1');

    expect(id).toBe('space-1');
    expect(prisma.footballActivitySpace.create).not.toHaveBeenCalled();
  });

  it('reutiliza espaço existente inativo (unique tenantId+name)', async () => {
    prisma.footballActivitySpace.findFirst.mockResolvedValue({
      id: 'space-inactive',
      active: false,
      name: 'CT ATHLETICSAO JOAO DEL REI',
    });

    const id = await service.resolveByName('tenant-a', 'CT ATHLETICSAO JOAO DEL REI');

    expect(id).toBe('space-inactive');
    expect(prisma.footballActivitySpace.create).not.toHaveBeenCalled();
  });

  it('cria espaço ausente uma única vez', async () => {
    prisma.footballActivitySpace.findFirst.mockResolvedValue(null);
    prisma.footballActivitySpace.create.mockResolvedValue({ id: 'space-new' });

    const id = await service.resolveByName('tenant-a', '  Novo Espaço  ');

    expect(id).toBe('space-new');
    expect(prisma.footballActivitySpace.create).toHaveBeenCalledTimes(1);
    expect(prisma.footballActivitySpace.create).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-a', name: 'Novo Espaço' },
    });
  });

  it('sync repetido reutiliza sem duplicar', async () => {
    prisma.footballActivitySpace.findFirst.mockResolvedValue({
      id: 'space-1',
      active: true,
      name: 'Arena',
    });

    await service.resolveByName('tenant-a', 'Arena');
    await service.resolveByName('tenant-a', 'arena');

    expect(prisma.footballActivitySpace.create).not.toHaveBeenCalled();
    expect(prisma.footballActivitySpace.findFirst).toHaveBeenCalledTimes(2);
  });

  it('corrida de unique constraint reutiliza registro existente', async () => {
    prisma.footballActivitySpace.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'space-raced', active: true, name: 'Campo X' });
    prisma.footballActivitySpace.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['tenantId', 'name'] },
      }),
    );

    const id = await service.resolveByName('tenant-a', 'Campo X');

    expect(id).toBe('space-raced');
    expect(prisma.footballActivitySpace.create).toHaveBeenCalledTimes(1);
  });

  it('propaga falha real não relacionada ao unique constraint', async () => {
    prisma.footballActivitySpace.findFirst.mockResolvedValue(null);
    prisma.footballActivitySpace.create.mockRejectedValue(new Error('db offline'));

    await expect(service.resolveByName('tenant-a', 'Campo Y')).rejects.toThrow('db offline');
  });
});
