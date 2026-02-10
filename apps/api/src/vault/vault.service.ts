import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VaultEncryptionService } from './vault-encryption.service';
import { CreateVaultItemDto } from './dto/create-vault-item.dto';
import { UpdateVaultItemDto } from './dto/update-vault-item.dto';
import { GeneratePasswordDto } from './dto/generate-password.dto';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';

const AUDIT_ACTIONS = {
  VIEW_LIST: 'VIEW_LIST',
  VIEW_DETAILS: 'VIEW_DETAILS',
  REVEAL_SECRET: 'REVEAL_SECRET',
  COPY_SECRET: 'COPY_SECRET',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;

export type VaultItemMeta = {
  id: string;
  tenantId: string | null;
  title: string;
  category: string;
  username: string | null;
  url: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
};

function toMeta(row: {
  id: string;
  tenantId: string | null;
  title: string;
  category: string;
  username: string | null;
  url: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}): VaultItemMeta {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    category: row.category,
    username: row.username,
    url: row.url,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
  };
}

function performerId(user: CognitoJwtPayload): string {
  return user.email ?? user.sub ?? 'unknown';
}

@Injectable()
export class VaultService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: VaultEncryptionService,
  ) {}

  private async audit(
    action: keyof typeof AUDIT_ACTIONS,
    performedBy: string,
    itemId?: string,
    details?: string,
  ): Promise<void> {
    await this.prisma.vaultAuditLog.create({
      data: {
        action: AUDIT_ACTIONS[action],
        performedBy,
        itemId: itemId ?? null,
        details: details ?? null,
      },
    });
  }

  async list(
    user: CognitoJwtPayload,
    filters?: { tenantId?: string; category?: string; search?: string; status?: string },
  ): Promise<VaultItemMeta[]> {
    const who = performerId(user);
    await this.audit('VIEW_LIST', who);

    const where: Record<string, unknown> = {};
    if (filters?.tenantId !== undefined) {
      where.tenantId = filters.tenantId === '__group__' ? null : filters.tenantId;
    }
    if (filters?.category) where.category = { contains: filters.category, mode: 'insensitive' };
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.vaultItem.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        title: true,
        category: true,
        username: true,
        url: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });
    return rows.map(toMeta);
  }

  async getOne(id: string, user: CognitoJwtPayload): Promise<VaultItemMeta> {
    const who = performerId(user);
    const row = await this.prisma.vaultItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vault item not found');
    await this.audit('VIEW_DETAILS', who, id);
    return toMeta(row);
  }

  async reveal(id: string, user: CognitoJwtPayload): Promise<{ secret: string }> {
    const who = performerId(user);
    const row = await this.prisma.vaultItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vault item not found');
    const secret = this.encryption.decrypt(row.encryptedSecret, row.iv);
    await this.audit('REVEAL_SECRET', who, id);
    return { secret };
  }

  async copyReveal(id: string, user: CognitoJwtPayload): Promise<{ secret: string }> {
    const who = performerId(user);
    const row = await this.prisma.vaultItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Vault item not found');
    const secret = this.encryption.decrypt(row.encryptedSecret, row.iv);
    await this.audit('COPY_SECRET', who, id);
    return { secret };
  }

  async create(dto: CreateVaultItemDto, user: CognitoJwtPayload): Promise<VaultItemMeta> {
    const who = performerId(user);
    const { encrypted: encryptedSecret, iv } = this.encryption.encrypt(dto.secret);
    let encryptedNotes: string | null = null;
    let notesIv: string | null = null;
    if (dto.notes) {
      const encNotes = this.encryption.encrypt(dto.notes);
      encryptedNotes = encNotes.encrypted;
      notesIv = encNotes.iv;
    }
    const row = await this.prisma.vaultItem.create({
      data: {
        tenantId: dto.tenantId ?? null,
        title: dto.title,
        category: dto.category,
        username: dto.username ?? null,
        url: dto.url ?? null,
        encryptedSecret,
        encryptedNotes,
        iv,
        notesIv,
        status: dto.status ?? 'active',
        createdBy: who,
      },
    });
    await this.audit('CREATE', who, row.id);
    return toMeta(row);
  }

  async update(id: string, dto: UpdateVaultItemDto, user: CognitoJwtPayload): Promise<VaultItemMeta> {
    const who = performerId(user);
    const existing = await this.prisma.vaultItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vault item not found');

    const data: {
      title?: string;
      category?: string;
      username?: string | null;
      url?: string | null;
      encryptedSecret?: string;
      iv?: string;
      encryptedNotes?: string | null;
      notesIv?: string | null;
      status?: string;
    } = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.status !== undefined) data.status = dto.status;

    if (dto.secret !== undefined) {
      const enc = this.encryption.encrypt(dto.secret);
      data.encryptedSecret = enc.encrypted;
      data.iv = enc.iv;
    }

    if (dto.notes !== undefined) {
      if (dto.notes === null || dto.notes === '') {
        data.encryptedNotes = null;
        data.notesIv = null;
      } else {
        const encNotes = this.encryption.encrypt(dto.notes);
        data.encryptedNotes = encNotes.encrypted;
        data.notesIv = encNotes.iv;
      }
    }

    const row = await this.prisma.vaultItem.update({
      where: { id },
      data,
    });
    await this.audit('UPDATE', who, id);
    return toMeta(row);
  }

  async delete(id: string, user: CognitoJwtPayload): Promise<void> {
    const who = performerId(user);
    const existing = await this.prisma.vaultItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Vault item not found');
    await this.prisma.vaultItem.delete({ where: { id } });
    await this.audit('DELETE', who, id);
  }

  generatePassword(dto: GeneratePasswordDto): { password: string } {
    const length = Math.min(128, Math.max(8, Number(dto.length) || 24));
    const upper = dto.upper !== false;
    const lower = dto.lower !== false;
    const number = dto.number !== false;
    const symbol = dto.symbol !== false;
    const avoidAmbiguous = dto.avoidAmbiguous !== false;

    let pool = '';
    if (upper) pool += avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) pool += avoidAmbiguous ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    if (number) pool += avoidAmbiguous ? '23456789' : '0123456789';
    if (symbol) pool += avoidAmbiguous ? '!@#$%&*' : '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!pool) pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    const crypto = require('crypto');
    let password = '';
    for (let i = 0; i < length; i++) {
      const idx = crypto.randomInt(0, pool.length);
      password += pool[idx];
    }
    return { password };
  }
}
