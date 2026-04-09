import { Module } from '@nestjs/common';
import { DiretoriaController } from './diretoria.controller';
import { DiretoriaService } from './diretoria.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, IntegrationsModule],
  controllers: [DiretoriaController],
  providers: [DiretoriaService],
  exports: [DiretoriaService],
})
export class DiretoriaModule {}
