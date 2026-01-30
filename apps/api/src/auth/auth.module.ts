import { Module } from '@nestjs/common';
import { ModulesModule } from '../modules/modules.module';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [ModulesModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class AuthModule {}
