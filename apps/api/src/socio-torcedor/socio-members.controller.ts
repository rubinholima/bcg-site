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
import { SocioMembersService } from './socio-members.service';
import { CreateSocioMemberDto } from './dto/create-socio-member.dto';
import { UpdateSocioMemberDto } from './dto/update-socio-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('socio/members')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
@UseGuards(ModuleAccessGuard)
@RequireModule('socio_torcedor')
export class SocioMembersController {
  constructor(private readonly service: SocioMembersService) {}

  @Get()
  list(
    @Query('tenantId') tenantId: string,
    @Query('planId') planId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(tenantId, { planId, status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSocioMemberDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSocioMemberDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
