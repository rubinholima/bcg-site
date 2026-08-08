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
import { FixtureCategoriesService } from './fixture-categories.service';
import { CreateFixtureCategoryDto } from './dto/create-fixture-category.dto';
import { UpdateFixtureCategoryDto } from './dto/update-fixture-category.dto';

@Controller('fixture-categories')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class FixtureCategoriesController {
  constructor(private readonly service: FixtureCategoriesService) {}

  @Get()
  findAll(@Query('active') active?: string) {
    const activeOnly = active === '1' || active === 'true';
    return this.service.findAll({ activeOnly });
  }

  @Post()
  create(@Body() dto: CreateFixtureCategoryDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFixtureCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
