import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PublicDomainController } from './public-domain.controller';
import { PublicDomainService } from './public-domain.service';
import { AwsPublicDomainProvider } from './aws-public-domain.provider';
import { PublicDomainResolveService } from './public-domain-resolve.service';
import { LegacyPublicDomainResolveService } from './legacy-public-domain-resolve.service';
import { PublicDomainDnsCapabilityService } from './public-domain-dns-capability.service';
import { PublicDomainOwnershipDnsService } from './public-domain-ownership-dns.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [PublicDomainController],
  providers: [
    PublicDomainService,
    PublicDomainResolveService,
    LegacyPublicDomainResolveService,
    AwsPublicDomainProvider,
    PublicDomainDnsCapabilityService,
    PublicDomainOwnershipDnsService,
  ],
  exports: [
    PublicDomainService,
    PublicDomainResolveService,
    LegacyPublicDomainResolveService,
    AwsPublicDomainProvider,
  ],
})
export class PublicDomainModule {}
