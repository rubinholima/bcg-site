import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly service: PlayersService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ tenantId, category, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePlayerDto) {
    return this.service.create(dto);
  }

  @Post('sync-from-sheet')
  syncFromSheet(
    @Body() body: { tenantId: string; categories: Array<{ id: string; players: Array<Record<string, unknown>> }> },
  ) {
    const { tenantId, categories } = body;
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.syncFromSheet(tenantId.trim(), categories ?? []);
  }

  @Post('sync-from-sheet-all')
  syncFromSheetAll(
    @Body() body: { categories: Array<{ id: string; players: Array<Record<string, unknown>> }> },
  ) {
    const { categories } = body;
    return this.service.syncFromSheetAll(categories ?? []);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
