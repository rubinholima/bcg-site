import { Test, TestingModule } from '@nestjs/testing';
import { MedicalEncountersService } from './medical-encounters.service';
import { MedicalTimelineService } from './medical-timeline.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MedicalEncountersService', () => {
  let service: MedicalEncountersService;
  const prisma = {
    player: { findFirst: jest.fn(), findUnique: jest.fn() },
    physioSession: { findFirst: jest.fn(), findMany: jest.fn() },
    medicalEncounter: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    nursingSession: { findMany: jest.fn() },
    physioTransitionProgram: { findMany: jest.fn() },
    playerMedicalDeparture: { findMany: jest.fn() },
    physiologyHydration: { findMany: jest.fn() },
    physiologyAssessment: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalEncountersService,
        MedicalTimelineService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(MedicalEncountersService);
  });

  it('cria atendimento médico estruturado com prescrição', async () => {
    prisma.player.findFirst.mockResolvedValue({ id: 'p1', category: 'sub20' });
    prisma.physioSession.findFirst.mockResolvedValue(null);
    prisma.medicalEncounter.create.mockResolvedValue({
      id: 'enc1',
      playerId: 'p1',
      diagnosis: 'Entorse',
    });

    await service.create(
      {
        tenantId: 't1',
        playerId: 'p1',
        occurredAt: '2026-09-29T14:30:00.000Z',
        chiefComplaint: 'Dor no tornozelo',
        diagnosis: 'Entorse grau I',
        prescriptions: [
          {
            medication: 'Dipirona',
            dose: '500mg',
            route: 'VO',
            frequency: '8/8h',
            duration: '3 dias',
          },
        ],
      },
      ['t1'],
      'user-1',
    );

    expect(prisma.medicalEncounter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 't1',
          playerId: 'p1',
          chiefComplaint: 'Dor no tornozelo',
          prescriptions: expect.arrayContaining([
            expect.objectContaining({ medication: 'Dipirona', dose: '500mg' }),
          ]),
        }),
      }),
    );
  });

  it('recarrega timeline agregada para o atleta', async () => {
    prisma.player.findUnique.mockResolvedValue({
      id: 'p1',
      name: 'Atleta',
      tenantId: 't1',
      category: 'sub20',
      photoUrl: null,
      medicalHistory: { profile: { bloodType: 'O+' } },
      status: 'available',
      statusDetails: null,
      statusUntil: null,
    });
    prisma.medicalEncounter.findMany.mockResolvedValue([
      {
        id: 'enc1',
        occurredAt: new Date('2026-09-29T12:00:00Z'),
        diagnosis: 'Consulta',
        chiefComplaint: 'Queixa',
        anamnesis: null,
        status: 'finalized',
      },
    ]);
    prisma.nursingSession.findMany.mockResolvedValue([]);
    prisma.physioSession.findMany.mockResolvedValue([]);
    prisma.physioTransitionProgram.findMany.mockResolvedValue([]);
    prisma.playerMedicalDeparture.findMany.mockResolvedValue([]);
    prisma.physiologyHydration.findMany.mockResolvedValue([]);
    prisma.physiologyAssessment.findMany.mockResolvedValue([]);

    const result = await service.getTimeline('p1', ['t1']);

    expect(result.player.id).toBe('p1');
    expect(result.medicalProfile).toEqual({ bloodType: 'O+' });
    expect(result.timeline.some((i) => i.sourceType === 'medical_encounter')).toBe(true);
  });
});
