import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PlayerGuardiansService } from './player-guardians.service';
import { CreatePlayerGuardianDto, UpdatePlayerGuardianDto } from './dto/player-guardian.dto';

@Controller('assistencia-social/guardians')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class PlayerGuardiansController {
  constructor(private readonly service: PlayerGuardiansService) {}

  @Get('by-player/:playerId')
  findByPlayer(@Param('playerId') playerId: string) {
    return this.service.findByPlayer(playerId);
  }

  @Post()
  create(@Body() dto: CreatePlayerGuardianDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerGuardianDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
