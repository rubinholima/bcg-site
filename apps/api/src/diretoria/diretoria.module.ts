import { Module } from '@nestjs/common';
import { DiretoriaController } from './diretoria.controller';
import { DiretoriaService } from './diretoria.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [DiretoriaController],
  providers: [DiretoriaService],
  exports: [DiretoriaService],
})
export class DiretoriaModule {}
