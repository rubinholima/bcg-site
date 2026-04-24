import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ModulesModule } from '../modules/modules.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { CredentialsAuthService } from './credentials-auth.service';
import { InternalAuthController } from './internal-auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JWT_ISSUER } from './credentials-auth.service';
import { TenantAccessService } from './tenant-access.service';

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ModulesModule),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { issuer: JWT_ISSUER, algorithm: 'HS256' },
    }),
  ],
  controllers: [MeController, InternalAuthController],
  providers: [MeService, CredentialsAuthService, JwtAuthGuard, TenantAccessService],
  exports: [MeService, JwtModule, JwtAuthGuard, TenantAccessService],
})
export class AuthModule {}
