import type { Request } from 'express';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { RhScopeService } from './rh-scope.service';

export type RhActor = { userId: string; name: string };

export async function getRhAllowedTenants(
  scope: RhScopeService,
  req: Request & { user: CognitoJwtPayload },
): Promise<string[] | null> {
  return scope.allowedTenants(req.user.sub, scope.roleFrom(req.user));
}

export function getRhActor(scope: RhScopeService, req: Request & { user: CognitoJwtPayload }): RhActor {
  return scope.actorFrom(req.user);
}
