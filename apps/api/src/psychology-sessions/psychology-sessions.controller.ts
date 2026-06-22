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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PsychologySessionsService } from './psychology-sessions.service';
import {
  CreatePsychologySessionDto,
  UpdatePsychologySessionDto,
} from './dto/psychology-session.dto';

@Controller('psychology-sessions')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PsychologySessionsController {
  constructor(private readonly service: PsychologySessionsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  list(
    @Query('tenantId') tenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sessionType') sessionType?: string,
    @Query('category') category?: string,
  ) {
    return this.service.list({ tenantId, from, to, sessionType, category });
  }

  @Get('category-roster')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  categoryRoster(@Query('tenantId') tenantId: string, @Query('category') category: string) {
    return this.service.categoryRoster(tenantId, category);
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
  create(@Body() dto: CreatePsychologySessionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  update(@Param('id') id: string, @Body() dto: UpdatePsychologySessionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
