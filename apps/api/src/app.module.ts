import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CognitoModule } from './cognito/cognito.module';
import { PrismaModule } from './prisma/prisma.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GroupModule } from './group/group.module';
import { ModulesModule } from './modules/modules.module';
import { TenantKindsModule } from './tenant-kinds/tenant-kinds.module';
import { TenantsModule } from './tenants/tenants.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { WorkmailModule } from './workmail/workmail.module';
import { HomeContentModule } from './home-content/home-content.module';
import { PagesModule } from './pages/pages.module';
import { PublicModule } from './public/public.module';
import { MediaModule } from './media/media.module';
import { VaultModule } from './vault/vault.module';
import { CadastrosModule } from './cadastros/cadastros.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { PsychologistsModule } from './psychologists/psychologists.module';
import { MedicalStaffModule } from './medical-staff/medical-staff.module';
import { HealthInternsModule } from './health-interns/health-interns.module';
import { ComprasModule } from './compras/compras.module';
import { RhModule } from './rh/rh.module';
import { PatrimonioModule } from './patrimonio/patrimonio.module';
import { NutricaoModule } from './nutricao/nutricao.module';
import { SocioTorcedorModule } from './socio-torcedor/socio-torcedor.module';
import { MarketingModule } from './marketing/marketing.module';
import { DiretoriaModule } from './diretoria/diretoria.module';
import { LogisticaModule } from './logistica/logistica.module';
import { FutebolAgendaModule } from './futebol-agenda/futebol-agenda.module';
import { EventsModule } from './events/events.module';
import { BostonCityHallModule } from './boston-city-hall/boston-city-hall.module';
import { TenantPressModule } from './tenant-press/tenant-press.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { BostonTvModule } from './boston-tv/boston-tv.module';
import { RegistrationInviteModule } from './registration-invite/registration-invite.module';
import { FmfScraperModule } from './fmf-scraper/fmf-scraper.module';
import { BeatscodeImportModule } from './beatscode-import/beatscode-import.module';
import { CaptacaoModule } from './captacao/captacao.module';
import { PsychologySessionsModule } from './psychology-sessions/psychology-sessions.module';
import { FisioterapiaModule } from './fisioterapia/fisioterapia.module';
import { PsychologySupportMaterialsModule } from './psychology-support-materials/psychology-support-materials.module';
import { InfrastructureModule } from './infraestrutura/infrastructure.module';
import { RolesModule } from './roles/roles.module';
import { ComunicacaoModule } from './comunicacao/comunicacao.module';
import { FutebolRelatoriosModule } from './futebol-relatorios/futebol-relatorios.module';
import { FutebolTreinadoresModule } from './futebol-treinadores/futebol-treinadores.module';
import { AgendaConfigModule } from './agenda-config/agenda-config.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    RolesModule,
    AuthModule,
    CognitoModule,
    DashboardModule,
    GroupModule,
    ModulesModule,
    TenantsModule,
    TenantKindsModule,
    UploadModule,
    UsersModule,
    WorkmailModule,
    PublicModule,
    HomeContentModule,
    PagesModule,
    MediaModule,
    VaultModule,
    CadastrosModule,
    IntegrationsModule,
    ConsultationsModule,
    PsychologistsModule,
    MedicalStaffModule,
    HealthInternsModule,
    ComprasModule,
    RhModule,
    PatrimonioModule,
    NutricaoModule,
    SocioTorcedorModule,
    MarketingModule,
    DiretoriaModule,
    LogisticaModule,
    FutebolAgendaModule,
    EventsModule,
    BostonCityHallModule,
    TenantPressModule,
    FinanceiroModule,
    BostonTvModule,
    RegistrationInviteModule,
    FmfScraperModule,
    BeatscodeImportModule,
    CaptacaoModule,
    PsychologySessionsModule,
    FisioterapiaModule,
    PsychologySupportMaterialsModule,
    InfrastructureModule,
    ComunicacaoModule,
    FutebolRelatoriosModule,
    FutebolTreinadoresModule,
    AgendaConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
