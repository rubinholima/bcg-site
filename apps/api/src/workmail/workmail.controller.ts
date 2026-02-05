import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WorkMailService } from './workmail.service';
import { WorkMailInboxService } from './workmail-inbox.service';
import { CreateWorkmailAccountDto } from './dto/create-workmail-account.dto';
import { ResetPasswordWorkmailDto } from './dto/reset-password-workmail.dto';
import { DeleteWorkmailAccountDto } from './dto/delete-workmail-account.dto';
import { DisableWorkmailAccountDto } from './dto/disable-workmail-account.dto';
import { EnableWorkmailAccountDto } from './dto/enable-workmail-account.dto';
import { WorkmailOrgDto } from './dto/workmail-org.dto';
import { isCustomDomain } from './workmail-domain.util';

const WORKMAIL_ORG_SELECT = {
  id: true,
  name: true,
  domain: true,
  workmailOrganizationId: true,
} as const;

@Controller('api/workmail')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class WorkmailController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workmailService: WorkMailService,
    private readonly inboxService: WorkMailInboxService,
  ) {}

  /**
   * GET /api/workmail/aws-orgs
   * Lista organizações WorkMail diretamente da AWS (não do banco).
   */
  @Get('aws-orgs')
  async listAwsOrgs() {
    return this.workmailService.listOrganizationsFromAws();
  }

  /**
   * GET /api/workmail/orgs
   * Lista empresas do banco com id, name, domain, workmailOrganizationId.
   */
  @Get('orgs')
  async listOrgs(): Promise<WorkmailOrgDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      select: WORKMAIL_ORG_SELECT,
      orderBy: { name: 'asc' },
    });
    return tenants as WorkmailOrgDto[];
  }

  /**
   * GET /api/workmail/domains?workmailOrganizationId=...
   * Domínios custom extraídos dos emails existentes (ListUsers). Não depende de banco.
   */
  @Get('domains')
  async listDomains(
    @Query('workmailOrganizationId') workmailOrganizationId: string | undefined,
  ) {
    if (!workmailOrganizationId?.trim()) {
      throw new BadRequestException('workmailOrganizationId é obrigatório');
    }
    return this.workmailService.listDomainsFromUsers(workmailOrganizationId.trim());
  }

  /**
   * GET /api/workmail/accounts?workmailOrganizationId=...
   * Lista contas WorkMail da organização AWS (sem dependência do Tenant).
   */
  @Get('accounts')
  async listAccounts(
    @Query('workmailOrganizationId') workmailOrganizationId: string | undefined,
  ) {
    if (!workmailOrganizationId?.trim()) {
      throw new BadRequestException('workmailOrganizationId é obrigatório');
    }
    return this.workmailService.listUsers(workmailOrganizationId.trim());
  }

  /**
   * POST /api/workmail/accounts
   * Cria conta WorkMail (workmailOrganizationId e domain no body; sem Tenant).
   */
  @Post('accounts')
  @HttpCode(HttpStatus.CREATED)
  async createAccount(@Body() dto: CreateWorkmailAccountDto) {
    if (!dto.domain?.trim()) {
      throw new BadRequestException('domain é obrigatório');
    }
    const domain = dto.domain.trim();
    if (!isCustomDomain(domain)) {
      throw new BadRequestException(
        'Domínio não permitido para criação de emails. Use um domínio custom (ex: seunegocio.com). Domínios internos (awsapps.com, amazonaws.com) não são aceitos.',
      );
    }
    return this.workmailService.createUserAndRegister(
      dto.workmailOrganizationId.trim(),
      domain,
      dto.localPart.trim(),
      dto.displayName.trim(),
      dto.initialPassword,
    );
  }

  /**
   * POST /api/workmail/accounts/disable
   * Body: { workmailOrganizationId, workmailUserId } — desabilita email (DeregisterFromWorkMail), não deleta usuário.
   */
  @Post('accounts/disable')
  async disableAccount(@Body() dto: DisableWorkmailAccountDto) {
    return this.workmailService.deregisterFromWorkMail(
      dto.workmailOrganizationId.trim(),
      dto.workmailUserId.trim(),
    );
  }

  /**
   * POST /api/workmail/accounts/enable
   * Body: { workmailOrganizationId, workmailUserId, email } — habilita email (RegisterToWorkMail).
   */
  @Post('accounts/enable')
  async enableAccount(@Body() dto: EnableWorkmailAccountDto) {
    return this.workmailService.registerToWorkMail(
      dto.workmailOrganizationId.trim(),
      dto.workmailUserId.trim(),
      dto.email.trim(),
    );
  }

  /**
   * POST /api/workmail/accounts/reset-password
   * Body: { workmailOrganizationId, workmailUserId, newPassword }
   */
  @Post('accounts/reset-password')
  async resetPassword(@Body() dto: ResetPasswordWorkmailDto) {
    return this.workmailService.resetPassword(
      dto.workmailOrganizationId.trim(),
      dto.workmailUserId.trim(),
      dto.newPassword,
    );
  }

  /**
   * DELETE /api/workmail/accounts
   * Body: { workmailOrganizationId, workmailUserId }
   */
  @Delete('accounts')
  async deleteAccount(@Body() dto: DeleteWorkmailAccountDto) {
    return this.workmailService.deleteUser(
      dto.workmailOrganizationId.trim(),
      dto.workmailUserId.trim(),
    );
  }

  /**
   * GET /api/workmail/inbox?tenantSlug=...
   * Lista mensagens da INBOX do mailbox do clube/empresa (requer JWT).
   * Senha do mailbox: WORKMAIL_<SLUG>_PASSWORD no servidor.
   */
  @Get('inbox')
  async listInbox(@Query('tenantSlug') tenantSlug: string | undefined) {
    if (!tenantSlug?.trim()) {
      throw new BadRequestException('tenantSlug é obrigatório');
    }
    return this.inboxService.listInbox(tenantSlug.trim(), 50);
  }

  /**
   * GET /api/workmail/inbox/:uid?tenantSlug=...
   * Obtém uma mensagem pelo UID (corpo completo).
   */
  @Get('inbox/:uid')
  async getMessage(
    @Param('uid') uid: string,
    @Query('tenantSlug') tenantSlug: string | undefined,
  ) {
    if (!tenantSlug?.trim()) {
      throw new BadRequestException('tenantSlug é obrigatório');
    }
    const uidNum = parseInt(uid, 10);
    if (Number.isNaN(uidNum) || uidNum < 1) {
      throw new BadRequestException('uid inválido');
    }
    return this.inboxService.getMessage(tenantSlug.trim(), uidNum);
  }
}
