import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HomeContentModule } from '../home-content/home-content.module';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

@Module({
  imports: [AuthModule, HomeContentModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
