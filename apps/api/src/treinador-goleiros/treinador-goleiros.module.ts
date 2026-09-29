import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FutebolTreinadoresModule } from '../futebol-treinadores/futebol-treinadores.module';
import { PrepFisicaModule } from '../prep-fisica/prep-fisica.module';
import { MailService } from '../common/mail.service';
import { TreinadorGoleirosController } from './treinador-goleiros.controller';
import { TreinadorGoleirosService } from './treinador-goleiros.service';
import { TreinadorGoleirosDistributionService } from './treinador-goleiros-distribution.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, FutebolTreinadoresModule, PrepFisicaModule],
  controllers: [TreinadorGoleirosController],
  providers: [
    TreinadorGoleirosService,
    TreinadorGoleirosDistributionService,
    MailService,
    ModuleAccessGuard,
  ],
  exports: [TreinadorGoleirosService],
})
export class TreinadorGoleirosModule {}
