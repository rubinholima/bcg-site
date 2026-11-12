import { ForbiddenException, Injectable } from '@nestjs/common';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModulesService } from '../modules/modules.service';
import {
  ALL_FINANCE_CAPABILITIES,
  hasFinanceCapability,
  type FinanceCapability,
} from './finance-access.util';

@Injectable()
export class FinanceAccessService {
  constructor(private readonly modulesService: ModulesService) {}

  private roleFrom(user: CognitoJwtPayload): string {
    return user.role ?? user['cognito:groups']?.[0] ?? 'user';
  }

  async assertCapability(user: CognitoJwtPayload, capability: FinanceCapability): Promise<void> {
    const role = this.roleFrom(user);
    if (role === 'super_admin' || role === 'company_admin') return;
    const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
    if (!hasFinanceCapability(slugs, capability, role)) {
      throw new ForbiddenException('Sem permissão para esta ação no Financeiro.');
    }
  }

  async capabilityMap(user: CognitoJwtPayload): Promise<Record<FinanceCapability, boolean>> {
    const role = this.roleFrom(user);
    const slugs =
      role === 'super_admin' || role === 'company_admin'
        ? ['*']
        : await this.modulesService.getSlugsForActor(user.sub, role);
    const out = {} as Record<FinanceCapability, boolean>;
    for (const c of ALL_FINANCE_CAPABILITIES) {
      out[c] =
        role === 'super_admin' ||
        role === 'company_admin' ||
        hasFinanceCapability(slugs, c, role);
    }
    return out;
  }
}
