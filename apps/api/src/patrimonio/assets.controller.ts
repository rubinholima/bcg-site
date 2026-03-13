import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('patrimonio/assets')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: string,
    @Query('pieceType') pieceType?: string,
    @Query('assignedPlayerId') assignedPlayerId?: string,
  ) {
    return this.service.findAll(tenantId, categoryId, status, pieceType, assignedPlayerId);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  create(@Body() dto: CreateAssetDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
