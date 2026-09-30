import { NotFoundException } from '@nestjs/common';
import { TryoutProspectDocumentsService } from './tryout-prospect-documents.service';

describe('TryoutProspectDocumentsService', () => {
  const prisma = {
    scoutingProspectDocument: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const svc = new TryoutProspectDocumentsService(prisma as never, {} as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toPublicRow não expõe storageKey', () => {
    const row = svc.toPublicRow({
      id: 'd1',
      tenantId: 't1',
      prospectId: 'p1',
      documentType: 'identidade',
      confidentialityCategory: 'operacional',
      originalFilename: 'doc.pdf',
      mimeType: 'application/pdf',
      uploadedByUserId: 'u1',
      uploadedAt: new Date('2026-01-01T12:00:00Z'),
    });
    expect(row).not.toHaveProperty('storageKey');
    expect(row.originalFilename).toBe('doc.pdf');
  });

  it('listActive consulta apenas documentos operacionais', async () => {
    prisma.scoutingProspectDocument.findMany.mockResolvedValue([]);
    await svc.listActive('p1');
    expect(prisma.scoutingProspectDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          prospectId: 'p1',
          deletedAt: null,
          confidentialityCategory: 'operacional',
        }),
      }),
    );
  });

  it('findForDownload nega documento médico ou de outro tenant', async () => {
    prisma.scoutingProspectDocument.findFirst.mockResolvedValue(null);
    await expect(
      svc.findForDownload('d1', 'p1', 'tenant-a'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scoutingProspectDocument.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          confidentialityCategory: 'operacional',
        }),
      }),
    );
  });

  it('adulto: identidade satisfaz bloqueio', () => {
    const r = svc.evaluateBlockingFromTypes(['identidade'], '1990-01-01');
    expect(r.satisfied).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('menor: exige autorização do responsável', () => {
    const r = svc.evaluateBlockingFromTypes(['identidade'], '2015-01-01');
    expect(r.satisfied).toBe(false);
    expect(r.missing).toContain('autorizacao_responsavel');
  });
});
