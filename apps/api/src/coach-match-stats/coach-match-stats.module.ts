import { Module } from '@nestjs/common';
import { CoachMatchStatsService } from './coach-match-stats.service';

@Module({
  providers: [CoachMatchStatsService],
  exports: [CoachMatchStatsService],
})
export class CoachMatchStatsModule {}
