import { Module } from '@nestjs/common';
import { HomeContentModule } from '../home-content/home-content.module';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

@Module({
  imports: [HomeContentModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
