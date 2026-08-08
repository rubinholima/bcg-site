import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';

export const BOSTON_TV_INSTALL_HEADER = 'x-boston-tv-install-secret';

/**
 * Protege endpoints de instalação do Hall (listar telas, token, bind playlist).
 * - Produção: exige BOSTON_TV_INSTALL_SECRET configurado e header correspondente.
 * - Dev: se o secret existir, exige o header; se não existir, libera (facilita local).
 */
@Injectable()
export class BostonTvInstallGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.BOSTON_TV_INSTALL_SECRET?.trim() ?? '';
    const isProd =
      process.env.NODE_ENV === 'production' || process.env.BCG_ENV === 'production';

    if (!expected) {
      if (isProd) {
        throw new ServiceUnavailableException(
          'Instalação Boston TV Hall desabilitada: configure BOSTON_TV_INSTALL_SECRET.',
        );
      }
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided =
      (typeof req.headers[BOSTON_TV_INSTALL_HEADER] === 'string'
        ? req.headers[BOSTON_TV_INSTALL_HEADER]
        : undefined)?.trim() ?? '';

    if (!provided || provided !== expected) {
      throw new ForbiddenException('Secret de instalação Boston TV inválido.');
    }
    return true;
  }
}
