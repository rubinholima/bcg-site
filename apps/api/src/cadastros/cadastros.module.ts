import { Module } from '@nestjs/common';
import { ChampionshipsController } from './championships.controller';
import { ChampionshipsService } from './championships.service';
import { StadiumsController } from './stadiums.controller';
import { StadiumsService } from './stadiums.service';
import { VisitingTeamsController } from './visiting-teams.controller';
import { VisitingTeamsService } from './visiting-teams.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';

@Module({
  controllers: [
    ChampionshipsController,
    StadiumsController,
    VisitingTeamsController,
    PlayersController,
  ],
  providers: [
    ChampionshipsService,
    StadiumsService,
    VisitingTeamsService,
    PlayersService,
  ],
  exports: [ChampionshipsService, StadiumsService, VisitingTeamsService, PlayersService],
})
export class CadastrosModule {}
