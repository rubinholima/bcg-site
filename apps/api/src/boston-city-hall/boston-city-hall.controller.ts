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
import { BostonCityHallCatalogService } from './boston-city-hall-catalog.service';
import { BostonCityHallService } from './boston-city-hall.service';

@Controller('boston-city-hall')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('eventos')
export class BostonCityHallController {
  constructor(
    private readonly service: BostonCityHallService,
    private readonly catalog: BostonCityHallCatalogService,
  ) {}

  @Get('overview')
  overview() {
    return this.service.getOverview();
  }

  @Get('spaces')
  listSpaces(@Query('all') all?: string) {
    const includeInactive = all === '1' || all === 'true';
    return this.service.listSpaces({ includeInactive });
  }

  @Get('spaces/:id')
  getSpace(@Param('id') id: string) {
    return this.service.getSpace(id);
  }

  @Post('spaces')
  createSpace(
    @Body()
    body: {
      name: string;
      slug?: string;
      capacityStanding?: number;
      capacitySeated?: number;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    return this.service.createSpace(body);
  }

  @Patch('spaces/:id')
  updateSpace(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      capacityStanding: number | null;
      capacitySeated: number | null;
      sortOrder: number;
      active: boolean;
    }>,
  ) {
    return this.service.updateSpace(id, body);
  }

  @Get('bookings')
  listBookings(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('spaceId') spaceId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('eventType') eventType?: string,
    @Query('sort') sort?: string,
  ) {
    return this.service.listBookings({ from, to, spaceId, status, q, eventType, sort });
  }

  @Get('bookings/:id')
  getBooking(@Param('id') id: string) {
    return this.service.getBooking(id);
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
      pipelineLeadId: string | null;
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
  listPipeline(
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('commercialStatus') commercialStatus?: string,
    @Query('sort') sort?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.service.listPipeline({
      stage,
      source,
      q,
      createdFrom,
      createdTo,
      commercialStatus,
      sort,
      eventType,
    });
  }

  @Get('pipeline/:id')
  getPipelineLead(@Param('id') id: string) {
    return this.service.getPipelineLead(id);
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

  @Get('catalog/services')
  listCatalogServices(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('active') active?: string,
  ) {
    const activeFilter =
      active === 'true' || active === 'false' ? active : ('all' as const);
    return this.catalog.listCatalogServices({ q, category, active: activeFilter });
  }

  @Get('catalog/services/:id')
  getCatalogService(@Param('id') id: string) {
    return this.catalog.getCatalogService(id);
  }

  @Post('catalog/services')
  createCatalogService(
    @Body()
    body: {
      name: string;
      description?: string;
      category: string;
      defaultPrice: number | string;
      billingUnit: string;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    return this.catalog.createCatalogService(body);
  }

  @Patch('catalog/services/:id')
  updateCatalogService(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string | null;
      category: string;
      defaultPrice: number | string;
      billingUnit: string;
      sortOrder: number;
      active: boolean;
    }>,
  ) {
    return this.catalog.updateCatalogService(id, body);
  }

  @Get('catalog/packages')
  listCatalogPackages(
    @Query('q') q?: string,
    @Query('active') active?: string,
  ) {
    const activeFilter =
      active === 'true' || active === 'false' ? active : ('all' as const);
    return this.catalog.listCatalogPackages({ q, active: activeFilter });
  }

  @Get('catalog/packages/:id')
  getCatalogPackage(@Param('id') id: string) {
    return this.catalog.getCatalogPackage(id);
  }

  @Post('catalog/packages')
  createCatalogPackage(
    @Body()
    body: {
      name: string;
      description?: string;
      defaultPrice: number | string;
      sortOrder?: number;
      active?: boolean;
      items?: Array<{ serviceId: string; quantity: number | string }>;
    },
  ) {
    return this.catalog.createCatalogPackage(body);
  }

  @Patch('catalog/packages/:id')
  updateCatalogPackage(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string | null;
      defaultPrice: number | string;
      sortOrder: number;
      active: boolean;
      items: Array<{ serviceId: string; quantity: number | string }>;
    }>,
  ) {
    return this.catalog.updateCatalogPackage(id, body);
  }
}
