import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VaultEncryptionService } from '../vault/vault-encryption.service';
import { PAYMENT_PROVIDER_ENVIRONMENTS } from './payment-core.constants';
import { serializePaymentProviderAccount } from './payment-serialize.util';

export type UpsertPaymentProviderAccountInput = {
  tenantId: string;
  providerKey: string;
  country?: string | null;
  environment?: string;
  enabledCurrencies?: string[] | null;
  enabledMethods?: string[] | null;
  active?: boolean;
  priority?: number;
  merchantAccountId?: string | null;
  credentialsJson?: string | null;
  webhookSecret?: string | null;
};

@Injectable()
export class PaymentProviderAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: VaultEncryptionService,
  ) {}

  async listByTenant(tenantId: string) {
    const rows = await this.prisma.paymentProviderAccount.findMany({
      where: { tenantId },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(serializePaymentProviderAccount);
  }

  async findOneForTenant(id: string, tenantId: string) {
    const row = await this.prisma.paymentProviderAccount.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Conta de provedor não encontrada.');
    return serializePaymentProviderAccount(row);
  }

  async create(input: UpsertPaymentProviderAccountInput) {
    const env = input.environment?.trim() || 'sandbox';
    if (!PAYMENT_PROVIDER_ENVIRONMENTS.includes(env as (typeof PAYMENT_PROVIDER_ENVIRONMENTS)[number])) {
      throw new BadRequestException('Ambiente de provedor inválido.');
    }
    const providerKey = input.providerKey.trim().toLowerCase();
    if (!providerKey) throw new BadRequestException('providerKey é obrigatório.');

    let credentialsEnc: string | null = null;
    let credentialsIv: string | null = null;
    let webhookSecretEnc: string | null = null;
    let webhookSecretIv: string | null = null;

    if (input.credentialsJson?.trim()) {
      try {
        const enc = this.encryption.encrypt(input.credentialsJson.trim());
        credentialsEnc = enc.encrypted;
        credentialsIv = enc.iv;
      } catch {
        throw new BadRequestException(
          'Não foi possível criptografar credenciais — verifique VAULT_MASTER_KEY no servidor.',
        );
      }
    }
    if (input.webhookSecret?.trim()) {
      try {
        const enc = this.encryption.encrypt(input.webhookSecret.trim());
        webhookSecretEnc = enc.encrypted;
        webhookSecretIv = enc.iv;
      } catch {
        throw new BadRequestException(
          'Não foi possível criptografar webhook secret — verifique VAULT_MASTER_KEY no servidor.',
        );
      }
    }

    const row = await this.prisma.paymentProviderAccount.create({
      data: {
        tenantId: input.tenantId,
        providerKey,
        country: input.country?.trim() || null,
        environment: env,
        enabledCurrencies: input.enabledCurrencies ?? undefined,
        enabledMethods: input.enabledMethods ?? undefined,
        active: input.active ?? true,
        priority: input.priority ?? 0,
        merchantAccountId: input.merchantAccountId?.trim() || null,
        credentialsEnc,
        credentialsIv,
        webhookSecretEnc,
        webhookSecretIv,
      },
    });
    return serializePaymentProviderAccount(row);
  }

  /** Uso interno futuro (adapters) — nunca expor ao frontend. */
  async getDecryptedCredentials(accountId: string, tenantId: string): Promise<Record<string, string> | null> {
    const row = await this.prisma.paymentProviderAccount.findFirst({
      where: { id: accountId, tenantId },
    });
    if (!row?.credentialsEnc || !row.credentialsIv) return null;
    const json = this.encryption.decrypt(row.credentialsEnc, row.credentialsIv);
    return JSON.parse(json) as Record<string, string>;
  }
}
