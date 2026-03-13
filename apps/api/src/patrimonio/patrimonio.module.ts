import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { AssetCategoriesController } from './asset-categories.controller';
import { AssetCategoriesService } from './asset-categories.service';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [AssetCategoriesController, AssetsController],
  providers: [AssetCategoriesService, AssetsService, ModuleAccessGuard],
  exports: [AssetCategoriesService, AssetsService],
})
export class PatrimonioModule {}
