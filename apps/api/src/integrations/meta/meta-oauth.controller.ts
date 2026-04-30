import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../../auth/super-admin.guard';
import { MetaOAuthService } from './meta-oauth.service';
import { DashboardRolesGuard } from '../../auth/roles.guard';
import { ModuleAccessGuard } from '../../auth/module-access.guard';
import { RequireModule } from '../../auth/require-module.decorator';

/**
 * OAuth Meta — rotas:
 * - GET integration/meta/oauth/start
 * - GET integration/meta/oauth/callback
 * - GET integration/meta/status
 */
@Controller('integration/meta')
export class MetaOAuthController {
  constructor(private readonly metaOauth: MetaOAuthService) {}

  @Get('oauth/start')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  start(@Req() req: Request & { user: CognitoJwtPayload }, @Res() res: Response) {
    try {
      const url = this.metaOauth.buildAuthorizeUrl(req.user);
      return res.redirect(302, url);
    } catch (e) {
      if (e instanceof ServiceUnavailableException) {
        const base =
          process.env.META_OAUTH_ERROR_REDIRECT_PREFIX?.trim() ||
          'https://www.bostoncitygroup.biz/dashboard/marketing';
        const sep = base.includes('?') ? '&' : '?';
        return res.redirect(
          302,
          `${base}${sep}meta_err=${encodeURIComponent(
            'Meta não configurado no servidor (META_APP_ID / META_OAUTH_REDIRECT_URI etc.).',
          )}`,
        );
      }
      throw e;
    }
  }

  @Get('oauth/callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    const fail = (msg: string) => res.redirect(302, this.metaOauth.failureRedirect(msg));

    if (error) {
      const msg = errorDescription || error || 'Autorização Meta recusada.';
      return fail(msg);
    }

    if (!code || !state) {
      return fail('Resposta da Meta sem code ou state.');
    }

    try {
      this.metaOauth.verifyState(state);
      const tokens = await this.metaOauth.exchangeCodeForShortLivedToken(code);
      await this.metaOauth.persistOAuthTokens(tokens);
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message ? e.message : 'Falha ao concluir login com a Meta.';
      return fail(msg);
    }

    return res.redirect(302, this.metaOauth.successRedirect());
  }

  /** Indica se há token válido gravado (sem expor segredo). */
  @Get('status')
  @UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
  @RequireModule('marketing')
  async status() {
    return this.metaOauth.getConnectionStatus();
  }
}
