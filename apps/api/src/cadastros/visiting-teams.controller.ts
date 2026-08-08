import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { VisitingTeamsService } from './visiting-teams.service';
import { CreateVisitingTeamDto } from './dto/create-visiting-team.dto';
import { UpdateVisitingTeamDto } from './dto/update-visiting-team.dto';

@Controller('visiting-teams')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class VisitingTeamsController {
  constructor(private readonly service: VisitingTeamsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateVisitingTeamDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVisitingTeamDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
