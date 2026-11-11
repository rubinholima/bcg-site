import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PublicDomainService } from './public-domain.service';

@Controller('tenants/:tenantId/public-domains')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('cup360_public_domains')
export class PublicDomainController {
  constructor(private readonly publicDomain: PublicDomainService) {}

  @Get()
  list(@Req() req: Request & { user: CognitoJwtPayload }, @Param('tenantId') tenantId: string) {
    return this.publicDomain.list(tenantId, req.user);
  }

  @Post()
  create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Body() body: { hostname?: string; isCanonical?: boolean },
  ) {
    return this.publicDomain.create(tenantId, { hostname: body.hostname ?? '', isCanonical: body.isCanonical }, req.user);
  }

  @Post(':domainId/verify')
  verify(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
    @Body() body: { token?: string },
  ) {
    return this.publicDomain.verifyOwnershipViaDns(tenantId, domainId, body, req.user);
  }

  @Post(':domainId/verification/refresh')
  refreshChallenge(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.publicDomain.refreshVerificationChallenge(tenantId, domainId, req.user);
  }

  @Patch(':domainId/canonical')
  setCanonical(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.publicDomain.setCanonical(tenantId, domainId, req.user);
  }

  @Post(':domainId/publish')
  publish(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.publicDomain.publish(tenantId, domainId, req.user);
  }

  @Post(':domainId/retry')
  retry(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.publicDomain.retry(tenantId, domainId, req.user);
  }

  @Post(':domainId/disable')
  disable(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.publicDomain.disable(tenantId, domainId, req.user);
  }

  @Delete(':domainId')
  remove(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('domainId') domainId: string,
  ) {
    return this.publicDomain.remove(tenantId, domainId, req.user);
  }
}
