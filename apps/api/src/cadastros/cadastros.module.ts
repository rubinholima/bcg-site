import { Module } from '@nestjs/common';
import { ChampionshipsController } from './championships.controller';
import { ChampionshipsService } from './championships.service';
import { StadiumsController } from './stadiums.controller';
import { StadiumsService } from './stadiums.service';
import { VisitingTeamsController } from './visiting-teams.controller';
import { VisitingTeamsService } from './visiting-teams.service';

@Module({
  controllers: [
    ChampionshipsController,
    StadiumsController,
    VisitingTeamsController,
  ],
  providers: [
    ChampionshipsService,
    StadiumsService,
    VisitingTeamsService,
  ],
  exports: [ChampionshipsService, StadiumsService, VisitingTeamsService],
})
export class CadastrosModule {}
