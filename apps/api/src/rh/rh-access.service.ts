import { ForbiddenException, Injectable } from '@nestjs/common';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModulesService } from '../modules/modules.service';
import {
  ALL_RH_CAPABILITIES,
  hasRhCapability,
  type RhCapability,
} from './rh-access.util';

@Injectable()
export class RhAccessService {
  constructor(private readonly modulesService: ModulesService) {}

  private roleFrom(user: CognitoJwtPayload): string {
    return user.role ?? user['cognito:groups']?.[0] ?? 'user';
  }

  async assertCapability(user: CognitoJwtPayload, capability: RhCapability): Promise<void> {
    const role = this.roleFrom(user);
    if (role === 'super_admin' || role === 'company_admin') return;
    const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
    if (!hasRhCapability(slugs, capability, role)) {
      throw new ForbiddenException('Sem permissão para esta ação no módulo de RH.');
    }
  }

  async capabilityMap(user: CognitoJwtPayload): Promise<Record<RhCapability, boolean>> {
    const role = this.roleFrom(user);
    const slugs =
      role === 'super_admin' || role === 'company_admin'
        ? ['*']
        : await this.modulesService.getSlugsForActor(user.sub, role);
    const out = {} as Record<RhCapability, boolean>;
    for (const c of ALL_RH_CAPABILITIES) {
      out[c] =
        role === 'super_admin' ||
        role === 'company_admin' ||
        hasRhCapability(slugs, c, role);
    }
    return out;
  }
}
