import { enrichTravelUniformsFromKitIds } from './travel-uniforms.util';

describe('enrichTravelUniformsFromKitIds', () => {
  const prisma = {
    logisticsUniformKit: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('atualiza nome quando athletesGameKitId resolve kit', async () => {
    prisma.logisticsUniformKit.findUnique.mockResolvedValue({ name: 'UNIFORME 1' });
    const out = await enrichTravelUniformsFromKitIds(prisma as never, {
      athletesGameKitId: 'kit-a',
      athletesGame: 'NOME ANTIGO',
    });
    expect(out?.athletesGame).toBe('UNIFORME 1');
    expect(out?.athletesGameKitId).toBe('kit-a');
  });

  it('preserva payload legado só com nomes', async () => {
    const out = await enrichTravelUniformsFromKitIds(prisma as never, {
      athletesGame: 'KIT 1',
    });
    expect(out?.athletesGame).toBe('KIT 1');
    expect(prisma.logisticsUniformKit.findUnique).not.toHaveBeenCalled();
  });
});
