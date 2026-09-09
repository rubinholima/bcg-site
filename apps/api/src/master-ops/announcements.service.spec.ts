import { BadRequestException } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsService validation', () => {
  const prisma = {
    platformAnnouncement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    platformAnnouncementReceipt: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as ConstructorParameters<typeof AnnouncementsService>[0];

  const service = new AnnouncementsService(prisma as never);

  it('rejects user-target announcement without targetUserId', async () => {
    await expect(
      service.create(
        {
          title: 'Teste',
          message: 'Mensagem',
          targetMode: 'user',
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
