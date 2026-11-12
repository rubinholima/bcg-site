import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { RH_CAPABILITY_KEY } from '../auth/require-module.decorator';
import type { RhCapability } from './rh-access.util';
import { RhAccessService } from './rh-access.service';

@Injectable()
export class RhCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rhAccess: RhAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.get<RhCapability | undefined>(
      RH_CAPABILITY_KEY,
      context.getHandler(),
    );
    if (!capability) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: CognitoJwtPayload }).user;
    if (!user) return false;
    await this.rhAccess.assertCapability(user, capability);
    return true;
  }
}
