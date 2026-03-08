import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TechnicalStaffService } from './technical-staff.service';
import { CreateTechnicalStaffDto } from './dto/create-technical-staff.dto';
import { UpdateTechnicalStaffDto } from './dto/update-technical-staff.dto';

@Controller('technical-staff')
export class TechnicalStaffController {
  constructor(private readonly service: TechnicalStaffService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ tenantId, category, role, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTechnicalStaffDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTechnicalStaffDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
