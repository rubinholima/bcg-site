import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { AgendaConfigService } from './agenda-config.service';
import {
  CreateAgendaAreaDto,
  UpdateAgendaAreaDto,
} from './dto/agenda-area.dto';
import {
  CreateAgendaEventCategoryDto,
  UpdateAgendaEventCategoryDto,
} from './dto/agenda-event-category.dto';

@Controller('agenda-config')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class AgendaConfigController {
  constructor(private readonly service: AgendaConfigService) {}

  @Get()
  getConfig(@Req() req: Request) {
    const user = (req as Request & { user?: CognitoJwtPayload }).user!;
    return this.service.getConfigForUser(user.sub, user.role ?? 'user');
  }

  @Get('admin/areas')
  @UseGuards(SuperAdminGuard)
  findAllAreas() {
    return this.service.findAllAreas();
  }

  @Post('admin/areas')
  @UseGuards(SuperAdminGuard)
  createArea(@Body() dto: CreateAgendaAreaDto) {
    return this.service.createArea(dto);
  }

  @Patch('admin/areas/:id')
  @UseGuards(SuperAdminGuard)
  updateArea(@Param('id') id: string, @Body() dto: UpdateAgendaAreaDto) {
    return this.service.updateArea(id, dto);
  }

  @Delete('admin/areas/:id')
  @UseGuards(SuperAdminGuard)
  removeArea(@Param('id') id: string) {
    return this.service.removeArea(id);
  }

  @Get('admin/categories')
  @UseGuards(SuperAdminGuard)
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Post('admin/categories')
  @UseGuards(SuperAdminGuard)
  createCategory(@Body() dto: CreateAgendaEventCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('admin/categories/:id')
  @UseGuards(SuperAdminGuard)
  updateCategory(@Param('id') id: string, @Body() dto: UpdateAgendaEventCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(SuperAdminGuard)
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }
}
