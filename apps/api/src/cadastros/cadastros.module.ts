import { Module } from '@nestjs/common';
import { ChampionshipsController } from './championships.controller';
import { ChampionshipsService } from './championships.service';
import { StadiumsController } from './stadiums.controller';
import { StadiumsService } from './stadiums.service';
import { VisitingTeamsController } from './visiting-teams.controller';
import { VisitingTeamsService } from './visiting-teams.service';
import { PlayersController } from './players.controller';
import { PlayersService } from './players.service';
import { LegalDocumentsController } from './legal-documents.controller';
import { AllLegalDocumentsController } from './all-legal-documents.controller';
import { LegalDocumentsService } from './legal-documents.service';
import { ContractTemplatesController } from './contract-templates.controller';
import { S3Module } from '../s3/s3.module';
import { ContractsModule } from '../contracts/contracts.module';
import { HelloSignModule } from '../hello-sign/hello-sign.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TechnicalStaffController } from './technical-staff.controller';
import { TechnicalStaffService } from './technical-staff.service';
import { FixtureCategoriesController } from './fixture-categories.controller';
import { FixtureCategoriesService } from './fixture-categories.service';
import { MatchRefereesController } from './match-referees.controller';
import { MatchRefereesService } from './match-referees.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { FmfScraperModule } from '../fmf-scraper/fmf-scraper.module';

@Module({
  controllers: [
    ChampionshipsController,
    StadiumsController,
    VisitingTeamsController,
    PlayersController,
    LegalDocumentsController,
    AllLegalDocumentsController,
    ContractTemplatesController,
    TechnicalStaffController,
    FixtureCategoriesController,
    MatchRefereesController,
  ],
  providers: [
    ChampionshipsService,
    StadiumsService,
    VisitingTeamsService,
    PlayersService,
    LegalDocumentsService,
    TechnicalStaffService,
    FixtureCategoriesService,
    MatchRefereesService,
    ModuleAccessGuard,
  ],
  imports: [
    AuthModule,
    ModulesModule,
    S3Module,
    HelloSignModule,
    ContractsModule,
    FutebolAgendaModule,
    FmfScraperModule,
  ],
  exports: [
    ChampionshipsService,
    StadiumsService,
    VisitingTeamsService,
    PlayersService,
    TechnicalStaffService,
    FixtureCategoriesService,
    MatchRefereesService,
  ],
})
export class CadastrosModule {}
