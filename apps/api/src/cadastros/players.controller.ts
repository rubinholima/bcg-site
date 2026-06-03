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

  UploadedFile,

  UseInterceptors,

} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

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
    @Query('position') position?: string,
    @Query('search') search?: string,
    @Query('situation') situation?: string,
    @Query('archived') archived?: string,
    @Query('loaned') loaned?: string,
  ) {
    return this.service.findAll({
      tenantId,
      category,
      position,
      search,
      situation,
      archived: archived === '1' || archived === 'true',
      loaned: loaned === '1' || loaned === 'true',
    });
  }



  @Get(':id/travel-history')
  findTravelHistory(@Param('id') id: string) {
    return this.service.findTravelHistory(id);
  }

  @Get(':id/agenda')
  findAgenda(@Param('id') id: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.findAgendaTimeline(id, from, to);
  }

  @Get(':id/contracts-overview')
  findContractsOverview(@Param('id') id: string) {
    return this.service.findContractsOverview(id);
  }

  @Post(':id/registration-documents')

  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))

  uploadRegistrationDocument(

    @Param('id') id: string,

    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,

    @Body('name') name?: string,

    @Body('documentType') documentType?: string,

  ) {

    if (!file?.buffer) {

      throw new BadRequestException('Envie um arquivo (campo "file").');

    }

    return this.service.uploadRegistrationDocument(id, file, name ?? '', documentType ?? '');

  }



  @Get(':id/delete-impact')

  getDeleteImpact(@Param('id') id: string) {

    return this.service.getDeleteImpact(id);

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


