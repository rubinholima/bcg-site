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
import { MedicalStaffService } from './medical-staff.service';
import { CreateMedicalStaffDto } from './dto/create-medical-staff.dto';
import { UpdateMedicalStaffDto } from './dto/update-medical-staff.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('medical-staff')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class MedicalStaffController {
  constructor(private readonly service: MedicalStaffService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('medico')
  list(@Query('tenantId') tenantId?: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('medico')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('medico')
  create(@Body() dto: CreateMedicalStaffDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('medico')
  update(@Param('id') id: string, @Body() dto: UpdateMedicalStaffDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('medico')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
