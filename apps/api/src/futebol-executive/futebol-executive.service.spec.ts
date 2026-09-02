import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FutebolExecutiveService } from './futebol-executive.service';
import { PrismaService } from '../prisma/prisma.service';
import { ModulesService } from '../modules/modules.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import { PhysioTryoutClearanceService } from '../fisioterapia/physio-tryout-clearance.service';
import { canAccessExecutiveDashboard } from './futebol-executive-access.util';

describe('canAccessExecutiveDashboard', () => {
  it('permite gestão futebol com módulo operacional', () => {
    expect(canAccessExecutiveDashboard('gerente', ['tipos', 'futebol_logistica'])).toBe(true);
    expect(canAccessExecutiveDashboard('supervisor', ['futebol_captacao'])).toBe(true);
  });

  it('permite diretoria com módulo diretoria', () => {
    expect(canAccessExecutiveDashboard('diretoria', ['diretoria'])).toBe(true);
  });

  it('nega usuário básico', () => {
    expect(canAccessExecutiveDashboard('user', ['tipos'])).toBe(false);
    expect(canAccessExecutiveDashboard('treinador', ['futebol_treinadores'])).toBe(false);
  });
});

describe('FutebolExecutiveService', () => {
  let service: FutebolExecutiveService;

  const prisma = {
    purchaseRequisition: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    scoutingProspect: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    registrationInvite: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    legalDocument: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    player: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    playerDisciplineOpening: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    playerMedicalDeparture: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    fmfMatchReport: { findMany: jest.fn().mockResolvedValue([]) },
    travelLogistics: { findMany: jest.fn().mockResolvedValue([]) },
    footballAgendaEntry: { findMany: jest.fn().mockResolvedValue([]) },
    physioSession: { count: jest.fn().mockResolvedValue(0) },
    physioTransitionProgram: { count: jest.fn().mockResolvedValue(0) },
    physioPlayerEvaluation: { count: jest.fn().mockResolvedValue(0) },
    coachPlayerEvaluation: { count: jest.fn().mockResolvedValue(0) },
    financeiroLancamento: { count: jest.fn().mockResolvedValue(0) },
  };

  const modulesService = {
    getSlugsForActor: jest.fn(),
  };

  const tenantAccess = {
    getAllowedTenantIds: jest.fn().mockResolvedValue(['tenant-1']),
  };

  const physioTryout = {
    getOperationalStatusForProspect: jest.fn().mockResolvedValue({ status: 'aprovado', canStartFieldEvaluation: true }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    modulesService.getSlugsForActor.mockResolvedValue(['tipos', 'futebol_logistica', 'futebol_captacao']);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FutebolExecutiveService,
        { provide: PrismaService, useValue: prisma },
        { provide: ModulesService, useValue: modulesService },
        { provide: TenantAccessService, useValue: tenantAccess },
        { provide: PhysioTryoutClearanceService, useValue: physioTryout },
      ],
    }).compile();

    service = module.get(FutebolExecutiveService);
  });

  it('nega acesso sem perfil executivo', async () => {
    modulesService.getSlugsForActor.mockResolvedValue(['futebol_treinadores']);
    await expect(service.getDashboard('u1', 'treinador', {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('agrega dashboard para gestor', async () => {
    const result = await service.getDashboard('u1', 'gerente', { periodDays: 14 });
    expect(result.generatedAt).toBeTruthy();
    expect(result.kpis).toBeInstanceOf(Array);
    expect(result.decisions).toBeInstanceOf(Array);
    expect(result.alerts).toBeInstanceOf(Array);
    expect(result.quickActions.length).toBeGreaterThan(0);
  });

  it('nega tenant fora do escopo', async () => {
    tenantAccess.getAllowedTenantIds.mockResolvedValue(['tenant-1']);
    await expect(
      service.getDashboard('u1', 'gerente', { tenantId: 'tenant-x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
