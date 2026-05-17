import { SetMetadata } from '@nestjs/common';

export const REQUIRED_MODULE_KEY = 'requiredModule';

/** Exige acesso a um módulo (ou a qualquer um da lista). Use com ModuleAccessGuard. */
export const RequireModule = (slug: string | string[]) => SetMetadata(REQUIRED_MODULE_KEY, slug);
