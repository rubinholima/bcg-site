import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
