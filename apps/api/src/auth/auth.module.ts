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

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.BCG_ENV === 'production';
  if (isProd) {
    if (!fromEnv || fromEnv === 'dev-secret-change-in-production') {
      throw new Error(
        'JWT_SECRET obrigatório em produção (valor forte; não use o fallback de desenvolvimento).',
      );
    }
    if (fromEnv.length < 32) {
      throw new Error('JWT_SECRET em produção deve ter pelo menos 32 caracteres.');
    }
  }
  return fromEnv || 'dev-secret-change-in-production';
}

const jwtSecret = resolveJwtSecret();

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
