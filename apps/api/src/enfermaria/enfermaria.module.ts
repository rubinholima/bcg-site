import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ComprasModule } from '../compras/compras.module';
import { SaudeNotificationsModule } from '../saude/saude-notifications.module';
import { EnfermariaController } from './enfermaria.controller';
import { EnfermariaService } from './enfermaria.service';
import { EnfermariaReportsService } from './enfermaria-reports.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, ComprasModule, SaudeNotificationsModule],
  controllers: [EnfermariaController],
  providers: [EnfermariaService, EnfermariaReportsService],
  exports: [EnfermariaService, EnfermariaReportsService],
})
export class EnfermariaModule {}
