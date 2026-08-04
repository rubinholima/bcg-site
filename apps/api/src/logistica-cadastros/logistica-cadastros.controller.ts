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
import {
  CreateLogisticsAirportDto,
  UpdateLogisticsAirportDto,
} from './dto/create-logistics-airport.dto';
import {
  CreateLogisticsServiceProductDto,
  UpdateLogisticsServiceProductDto,
} from './dto/create-logistics-service-product.dto';
import {
  CreateLogisticsClothingGroupDto,
  UpdateLogisticsClothingGroupDto,
} from './dto/create-logistics-clothing-group.dto';
import {
  CreateLogisticsClothingCategoryDto,
  UpdateLogisticsClothingCategoryDto,
} from './dto/create-logistics-clothing-category.dto';
import {
  CreateLogisticsUniformTypeDto,
  UpdateLogisticsUniformTypeDto,
} from './dto/create-logistics-uniform-type.dto';
import {
  CreateLogisticsClothingItemDto,
  UpdateLogisticsClothingItemDto,
} from './dto/create-logistics-clothing-item.dto';
import {
  CreateLogisticsUniformKitDto,
  UpdateLogisticsUniformKitDto,
} from './dto/create-logistics-uniform-kit.dto';
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
  updateTransportCompany(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
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
  updateLoyaltyProgram(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLoyaltyProgramDto,
  ) {
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
  updateUsageMoment(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
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
  updatePaymentType(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
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
  updateRoomType(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsRoomTypeDto,
  ) {
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
  updateVisaType(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
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
  findHotels(
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
  ) {
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

  @Get('airports')
  findAirports(
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAirports(activeOnly, search);
  }

  @Post('airports')
  createAirport(@Body() dto: CreateLogisticsAirportDto) {
    return this.service.createAirport(dto);
  }

  @Get('airports/:id')
  findAirport(@Param('id') id: string) {
    return this.service.findAirport(id);
  }

  @Patch('airports/:id')
  updateAirport(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsAirportDto,
  ) {
    return this.service.updateAirport(id, dto);
  }

  @Delete('airports/:id')
  removeAirport(@Param('id') id: string) {
    return this.service.removeAirport(id);
  }

  @Get('expense-categories')
  findExpenseCategories(@Query('activeOnly') activeOnly?: string) {
    return this.service.findExpenseCategories(activeOnly);
  }

  @Post('expense-categories')
  createExpenseCategory(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createExpenseCategory(dto);
  }

  @Get('expense-categories/:id')
  findExpenseCategory(@Param('id') id: string) {
    return this.service.findExpenseCategory(id);
  }

  @Patch('expense-categories/:id')
  updateExpenseCategory(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
    return this.service.updateExpenseCategory(id, dto);
  }

  @Delete('expense-categories/:id')
  removeExpenseCategory(@Param('id') id: string) {
    return this.service.removeExpenseCategory(id);
  }

  @Get('points-of-interest')
  findPointsOfInterest(@Query('activeOnly') activeOnly?: string) {
    return this.service.findPointsOfInterest(activeOnly);
  }

  @Post('points-of-interest')
  createPointOfInterest(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createPointOfInterest(dto);
  }

  @Get('points-of-interest/:id')
  findPointOfInterest(@Param('id') id: string) {
    return this.service.findPointOfInterest(id);
  }

  @Patch('points-of-interest/:id')
  updatePointOfInterest(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
    return this.service.updatePointOfInterest(id, dto);
  }

  @Delete('points-of-interest/:id')
  removePointOfInterest(@Param('id') id: string) {
    return this.service.removePointOfInterest(id);
  }

  @Get('destinations')
  findDestinations(
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findDestinations(activeOnly, search);
  }

  @Post('destinations')
  createDestination(@Body() dto: CreateLogisticsLookupDto) {
    return this.service.createDestination(dto);
  }

  @Get('destinations/:id')
  findDestination(@Param('id') id: string) {
    return this.service.findDestination(id);
  }

  @Patch('destinations/:id')
  updateDestination(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsLookupDto,
  ) {
    return this.service.updateDestination(id, dto);
  }

  @Delete('destinations/:id')
  removeDestination(@Param('id') id: string) {
    return this.service.removeDestination(id);
  }

  @Get('service-products')
  findServiceProducts(
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findServiceProducts(activeOnly, search);
  }

  @Post('service-products')
  createServiceProduct(@Body() dto: CreateLogisticsServiceProductDto) {
    return this.service.createServiceProduct(dto);
  }

  @Get('service-products/:id')
  findServiceProduct(@Param('id') id: string) {
    return this.service.findServiceProduct(id);
  }

  @Patch('service-products/:id')
  updateServiceProduct(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsServiceProductDto,
  ) {
    return this.service.updateServiceProduct(id, dto);
  }

  @Delete('service-products/:id')
  removeServiceProduct(@Param('id') id: string) {
    return this.service.removeServiceProduct(id);
  }

  // ——— Vestuário/uniformes — grupos ———
  @Get('clothing-groups')
  findClothingGroups(@Query('activeOnly') activeOnly?: string) {
    return this.service.findClothingGroups(activeOnly);
  }

  @Post('clothing-groups')
  createClothingGroup(@Body() dto: CreateLogisticsClothingGroupDto) {
    return this.service.createClothingGroup(dto);
  }

  @Get('clothing-groups/:id')
  findClothingGroup(@Param('id') id: string) {
    return this.service.findClothingGroup(id);
  }

  @Patch('clothing-groups/:id')
  updateClothingGroup(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsClothingGroupDto,
  ) {
    return this.service.updateClothingGroup(id, dto);
  }

  @Delete('clothing-groups/:id')
  removeClothingGroup(@Param('id') id: string) {
    return this.service.removeClothingGroup(id);
  }

  // ——— Vestuário/uniformes — categorias ———
  @Get('clothing-categories')
  findClothingCategories(
    @Query('activeOnly') activeOnly?: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.service.findClothingCategories(activeOnly, groupId);
  }

  @Post('clothing-categories')
  createClothingCategory(@Body() dto: CreateLogisticsClothingCategoryDto) {
    return this.service.createClothingCategory(dto);
  }

  @Get('clothing-categories/:id')
  findClothingCategory(@Param('id') id: string) {
    return this.service.findClothingCategory(id);
  }

  @Patch('clothing-categories/:id')
  updateClothingCategory(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsClothingCategoryDto,
  ) {
    return this.service.updateClothingCategory(id, dto);
  }

  @Delete('clothing-categories/:id')
  removeClothingCategory(@Param('id') id: string) {
    return this.service.removeClothingCategory(id);
  }

  // ——— Vestuário/uniformes — tipos de uniforme ———
  @Get('uniform-types')
  findUniformTypes(@Query('activeOnly') activeOnly?: string) {
    return this.service.findUniformTypes(activeOnly);
  }

  @Post('uniform-types')
  createUniformType(@Body() dto: CreateLogisticsUniformTypeDto) {
    return this.service.createUniformType(dto);
  }

  @Get('uniform-types/:id')
  findUniformType(@Param('id') id: string) {
    return this.service.findUniformType(id);
  }

  @Patch('uniform-types/:id')
  updateUniformType(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsUniformTypeDto,
  ) {
    return this.service.updateUniformType(id, dto);
  }

  @Delete('uniform-types/:id')
  removeUniformType(@Param('id') id: string) {
    return this.service.removeUniformType(id);
  }

  // ——— Vestuário/uniformes — peças ———
  @Get('clothing-items')
  findClothingItems(
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('groupId') groupId?: string,
    @Query('uniformTypeId') uniformTypeId?: string,
  ) {
    return this.service.findClothingItems(
      activeOnly,
      search,
      categoryId,
      groupId,
      uniformTypeId,
    );
  }

  @Post('clothing-items')
  createClothingItem(@Body() dto: CreateLogisticsClothingItemDto) {
    return this.service.createClothingItem(dto);
  }

  @Get('clothing-items/:id')
  findClothingItem(@Param('id') id: string) {
    return this.service.findClothingItem(id);
  }

  @Patch('clothing-items/:id')
  updateClothingItem(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsClothingItemDto,
  ) {
    return this.service.updateClothingItem(id, dto);
  }

  @Delete('clothing-items/:id')
  removeClothingItem(@Param('id') id: string) {
    return this.service.removeClothingItem(id);
  }

  // ——— Vestuário/uniformes — kits ———
  @Get('uniform-kits')
  findUniformKits(
    @Query('activeOnly') activeOnly?: string,
    @Query('search') search?: string,
    @Query('uniformTypeId') uniformTypeId?: string,
  ) {
    return this.service.findUniformKits(activeOnly, search, uniformTypeId);
  }

  @Post('uniform-kits')
  createUniformKit(@Body() dto: CreateLogisticsUniformKitDto) {
    return this.service.createUniformKit(dto);
  }

  @Get('uniform-kits/:id')
  findUniformKit(@Param('id') id: string) {
    return this.service.findUniformKit(id);
  }

  @Patch('uniform-kits/:id')
  updateUniformKit(
    @Param('id') id: string,
    @Body() dto: UpdateLogisticsUniformKitDto,
  ) {
    return this.service.updateUniformKit(id, dto);
  }

  @Delete('uniform-kits/:id')
  removeUniformKit(@Param('id') id: string) {
    return this.service.removeUniformKit(id);
  }
}
