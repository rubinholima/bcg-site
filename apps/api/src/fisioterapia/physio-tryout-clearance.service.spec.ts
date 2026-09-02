import { BadRequestException } from '@nestjs/common';
import { PhysioTryoutClearanceService } from './physio-tryout-clearance.service';

describe('PhysioTryoutClearanceService gate', () => {
  const mail = { sendMail: jest.fn() };

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
