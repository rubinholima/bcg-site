import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import {
  ComunicacaoController,
  ComunicacaoWhatsAppWebhookController,
} from './comunicacao.controller';
import { ComunicacaoService } from './comunicacao.service';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [ComunicacaoController, ComunicacaoWhatsAppWebhookController],
  providers: [ComunicacaoService, ModuleAccessGuard],
  exports: [ComunicacaoService],
})
export class ComunicacaoModule {}
