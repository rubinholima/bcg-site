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
import { MatchRefereesService } from './match-referees.service';
import { CreateMatchRefereeDto } from './dto/create-match-referee.dto';
import { UpdateMatchRefereeDto } from './dto/update-match-referee.dto';

@Controller('match-referees')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule(['tipos', 'futebol_logistica'])
export class MatchRefereesController {
  constructor(private readonly service: MatchRefereesService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.findAll(q, activeOnly === '1' || activeOnly === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateMatchRefereeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMatchRefereeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
