import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { SupplementGuidesService } from './supplement-guides.service';
import { CreateSupplementGuideDto } from './dto/create-supplement-guide.dto';
import { UpdateSupplementGuideDto } from './dto/update-supplement-guide.dto';

@Controller('nutricao/supplement-guides')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class SupplementGuidesController {
  constructor(private readonly service: SupplementGuidesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findAll(@Query('tenantId') tenantId?: string, @Query('categoryId') categoryId?: string, @Query('playerId') playerId?: string) {
    return this.service.findAll(tenantId, categoryId, playerId);
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
  create(@Body() dto: CreateSupplementGuideDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  update(@Param('id') id: string, @Body() dto: UpdateSupplementGuideDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
