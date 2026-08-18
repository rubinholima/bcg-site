import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ComprasModule } from '../compras/compras.module';
import { EnfermariaController } from './enfermaria.controller';
import { EnfermariaService } from './enfermaria.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, ComprasModule],
  controllers: [EnfermariaController],
  providers: [EnfermariaService],
  exports: [EnfermariaService],
})
export class EnfermariaModule {}
