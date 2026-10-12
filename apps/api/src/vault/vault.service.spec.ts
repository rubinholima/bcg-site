import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VaultService } from './vault.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';

const userA: CognitoJwtPayload = { sub: 'user-a', role: 'editor', email: 'a@test.com' };
const userSuper: CognitoJwtPayload = { sub: 'super', role: 'super_admin', email: 's@test.com' };

function makeService(overrides?: {
  items?: Record<string, unknown>;
  allowed?: string[] | null;
}) {
  const store = new Map<string, Record<string, unknown>>();
  const auditLogs: unknown[] = [];

  const defaultItem = {
    id: 'item-1',
    tenantId: 'tenant-a',
    title: 'T',
    category: 'App',
    username: null,
    url: null,
    encryptedSecret: 'enc',
    encryptedNotes: null,
    iv: 'iv',
    notesIv: null,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'a@test.com',
  };

  if (overrides?.items) {
    for (const [k, v] of Object.entries(overrides.items)) {
      store.set(k, { ...defaultItem, ...v, id: k });
    }
  } else {
    store.set('item-1', defaultItem);
  }

  const prisma = {
    vaultItem: {
      findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
        let rows = [...store.values()];
        if (where?.tenantId && typeof where.tenantId === 'object' && 'in' in (where.tenantId as object)) {
          const ids = (where.tenantId as { in: string[] }).in;
          rows = rows.filter((r) => ids.includes(r.tenantId as string));
        }
        if (where?.tenantId === null) {
          rows = rows.filter((r) => r.tenantId === null);
        }
        if (where?.id && typeof where.id === 'object' && 'in' in (where.id as object)) {
          return [];
        }
        return rows.map(({ encryptedSecret, encryptedNotes, iv, notesIv, ...meta }) => meta);
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => store.get(where.id) ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = 'new-id';
        const row = { ...defaultItem, ...data, id, createdAt: new Date(), updatedAt: new Date() };
        store.set(id, row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const prev = store.get(where.id);
        if (!prev) throw new Error('missing');
        const row = { ...prev, ...data, updatedAt: new Date() };
        store.set(where.id, row);
        return row;
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        store.delete(where.id);
      }),
    },
    vaultAuditLog: {
      create: jest.fn(async ({ data }: { data: unknown }) => {
        auditLogs.push(data);
      }),
    },
  };

  const encryption = {
    encrypt: jest.fn((plain: string) => ({
      encrypted: `enc:${plain}`,
      iv: 'iv-new',
    })),
    decrypt: jest.fn((enc: string, _iv: string) => enc.replace(/^enc:/, '')),
  };

  const tenantAccess = {
    getAllowedTenantIds: jest.fn(async (_sub: string, role: string) => {
      if (role === 'super_admin') return overrides?.allowed ?? null;
      return overrides?.allowed ?? ['tenant-a'];
    }),
  };

  const service = new VaultService(prisma as never, encryption as never, tenantAccess as never);
  return { service, prisma, encryption, auditLogs, store };
}

describe('VaultService', () => {
  it('list não retorna campos de segredo', async () => {
    const { service, prisma } = makeService();
    const rows = await service.list(userA, {});
    expect(rows[0]).not.toHaveProperty('encryptedSecret');
    expect(prisma.vaultItem.findMany).toHaveBeenCalled();
  });

  it('getOne rejeita tenant estrangeiro', async () => {
    const { service } = makeService({
      items: { 'item-x': { tenantId: 'tenant-b' } },
    });
    await expect(service.getOne('item-x', userA)).rejects.toThrow(ForbiddenException);
  });

  it('reveal autorizado só no escopo', async () => {
    const { service, auditLogs } = makeService();
    const { secret } = await service.reveal('item-1', userA);
    expect(secret).toBeTruthy();
    expect(auditLogs.some((l) => (l as { action: string }).action === 'REVEAL_SECRET')).toBe(true);
  });

  it('copy gera COPY_SECRET', async () => {
    const { service, auditLogs } = makeService();
    await service.copyReveal('item-1', userA);
    expect(auditLogs.some((l) => (l as { action: string }).action === 'COPY_SECRET')).toBe(true);
  });

  it('create rejeita tenant fora do escopo', async () => {
    const { service } = makeService();
    await expect(
      service.create(
        {
          title: 'X',
          category: 'App',
          secret: 's',
          tenantId: 'tenant-b',
        },
        userA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('update preserva secret quando omitido', async () => {
    const { service, encryption } = makeService();
    await service.update('item-1', { title: 'Novo' }, userA);
    expect(encryption.encrypt).not.toHaveBeenCalled();
  });

  it('update altera secret quando informado', async () => {
    const { service, encryption } = makeService();
    await service.update('item-1', { secret: 'nova' }, userA);
    expect(encryption.encrypt).toHaveBeenCalledWith('nova');
  });

  it('update move tenant quando autorizado', async () => {
    const { service, store } = makeService({ allowed: ['tenant-a', 'tenant-b'] });
    await service.update('item-1', { tenantId: 'tenant-b' }, userA);
    expect(store.get('item-1')?.tenantId).toBe('tenant-b');
  });

  it('update move para tenant estrangeiro rejeitado', async () => {
    const { service } = makeService();
    await expect(service.update('item-1', { tenantId: 'tenant-b' }, userA)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('clearNotes apaga notas', async () => {
    const { service, store } = makeService({
      items: {
        'item-1': {
          encryptedNotes: 'enc:n',
          notesIv: 'niv',
        },
      },
    });
    await service.update('item-1', { clearNotes: true }, userA);
    expect(store.get('item-1')?.encryptedNotes).toBeNull();
  });

  it('getNotesForEdit retorna notas descriptografadas', async () => {
    const { service } = makeService({
      items: {
        'item-1': {
          encryptedNotes: 'enc:nota',
          notesIv: 'niv',
        },
      },
    });
    const { notes } = await service.getNotesForEdit('item-1', userA);
    expect(notes).toBe('nota');
  });

  it('item grupo só super_admin', async () => {
    const { service } = makeService({
      items: { 'g-1': { tenantId: null } },
    });
    await expect(service.getOne('g-1', userA)).rejects.toThrow(ForbiddenException);
    await expect(service.getOne('g-1', userSuper)).resolves.toBeDefined();
  });

  it('delete item inexistente', async () => {
    const { service } = makeService({ items: {} });
    await expect(service.delete('missing', userA)).rejects.toThrow(NotFoundException);
  });

  it('mutação persiste se auditoria falhar', async () => {
    const { service, prisma, store } = makeService();
    prisma.vaultAuditLog.create.mockRejectedValueOnce(new Error('audit down'));
    await service.delete('item-1', userA);
    expect(store.has('item-1')).toBe(false);
  });
});
