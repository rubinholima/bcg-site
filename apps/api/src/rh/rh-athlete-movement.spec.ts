import { RhAthleteMovementService } from './rh-athlete-movement.service';

describe('RhAthleteMovementService', () => {
  const prisma = {
    employee: { findFirst: jest.fn() },
    rhAthletePayrollImpact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    rhAthleteHrPendingAction: { findFirst: jest.fn(), create: jest.fn() },
    rhAthleteMovementNotificationDedup: { create: jest.fn() },
    employment: { findUnique: jest.fn() },
    rhAthleteSalaryResponsibility: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    rhAthleteSalaryResponsibilityHistory: { create: jest.fn() },
    $transaction: jest.fn((fn) => fn(prisma)),
  };
  const notifications = { notifyRhEvent: jest.fn() };
  const audit = { log: jest.fn() };

  const service = new RhAthleteMovementService(
    prisma as never,
    notifications as never,
    audit as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('cria pending action para empréstimo efetivo', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp1',
      name: 'Atleta',
      employments: [{ id: 'empl1' }],
    });
    prisma.rhAthletePayrollImpact.findFirst.mockResolvedValue(null);
    prisma.rhAthletePayrollImpact.create.mockResolvedValue({});
    prisma.rhAthleteHrPendingAction.findFirst.mockResolvedValue(null);
    prisma.rhAthleteHrPendingAction.create.mockResolvedValue({});
    prisma.rhAthleteMovementNotificationDedup.create.mockResolvedValue({});

    await service.handleNegotiationUpsert({
      id: 'neg1',
      tenantId: 't1',
      playerId: 'p1',
      negotiationType: 'loan',
      status: 'effective',
      counterpartyName: 'Clube B',
      effectiveFrom: null,
      effectiveUntil: null,
      loanEndDate: null,
    } as never);

    expect(prisma.rhAthleteHrPendingAction.create).toHaveBeenCalled();
  });

  it('transfer exige revisão RH sem encerrar vínculo automaticamente', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp1',
      employments: [{ id: 'empl1' }],
    });
    prisma.rhAthletePayrollImpact.findFirst.mockResolvedValue(null);
    prisma.rhAthletePayrollImpact.create.mockResolvedValue({});
    prisma.rhAthleteHrPendingAction.findFirst.mockResolvedValue(null);
    prisma.rhAthleteHrPendingAction.create.mockResolvedValue({});
    prisma.rhAthleteMovementNotificationDedup.create.mockResolvedValue({});

    await service.handleNegotiationUpsert({
      id: 'neg2',
      tenantId: 't1',
      playerId: 'p1',
      negotiationType: 'transfer_permanent',
      status: 'agreed',
      counterpartyName: 'Clube C',
      effectiveFrom: null,
      effectiveUntil: null,
      loanEndDate: null,
    } as never);

    expect(prisma.rhAthleteHrPendingAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ actionType: 'employment_review' }),
      }),
    );
    expect(prisma.employment.findUnique).not.toHaveBeenCalled();
  });
});
