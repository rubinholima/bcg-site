import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { NutritionCalendarService } from './nutrition-calendar.service';
import { CreateNutritionCalendarEntryDto } from './dto/create-nutrition-calendar-entry.dto';
import { RepeatNutritionCalendarDto } from './dto/repeat-nutrition-calendar.dto';
import { UpdateNutritionCalendarEntryDto } from './dto/update-nutrition-calendar-entry.dto';

@Controller('nutricao/nutrition-calendar')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class NutritionCalendarController {
  constructor(private readonly service: NutritionCalendarService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findForTenant(
    @Query('tenantId') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.findForTenant(tenantId, categoryId, startDate, endDate);
  }

  @Post('repeat-week')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  repeatWeek(@Body() dto: RepeatNutritionCalendarDto) {
    return this.service.repeatFromSourceDay(dto);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  create(@Body() dto: CreateNutritionCalendarEntryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  update(@Param('id') id: string, @Body() dto: UpdateNutritionCalendarEntryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
