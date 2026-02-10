import { SetMetadata } from '@nestjs/common';

export const REQUIRED_MODULE_KEY = 'requiredModule';

/** Exige que o usuário tenha acesso ao módulo (slug) para a rota. Use com ModuleAccessGuard. */
export const RequireModule = (slug: string) => SetMetadata(REQUIRED_MODULE_KEY, slug);
