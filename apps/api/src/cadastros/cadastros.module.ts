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
import { S3Module } from '../s3/s3.module';
import { HelloSignModule } from '../hello-sign/hello-sign.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TechnicalStaffController } from './technical-staff.controller';
import { TechnicalStaffService } from './technical-staff.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  controllers: [
    ChampionshipsController,
    StadiumsController,
    VisitingTeamsController,
    PlayersController,
    LegalDocumentsController,
    AllLegalDocumentsController,
    TechnicalStaffController,
  ],
  providers: [
    ChampionshipsService,
    StadiumsService,
    VisitingTeamsService,
    PlayersService,
    LegalDocumentsService,
    TechnicalStaffService,
    ModuleAccessGuard,
  ],
  imports: [AuthModule, ModulesModule, S3Module, HelloSignModule],
  exports: [ChampionshipsService, StadiumsService, VisitingTeamsService, PlayersService, TechnicalStaffService],
})
export class CadastrosModule {}
