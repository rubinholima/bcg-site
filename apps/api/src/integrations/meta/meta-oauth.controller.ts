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

/**
 * OAuth Meta (Facebook Login) — deve bater com Valid OAuth Redirect URIs do app.
 *
 * Produção (via Next proxy): GET https://www.bostoncitygroup.biz/api/integration/meta/oauth/callback
 */
@Controller('integration/meta/oauth')
export class MetaOAuthController {
  constructor(private readonly metaOauth: MetaOAuthService) {}

  /**
   * Inicia o fluxo: redireciona o navegador para a tela da Meta.
   * Requer JWT + super admin até definirmos política por empresa.
   */
  @Get('start')
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

  /** Callback público chamado pela Meta após o usuário autorizar (ou negar). */
  @Get('callback')
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
      await this.metaOauth.exchangeCodeForShortLivedToken(code);
      // Próximo passo (outro PR): trocar por long-lived token, obter Page token, salvar em MetaConnection por tenant.
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message ? e.message : 'Falha ao concluir login com a Meta.';
      return fail(msg);
    }

    return res.redirect(302, this.metaOauth.successRedirect());
  }
}
