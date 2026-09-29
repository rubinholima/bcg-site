import { PlayerNegotiationIntegrationService } from './player-negotiation-integration.service';

describe('PlayerNegotiationIntegrationService', () => {
  const prisma = {
    player: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: PlayerNegotiationIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlayerNegotiationIntegrationService(prisma as never);
  });

  it('espelha empréstimo e direitos ao efetivar negociação mista', async () => {
    prisma.player.findUnique.mockResolvedValue({
      registrationProfile: { sports: { situation: 'ativo' }, contracts: { economicRights: [] } },
    });
    prisma.player.update.mockResolvedValue({});

    const result = await service.applyEffectiveSnapshots('p1', 'Villa Nova', {
      id: 'n1',
      negotiationType: 'mixed',
      counterpartyName: 'CLUBE X',
      negotiatedPercentage: 50 as never,
      retainedPercentage: 50 as never,
      effectiveFrom: new Date('2026-01-01'),
      loanEndDate: new Date('2026-12-31'),
      effectiveUntil: null,
      notes: 'Teste',
    });

    expect(result.loanApplied).toBe(true);
    expect(result.economicRightsApplied).toBe(true);
    const updateArg = prisma.player.update.mock.calls[0][0] as {
      data: { registrationProfile: Record<string, unknown> };
    };
    const profile = updateArg.data.registrationProfile;
    expect((profile.sports as { situation: string }).situation).toBe('emprestado');
    expect(Array.isArray((profile.contracts as { economicRights: unknown[] }).economicRights)).toBe(
      true,
    );
  });
});
