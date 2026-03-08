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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
