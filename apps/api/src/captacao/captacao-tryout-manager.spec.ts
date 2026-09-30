import { ForbiddenException } from '@nestjs/common';
import { CaptacaoService } from './captacao.service';

describe('CaptacaoService — decisão gerência Try Out', () => {
  const tenantAccess = {
    assertCanAccessTenant: jest.fn(),
  };

  const tryoutWorkflow = {
    recordTryoutManagerDecision: jest.fn(),
    enrichProspectTryout: jest.fn((row: unknown) => Promise.resolve(row)),
  };

  const prisma = {
    scoutingProspect: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const service = new CaptacaoService(
    prisma as never,
    {} as never,
    {} as never,
    tryoutWorkflow as never,
    tenantAccess as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('repassa allowed ao fluxo Try Out aguardando_gerencia', async () => {
    prisma.scoutingProspect.findUnique.mockResolvedValue({
      id: 'p1',
      tenantId: 'tenant-a',
      tryoutWorkflowStage: 'aguardando_gerencia',
      name: 'Atleta',
    });
    tryoutWorkflow.recordTryoutManagerDecision.mockResolvedValue({ id: 'p1' });

    const allowed = ['tenant-a'];
    await service.recordManagerDecision(
      'p1',
      { decision: 'aprovado', presentationDate: '2026-10-01' },
      { role: 'gerente', name: 'Gerente' },
      allowed,
      'user-1',
    );

    expect(tenantAccess.assertCanAccessTenant).toHaveBeenCalledWith(allowed, 'tenant-a');
    expect(tryoutWorkflow.recordTryoutManagerDecision).toHaveBeenCalledWith(
      'p1',
      expect.any(Object),
      expect.objectContaining({ role: 'gerente' }),
      allowed,
      'user-1',
    );
  });

  it('nega tenant fora do escopo do usuário', async () => {
    prisma.scoutingProspect.findUnique.mockResolvedValue({
      id: 'p1',
      tenantId: 'tenant-b',
      tryoutWorkflowStage: 'aguardando_gerencia',
    });
    tenantAccess.assertCanAccessTenant.mockImplementation(() => {
      throw new ForbiddenException('Acesso negado');
    });

    await expect(
      service.recordManagerDecision(
        'p1',
        { decision: 'aprovado', presentationDate: '2026-10-01' },
        { role: 'gerente' },
        ['tenant-a'],
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tryoutWorkflow.recordTryoutManagerDecision).not.toHaveBeenCalled();
  });
});
