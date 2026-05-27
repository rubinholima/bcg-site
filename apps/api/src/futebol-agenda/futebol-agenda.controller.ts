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
import { FutebolAgendaService } from './futebol-agenda.service';

@Controller('futebol-agenda')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_logistica')
export class FutebolAgendaController {
  constructor(private readonly service: FutebolAgendaService) {}

  @Get('calendar')
  calendar(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('tenantId') tenantId?: string,
    @Query('types') types?: string,
  ) {
    return this.service.getCalendar({ from, to, tenantId, types });
  }

  @Get('overview')
  overview(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.service.getOverview({
      year: Number.parseInt(year, 10),
      month: Number.parseInt(month, 10),
      tenantId,
    });
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
      location?: string;
      description?: string;
      status?: string;
      travelLogisticsId?: string;
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
      location: string;
      description: string;
      status: string;
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
