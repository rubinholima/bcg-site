import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ChampionshipsService } from './championships.service';
import { CreateChampionshipDto } from './dto/create-championship.dto';
import { UpdateChampionshipDto } from './dto/update-championship.dto';

@Controller('championships')
export class ChampionshipsController {
  constructor(private readonly service: ChampionshipsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: CreateChampionshipDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChampionshipDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
