import { BadRequestException } from '@nestjs/common';
import { PhysioTryoutClearanceService } from './physio-tryout-clearance.service';

describe('PhysioTryoutClearanceService gate', () => {
  const envSnapshot = { ...process.env };
  const mail = { sendMail: jest.fn() };

  afterEach(() => {
    process.env = { ...envSnapshot };
    jest.resetAllMocks();
  });

  it('bloqueia início de avaliação CT sem clearance aprovado', async () => {
    const prisma = {
      physioTryoutClearance: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new PhysioTryoutClearanceService(prisma as never, mail as never);
    await expect(service.assertCanStartCtFieldEvaluation('prospect-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('permite início quando clearance aprovado', async () => {
    const prisma = {
      physioTryoutClearance: {
        findFirst: jest.fn().mockResolvedValue({ outcome: 'aprovado' }),
      },
    };
    const service = new PhysioTryoutClearanceService(prisma as never, mail as never);
    await expect(service.assertCanStartCtFieldEvaluation('prospect-1')).resolves.toBeUndefined();
  });

  it('liberação try-out envia e-mail operacional para gerente@bostoncityfc.com', async () => {
    delete process.env.CAPTACAO_MANAGER_EMAIL;
    mail.sendMail.mockResolvedValue({ sent: true });
    const evaluatedAt = new Date();
    const prisma = {
      purchaseSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      scoutingProspect: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prospect-1',
          tenantId: 'tenant-1',
          name: 'João Teste',
          playerId: null,
          targetCategory: 'sub13',
        }),
      },
      physioTryoutClearance: {
        create: jest.fn().mockResolvedValue({
          id: 'clearance-1',
          tenantId: 'tenant-1',
          prospectName: 'João Teste',
          targetCategory: 'sub13',
          outcome: 'aprovado',
          staffName: null,
          evaluatedAt,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new PhysioTryoutClearanceService(prisma as never, mail as never);
    await service.create(
      {
        tenantId: 'tenant-1',
        prospectId: 'prospect-1',
        outcome: 'aprovado',
        bilateralTests: {},
      },
      ['tenant-1'],
    );
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'gerente@bostoncityfc.com' }),
    );
  });

  it('superfície falha de e-mail sem marcar sucesso', async () => {
    delete process.env.CAPTACAO_MANAGER_EMAIL;
    mail.sendMail.mockResolvedValue({ sent: false, error: 'SMTP não configurado no servidor' });
    const evaluatedAt = new Date();
    const prisma = {
      purchaseSetting: { findUnique: jest.fn().mockResolvedValue(null) },
      scoutingProspect: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prospect-1',
          tenantId: 'tenant-1',
          name: 'João Teste',
          playerId: null,
          targetCategory: 'sub13',
        }),
      },
      physioTryoutClearance: {
        create: jest.fn().mockResolvedValue({
          id: 'clearance-1',
          tenantId: 'tenant-1',
          prospectName: 'João Teste',
          targetCategory: 'sub13',
          outcome: 'aprovado',
          staffName: null,
          evaluatedAt,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new PhysioTryoutClearanceService(prisma as never, mail as never);
    const result = await service.create(
      {
        tenantId: 'tenant-1',
        prospectId: 'prospect-1',
        outcome: 'aprovado',
        bilateralTests: {},
      },
      ['tenant-1'],
    );
    expect(result.emailNotification.sent).toBe(false);
    expect(result.emailNotification.error).toContain('SMTP');
    expect(prisma.physioTryoutClearance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { emailNotifyError: expect.stringContaining('SMTP') },
      }),
    );
  });

  it('bloqueia quando clearance reprovado', async () => {
    const prisma = {
      physioTryoutClearance: {
        findFirst: jest.fn().mockResolvedValue({ outcome: 'reprovado' }),
      },
    };
    const service = new PhysioTryoutClearanceService(prisma as never, mail as never);
    await expect(service.assertCanStartCtFieldEvaluation('prospect-1')).rejects.toThrow(
      /reprovada/i,
    );
  });
});
