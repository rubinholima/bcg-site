import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { PagesService } from './pages.service';
import type {
  CreatePageDto,
  UpdatePageDto,
} from './pages.service';

@Controller('pages')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  findAll() {
    return this.pagesService.findAll();
  }

  @Get('tenant/:tenantId')
  findByTenantId(@Param('tenantId') tenantId: string) {
    return this.pagesService.findByTenantId(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagesService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePageDto) {
    return this.pagesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePageDto) {
    return this.pagesService.update(id, dto);
  }
}
