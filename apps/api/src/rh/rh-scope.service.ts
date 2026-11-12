import { Injectable } from '@nestjs/common';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class RhScopeService {
  constructor(private readonly tenantAccess: TenantAccessService) {}

  roleFrom(user: CognitoJwtPayload): string {
    return user.role ?? user['cognito:groups']?.[0] ?? 'user';
  }

  actorFrom(user: CognitoJwtPayload): { userId: string; name: string } {
    return {
      userId: user.sub,
      name: (user.name as string) ?? (user.email as string) ?? 'Usuário',
    };
  }

  async allowedTenants(jwtSub: string, role?: string): Promise<string[] | null> {
    return this.tenantAccess.getAllowedTenantIds(jwtSub, role);
  }

  assertTenant(allowed: string[] | null, tenantId: string): void {
    assertRhTenantAccess(allowed, tenantId);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
  }
}
