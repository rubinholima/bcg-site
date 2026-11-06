import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PublicDomainController } from './public-domain.controller';
import { PublicDomainService } from './public-domain.service';
import { AwsPublicDomainProvider } from './aws-public-domain.provider';
import { PublicDomainResolveService } from './public-domain-resolve.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [PublicDomainController],
  providers: [PublicDomainService, PublicDomainResolveService, AwsPublicDomainProvider],
  exports: [PublicDomainService, PublicDomainResolveService, AwsPublicDomainProvider],
})
export class PublicDomainModule {}
