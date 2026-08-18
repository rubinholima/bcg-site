import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { SocialPedagogyDocumentsService } from './social-pedagogy-documents.service';
import {
  CreateSocialPedagogyDocumentDto,
  UpdateSocialPedagogyDocumentDto,
} from './dto/social-pedagogy-document.dto';

@Controller('assistencia-social/documents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class SocialPedagogyDocumentsController {
  constructor(private readonly service: SocialPedagogyDocumentsService) {}

  @Get()
  findByTenant(
    @Query('tenantId') tenantId: string,
    @Query('playerId') playerId?: string,
    @Query('documentType') documentType?: string,
  ) {
    return this.service.findByTenant(tenantId, playerId, documentType);
  }

  @Get('by-player/:playerId')
  findByPlayer(@Param('playerId') playerId: string) {
    return this.service.findByPlayer(playerId);
  }

  @Post()
  create(@Body() dto: CreateSocialPedagogyDocumentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSocialPedagogyDocumentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
