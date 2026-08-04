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
import { FootballActivitySpacesService } from './football-activity-spaces.service';
import { FootballAgendaBirthdaysService } from './football-agenda-birthdays.service';
import { FmfAgendaSyncService } from './fmf-agenda-sync.service';
import { FutebolAgendaService } from './futebol-agenda.service';

@Controller('football-activity-spaces')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule(['futebol_logistica', 'saude'])
export class FootballActivitySpacesController {
  constructor(private readonly service: FootballActivitySpacesService) {}

  @Get()
  list(@Query('tenantId') tenantId?: string) {
    return this.service.list(tenantId);
  }

  @Post()
  create(
    @Body() body: { tenantId: string; name: string; address?: string; notes?: string },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; address: string; notes: string; active: boolean }>,
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

@Controller('futebol-agenda')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_logistica')
export class FutebolAgendaController {
  constructor(
    private readonly service: FutebolAgendaService,
    private readonly birthdays: FootballAgendaBirthdaysService,
    private readonly fmfAgenda: FmfAgendaSyncService,
    private readonly spaces: FootballActivitySpacesService,
  ) {}

  @Get('calendar')
  calendar(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('tenantId') tenantId?: string,
    @Query('types') types?: string,
    @Query('category') category?: string,
  ) {
    return this.service.getCalendar({ from, to, tenantId, types, category });
  }

  @Get('overview')
  overview(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
  ) {
    return this.service.getOverview({
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10),
      tenantId,
      category,
    });
  }

  @Get('conflicts')
  conflicts(
    @Query('tenantId') tenantId: string,
    @Query('spaceId') spaceId: string,
    @Query('startAt') startAt: string,
    @Query('category') category?: string,
    @Query('endAt') endAt?: string,
    @Query('allDay') allDay?: string,
    @Query('excludeEntryId') excludeEntryId?: string,
  ) {
    return this.service.checkSpaceConflicts({
      tenantId,
      spaceId,
      category,
      startAt,
      endAt,
      allDay: allDay === '1' || allDay === 'true',
      excludeEntryId,
    });
  }

  @Post('sync-birthdays')
  syncBirthdays(@Body() body: { tenantId: string }) {
    return this.birthdays.syncTenantBirthdays(body.tenantId);
  }

  @Post('sync-fmf')
  syncFmf(@Body() body: { tenantId?: string }) {
    return this.fmfAgenda.syncAll(body.tenantId ? { tenantId: body.tenantId } : {});
  }

  @Post('ensure-spaces')
  async ensureSpaces(@Body() body: { tenantId: string }) {
    await this.spaces.ensureDefaults(body.tenantId);
    return this.spaces.list(body.tenantId);
  }

  @Get('entries')
  listEntries(@Query('tenantId') tenantId?: string) {
    return this.service.listEntries(tenantId);
  }

  @Get('entries/:id')
  findEntry(@Param('id') id: string) {
    return this.service.findEntry(id);
  }

  @Post('entries')
  createEntry(
    @Body()
    body: {
      tenantId: string;
      category?: string;
      type: string;
      title: string;
      startAt: string;
      endAt?: string;
      allDay?: boolean;
      dayPeriod?: string | null;
      location?: string;
      spaceId?: string;
      description?: string;
      status?: string;
      travelLogisticsId?: string;
      playerIds?: string[];
      allowConflict?: boolean;
    },
  ) {
    return this.service.createEntry(body);
  }

  @Patch('entries/:id')
  updateEntry(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      category: string;
      type: string;
      title: string;
      startAt: string;
      endAt: string | null;
      allDay: boolean;
      dayPeriod: string | null;
      location: string;
      spaceId: string | null;
      description: string;
      status: string;
      playerIds: string[];
      allowConflict: boolean;
    }>,
  ) {
    return this.service.updateEntry(id, body);
  }

  @Delete('entries/:id')
  async deleteEntry(@Param('id') id: string) {
    await this.service.deleteEntry(id);
    return { ok: true };
  }
}
