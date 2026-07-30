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
import { LogisticaCadastrosService } from './logistica-cadastros.service';
import { CreateLogisticsGuestDto } from './dto/create-logistics-guest.dto';
import { CreateLogisticsHotelDto } from './dto/create-logistics-hotel.dto';
import { CreateLogisticsLookupDto } from './dto/create-logistics-lookup.dto';
import { CreateLogisticsLoyaltyProgramDto } from './dto/create-logistics-loyalty-program.dto';
import { CreateLogisticsRoomTypeDto } from './dto/create-logistics-room-type.dto';
import { UpdateLogisticsGuestDto } from './dto/update-logistics-guest.dto';
import { UpdateLogisticsHotelDto } from './dto/update-logistics-hotel.dto';
import { UpdateLogisticsLookupDto } from './dto/update-logistics-lookup.dto';
import { UpdateLogisticsLoyaltyProgramDto } from './dto/update-logistics-loyalty-program.dto';
import { UpdateLogisticsRoomTypeDto } from './dto/update-logistics-room-type.dto';

@Controller('logistica-cadastros')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_logistica')
export class LogisticaCadastrosController {
  constructor(private readonly service: LogisticaCadastrosService) {}

  @Get('transport-companies')
  findTransportCompanies(@Query('activeOnly') activeOnly?: string) {
    return this.service.findTransportCompanies(activeOnly);
  }

  @Post('transport-companies')
  createTransportCompany(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createTransportCompany(dto);
  }

  @Get('transport-companies/:id')
  findTransportCompany(@Param('id') id: string) {
    return this.service.findTransportCompany(id);
  }

  @Patch('transport-companies/:id')
  updateTransportCompany(@Param('id') id: string, @Body() dto: UpdateLogisticsLookupDto) {
    return this.service.updateTransportCompany(id, dto);
  }

  @Delete('transport-companies/:id')
  removeTransportCompany(@Param('id') id: string) {
    return this.service.removeTransportCompany(id);
  }

  @Get('loyalty-programs')
  findLoyaltyPrograms(@Query('activeOnly') activeOnly?: string) {
    return this.service.findLoyaltyPrograms(activeOnly);
  }

  @Post('loyalty-programs')
  createLoyaltyProgram(@Body() dto: CreateLogisticsLoyaltyProgramDto) {
    return this.service.createLoyaltyProgram(dto);
  }

  @Get('loyalty-programs/:id')
  findLoyaltyProgram(@Param('id') id: string) {
    return this.service.findLoyaltyProgram(id);
  }

  @Patch('loyalty-programs/:id')
  updateLoyaltyProgram(@Param('id') id: string, @Body() dto: UpdateLogisticsLoyaltyProgramDto) {
    return this.service.updateLoyaltyProgram(id, dto);
  }

  @Delete('loyalty-programs/:id')
  removeLoyaltyProgram(@Param('id') id: string) {
    return this.service.removeLoyaltyProgram(id);
  }

  @Get('usage-moments')
  findUsageMoments(@Query('activeOnly') activeOnly?: string) {
    return this.service.findUsageMoments(activeOnly);
  }

  @Post('usage-moments')
  createUsageMoment(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createUsageMoment(dto);
  }

  @Get('usage-moments/:id')
  findUsageMoment(@Param('id') id: string) {
    return this.service.findUsageMoment(id);
  }

  @Patch('usage-moments/:id')
  updateUsageMoment(@Param('id') id: string, @Body() dto: UpdateLogisticsLookupDto) {
    return this.service.updateUsageMoment(id, dto);
  }

  @Delete('usage-moments/:id')
  removeUsageMoment(@Param('id') id: string) {
    return this.service.removeUsageMoment(id);
  }

  @Get('payment-types')
  findPaymentTypes(@Query('activeOnly') activeOnly?: string) {
    return this.service.findPaymentTypes(activeOnly);
  }

  @Post('payment-types')
  createPaymentType(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createPaymentType(dto);
  }

  @Get('payment-types/:id')
  findPaymentType(@Param('id') id: string) {
    return this.service.findPaymentType(id);
  }

  @Patch('payment-types/:id')
  updatePaymentType(@Param('id') id: string, @Body() dto: UpdateLogisticsLookupDto) {
    return this.service.updatePaymentType(id, dto);
  }

  @Delete('payment-types/:id')
  removePaymentType(@Param('id') id: string) {
    return this.service.removePaymentType(id);
  }

  @Get('room-types')
  findRoomTypes(@Query('activeOnly') activeOnly?: string) {
    return this.service.findRoomTypes(activeOnly);
  }

  @Post('room-types')
  createRoomType(@Body() dto: CreateLogisticsRoomTypeDto) {
    return this.service.createRoomType(dto);
  }

  @Get('room-types/:id')
  findRoomType(@Param('id') id: string) {
    return this.service.findRoomType(id);
  }

  @Patch('room-types/:id')
  updateRoomType(@Param('id') id: string, @Body() dto: UpdateLogisticsRoomTypeDto) {
    return this.service.updateRoomType(id, dto);
  }

  @Delete('room-types/:id')
  removeRoomType(@Param('id') id: string) {
    return this.service.removeRoomType(id);
  }

  @Get('visa-types')
  findVisaTypes(@Query('activeOnly') activeOnly?: string) {
    return this.service.findVisaTypes(activeOnly);
  }

  @Post('visa-types')
  createVisaType(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createVisaType(dto);
  }

  @Get('visa-types/:id')
  findVisaType(@Param('id') id: string) {
    return this.service.findVisaType(id);
  }

  @Patch('visa-types/:id')
  updateVisaType(@Param('id') id: string, @Body() dto: UpdateLogisticsLookupDto) {
    return this.service.updateVisaType(id, dto);
  }

  @Delete('visa-types/:id')
  removeVisaType(@Param('id') id: string) {
    return this.service.removeVisaType(id);
  }

  @Get('guests')
  findGuests(
    @Query('tenantId') tenantId: string,
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findGuests(tenantId, activeOnly, search);
  }

  @Post('guests')
  createGuest(@Body() dto: CreateLogisticsGuestDto) {
    return this.service.createGuest(dto);
  }

  @Get('guests/:id')
  findGuest(@Param('id') id: string) {
    return this.service.findGuest(id);
  }

  @Patch('guests/:id')
  updateGuest(@Param('id') id: string, @Body() dto: UpdateLogisticsGuestDto) {
    return this.service.updateGuest(id, dto);
  }

  @Delete('guests/:id')
  removeGuest(@Param('id') id: string) {
    return this.service.removeGuest(id);
  }

  @Get('hotels')
  findHotels(@Query('activeOnly') activeOnly?: string, @Query('search') search?: string) {
    return this.service.findHotels(activeOnly, search);
  }

  @Post('hotels')
  createHotel(@Body() dto: CreateLogisticsHotelDto) {
    return this.service.createHotel(dto);
  }

  @Get('hotels/:id')
  findHotel(@Param('id') id: string) {
    return this.service.findHotel(id);
  }

  @Patch('hotels/:id')
  updateHotel(@Param('id') id: string, @Body() dto: UpdateLogisticsHotelDto) {
    return this.service.updateHotel(id, dto);
  }

  @Delete('hotels/:id')
  removeHotel(@Param('id') id: string) {
    return this.service.removeHotel(id);
  }
}
