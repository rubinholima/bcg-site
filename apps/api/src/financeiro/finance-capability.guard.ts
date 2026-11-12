import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { FINANCE_CAPABILITY_KEY } from '../auth/require-module.decorator';
import type { FinanceCapability } from './finance-access.util';
import { FinanceAccessService } from './finance-access.service';

@Injectable()
export class FinanceCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly financeAccess: FinanceAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.get<FinanceCapability | undefined>(
      FINANCE_CAPABILITY_KEY,
      context.getHandler(),
    );
    if (!capability) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) return false;
    await this.financeAccess.assertCapability(user, capability);
    return true;
  }
}
