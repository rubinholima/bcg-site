import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AnnouncementsService } from './announcements.service';
import { MasterOpsController } from './master-ops.controller';
import { PresenceController } from './presence.controller';
import { PresenceService } from './presence.service';
import { UserAnnouncementsController } from './user-announcements.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PresenceController, MasterOpsController, UserAnnouncementsController],
  providers: [PresenceService, AnnouncementsService],
})
export class MasterOpsModule {}
