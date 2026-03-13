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
import { SocioPlansService } from './socio-plans.service';
import { CreateSocioPlanDto } from './dto/create-socio-plan.dto';
import { UpdateSocioPlanDto } from './dto/update-socio-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('socio/plans')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
@UseGuards(ModuleAccessGuard)
@RequireModule('socio_torcedor')
export class SocioPlansController {
  constructor(private readonly service: SocioPlansService) {}

  @Get()
  list(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSocioPlanDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSocioPlanDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
