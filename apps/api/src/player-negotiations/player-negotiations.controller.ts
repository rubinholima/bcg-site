import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import {
  AddNegotiationDocumentDto,
  CreateInstallmentFinanceiroDto,
  CreatePlayerNegotiationDto,
  NegotiationInstallmentDto,
  UpdatePlayerNegotiationDto,
} from './dto/player-negotiation.dto';
import { PlayerNegotiationsService } from './player-negotiations.service';

@Controller('player-negotiations')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('cad_jogadores_negociados')
export class PlayerNegotiationsController {
  constructor(
    private readonly service: PlayerNegotiationsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  private editor(req: Request & { user: CognitoJwtPayload }) {
    return {
      sub: req.user.sub,
      name: req.user.name ?? req.user.email ?? null,
    };
  }

  @Get()
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
    @Query('status') status?: string,
    @Query('negotiationType') negotiationType?: string,
    @Query('counterparty') counterparty?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.service.list(
      {
        tenantId,
        playerId,
        status,
        negotiationType,
        counterparty,
        from,
        to,
        activeOnly: activeOnly === '1' || activeOnly === 'true',
      },
      await this.allowedTenants(req),
    );
  }

  @Get('summary')
  async summary(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('negotiationType') negotiationType?: string,
    @Query('status') status?: string,
    @Query('counterparty') counterparty?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obrigatório.');
    return this.service.summary(
      { tenantId: tenantId.trim(), from, to, negotiationType, status, counterparty },
      await this.allowedTenants(req),
    );
  }

  @Get('export/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('negotiationType') negotiationType?: string,
    @Query('status') status?: string,
    @Query('counterparty') counterparty?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obrigatório.');
    return this.service.exportCsv(
      { tenantId: tenantId.trim(), from, to, negotiationType, status, counterparty },
      await this.allowedTenants(req),
    );
  }

  @Get('by-player/:playerId')
  async byPlayer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    return this.service.listByPlayer(playerId, await this.allowedTenants(req));
  }

  @Get(':id')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.findOne(id, await this.allowedTenants(req));
  }

  @Post()
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePlayerNegotiationDto,
  ) {
    return this.service.create(dto, await this.allowedTenants(req), this.editor(req));
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePlayerNegotiationDto,
  ) {
    return this.service.update(id, dto, await this.allowedTenants(req), this.editor(req));
  }

  @Post(':id/effective')
  async applyEffective(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    return this.service.applyEffective(id, await this.allowedTenants(req), this.editor(req));
  }

  @Post(':id/installments')
  async addInstallments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { installments: NegotiationInstallmentDto[] },
  ) {
    return this.service.addInstallments(
      id,
      body.installments ?? [],
      await this.allowedTenants(req),
      this.editor(req),
    );
  }

  @Patch('installments/:installmentId')
  async updateInstallment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('installmentId') installmentId: string,
    @Body() body: { status?: string; settledAt?: string | null },
  ) {
    return this.service.updateInstallment(
      installmentId,
      body,
      await this.allowedTenants(req),
      this.editor(req),
    );
  }

  @Post('installments/:installmentId/financeiro')
  async linkFinanceiro(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('installmentId') installmentId: string,
    @Body() dto: CreateInstallmentFinanceiroDto,
  ) {
    return this.service.createFinanceiroForInstallment(
      installmentId,
      dto,
      await this.allowedTenants(req),
      this.editor(req),
    );
  }

  @Post(':id/documents')
  async addDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: AddNegotiationDocumentDto,
  ) {
    return this.service.addDocument(id, dto, await this.allowedTenants(req), this.editor(req));
  }

  @Post(':id/documents/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('playerId') playerId: string,
    @Query('name') name: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype?: string },
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo obrigatório.');
    if (!playerId?.trim()) throw new BadRequestException('playerId obrigatório.');
    return this.service.uploadDocumentFile(
      id,
      playerId.trim(),
      file,
      name?.trim() || file.originalname,
      await this.allowedTenants(req),
      this.editor(req),
    );
  }
}
