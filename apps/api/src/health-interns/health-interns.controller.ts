import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HealthInternsService } from './health-interns.service';
import { CreateHealthInternDto } from './dto/create-health-intern.dto';
import { UpdateHealthInternDto } from './dto/update-health-intern.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('health-interns')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class HealthInternsController {
  constructor(private readonly service: HealthInternsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  list(
    @Query('tenantId') tenantId?: string,
    @Query('area') area?: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      tenantId: tenantId || undefined,
      area: area || undefined,
      activeOnly: activeOnly === '1' || activeOnly === 'true',
      search: search || undefined,
    });
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  create(@Body() dto: CreateHealthInternDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  update(@Param('id') id: string, @Body() dto: UpdateHealthInternDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
