import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { PROCUREMENT_CAPABILITY_KEY } from '../auth/require-module.decorator';
import type { ProcurementCapability } from './procurement-access.util';
import { ProcurementAccessService } from './procurement-access.service';

@Injectable()
export class ProcurementCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly procurementAccess: ProcurementAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.get<ProcurementCapability | undefined>(
      PROCUREMENT_CAPABILITY_KEY,
      context.getHandler(),
    );
    if (!capability) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) return false;
    await this.procurementAccess.assertCapability(user, capability);
    return true;
  }
}
