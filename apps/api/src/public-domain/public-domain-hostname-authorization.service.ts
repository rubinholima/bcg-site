import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isCup360PlatformHostname } from './cup360-platform-hosts.util';
import { normalizePublicHostname, PublicDomainHostnameError } from './public-domain.hostname.util';

@Injectable()
export class PublicDomainHostnameAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertHostnameAllowedForTenantCreate(hostnameInput: string, tenantId: string): Promise<string> {
    let hostnameNormalized: string;
    try {
      hostnameNormalized = normalizePublicHostname(hostnameInput);
    } catch (e) {
      if (e instanceof PublicDomainHostnameError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    if (isCup360PlatformHostname(hostnameNormalized)) {
      throw new BadRequestException('Este hostname pertence à plataforma CUP360 e não pode ser cadastrado como domínio público.');
    }

    const legacy = await this.prisma.legacyPublicDomain.findUnique({
      where: { hostnameNormalized },
      select: { tenantId: true, status: true },
    });
    if (legacy?.status === 'ACTIVE') {
      throw new ConflictException(
        'Este hostname está registrado como domínio legado. Migração automática não é permitida.',
      );
    }

    const existing = await this.prisma.publicDomain.findUnique({
      where: { hostnameNormalized },
      select: { tenantId: true },
    });
    if (existing && existing.tenantId !== tenantId) {
      throw new ConflictException('Este hostname já está reservado para outra empresa.');
    }

    return hostnameNormalized;
  }
}
