import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { NutritionCategoriesController } from './nutrition-categories.controller';
import { NutritionCategoriesService } from './nutrition-categories.service';
import { NutritionMealTypesController } from './nutrition-meal-types.controller';
import { NutritionMealTypesService } from './nutrition-meal-types.service';
import { NutritionMenusController } from './nutrition-menus.controller';
import { NutritionMenusService } from './nutrition-menus.service';
import { NutritionMenuItemsService } from './nutrition-menu-items.service';
import { NutritionCalendarController } from './nutrition-calendar.controller';
import { NutritionCalendarService } from './nutrition-calendar.service';
import { NutritionAssessmentsController } from './nutrition-assessments.controller';
import { NutritionAssessmentsService } from './nutrition-assessments.service';
import { SupplementGuidesController } from './supplement-guides.controller';
import { SupplementGuidesService } from './supplement-guides.service';
import { CadastrosModule } from '../cadastros/cadastros.module';

@Module({
  imports: [AuthModule, ModulesModule, CadastrosModule],
  controllers: [
    NutritionCategoriesController,
    NutritionMealTypesController,
    NutritionMenusController,
    NutritionCalendarController,
    NutritionAssessmentsController,
    SupplementGuidesController,
  ],
  providers: [
    NutritionCategoriesService,
    NutritionMealTypesService,
    NutritionMenusService,
    NutritionMenuItemsService,
    NutritionCalendarService,
    NutritionAssessmentsService,
    SupplementGuidesService,
    ModuleAccessGuard,
  ],
  exports: [
    NutritionCategoriesService,
    NutritionMealTypesService,
    NutritionMenusService,
    NutritionMenuItemsService,
    NutritionCalendarService,
    NutritionAssessmentsService,
    SupplementGuidesService,
  ],
})
export class NutricaoModule {}
