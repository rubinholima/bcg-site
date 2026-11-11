import { ForbiddenException, Injectable } from '@nestjs/common';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ModulesService } from '../modules/modules.service';
import {
  hasProcurementCapability,
  type ProcurementCapability,
} from './procurement-access.util';

@Injectable()
export class ProcurementAccessService {
  constructor(private readonly modulesService: ModulesService) {}

  private roleFrom(user: CognitoJwtPayload): string {
    return user.role ?? user['cognito:groups']?.[0] ?? 'user';
  }

  async getSlugs(user: CognitoJwtPayload): Promise<string[]> {
    const role = this.roleFrom(user);
    if (role === 'super_admin' || role === 'company_admin') return ['*'];
    return this.modulesService.getSlugsForActor(user.sub, role);
  }

  async assertCapability(user: CognitoJwtPayload, capability: ProcurementCapability): Promise<void> {
    const role = this.roleFrom(user);
    if (role === 'super_admin' || role === 'company_admin') return;
    const slugs = await this.modulesService.getSlugsForActor(user.sub, role);
    if (!hasProcurementCapability(slugs, capability, role)) {
      throw new ForbiddenException('Sem permissão para esta ação no módulo de compras.');
    }
  }

  async capabilityMap(user: CognitoJwtPayload): Promise<Record<ProcurementCapability, boolean>> {
    const role = this.roleFrom(user);
    const slugs = await this.getSlugs(user);
    const caps: ProcurementCapability[] = [
      'view_supplier',
      'manage_supplier',
      'view_quotation',
      'manage_quotation',
      'enter_quote',
      'select_winner',
      'approve_quotation',
      'manage_purchase_order',
    ];
    const out = {} as Record<ProcurementCapability, boolean>;
    for (const c of caps) {
      out[c] =
        role === 'super_admin' || role === 'company_admin' || hasProcurementCapability(slugs, c, role);
    }
    return out;
  }
}
