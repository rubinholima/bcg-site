import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { LogisticaService } from './logistica.service';
import { CreateTravelLogisticsDto } from './dto/create-travel-logistics.dto';
import { UpdateTravelLogisticsDto } from './dto/update-travel-logistics.dto';
import { SetTravelParticipantsDto } from './dto/set-travel-participants.dto';

@Controller('logistica')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class LogisticaController {
  constructor(private readonly service: LogisticaService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.findAll(tenantId, status, fromDate, toDate);
  }

  @Get(':id/participants')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  listParticipants(@Param('id') id: string) {
    return this.service.listParticipants(id);
  }

  @Put(':id/participants')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  setParticipants(
    @Param('id') id: string,
    @Body() dto: SetTravelParticipantsDto,
  ) {
    return this.service.setParticipants(id, dto);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  create(@Body() dto: CreateTravelLogisticsDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  update(@Param('id') id: string, @Body() dto: UpdateTravelLogisticsDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_logistica')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
