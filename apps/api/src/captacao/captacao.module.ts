import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { CaptacaoController } from './captacao.controller';
import { CaptacaoService } from './captacao.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [CaptacaoController],
  providers: [CaptacaoService, ModuleAccessGuard],
  exports: [CaptacaoService],
})
export class CaptacaoModule {}
