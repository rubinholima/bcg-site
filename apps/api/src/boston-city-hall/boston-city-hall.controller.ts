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
import { BostonCityHallService } from './boston-city-hall.service';

@Controller('boston-city-hall')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('eventos')
export class BostonCityHallController {
  constructor(private readonly service: BostonCityHallService) {}

  @Get('overview')
  overview() {
    return this.service.getOverview();
  }

  @Get('spaces')
  listSpaces() {
    return this.service.listSpaces();
  }

  @Get('bookings')
  listBookings(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('spaceId') spaceId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listBookings({ from, to, spaceId, status });
  }

  @Post('bookings')
  createBooking(
    @Body()
    body: {
      spaceId: string;
      title: string;
      eventType?: string;
      startAt: string;
      endAt: string;
      status?: string;
      pipelineLeadId?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      guestCount?: number;
      notes?: string;
    },
  ) {
    return this.service.createBooking(body);
  }

  @Patch('bookings/:id')
  updateBooking(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      spaceId: string;
      title: string;
      eventType: string;
      startAt: string;
      endAt: string;
      status: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      guestCount: number;
      notes: string;
    }>,
  ) {
    return this.service.updateBooking(id, body);
  }

  @Delete('bookings/:id')
  async deleteBooking(@Param('id') id: string) {
    await this.service.deleteBooking(id);
    return { ok: true };
  }

  @Get('pipeline')
  listPipeline() {
    return this.service.listPipeline();
  }

  @Post('pipeline')
  createPipelineLead(
    @Body()
    body: {
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      companyName?: string;
      eventType?: string;
      guestCount?: number;
      preferredDate?: string;
      message?: string;
      stage?: string;
      notes?: string;
    },
  ) {
    return this.service.createPipelineLead(body);
  }

  @Patch('pipeline/:id')
  updatePipelineLead(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      companyName: string;
      eventType: string;
      guestCount: number;
      preferredDate: string;
      message: string;
      stage: string;
      notes: string;
    }>,
  ) {
    return this.service.updatePipelineLead(id, body);
  }
}
