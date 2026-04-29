import { Module } from '@nestjs/common';
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
import { ComprasModule } from './compras/compras.module';
import { RhModule } from './rh/rh.module';
import { PatrimonioModule } from './patrimonio/patrimonio.module';
import { NutricaoModule } from './nutricao/nutricao.module';
import { SocioTorcedorModule } from './socio-torcedor/socio-torcedor.module';
import { MarketingModule } from './marketing/marketing.module';
import { DiretoriaModule } from './diretoria/diretoria.module';
import { LogisticaModule } from './logistica/logistica.module';
import { EventsModule } from './events/events.module';
import { FinanceiroModule } from './financeiro/financeiro.module';
import { BostonTvModule } from './boston-tv/boston-tv.module';

@Module({
  imports: [
    PrismaModule,
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
    ComprasModule,
    RhModule,
    PatrimonioModule,
    NutricaoModule,
    SocioTorcedorModule,
    MarketingModule,
    DiretoriaModule,
    LogisticaModule,
    EventsModule,
    FinanceiroModule,
    BostonTvModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
