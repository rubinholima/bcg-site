import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { CognitoJwtPayload } from '../../auth/jwt-auth.guard';

/** Mesma versão no diálogo e na troca de token (manual: facebook-login/guides/advanced/manual-flow). */
function graphVersions(): { dialogUrl: string; tokenUrl: string } {
  const v = process.env.META_GRAPH_API_VERSION?.trim() || 'v22.0';
  const ver = /^v\d+(\.\d+)?$/.test(v) ? v : 'v22.0';
  return {
    dialogUrl: `https://www.facebook.com/${ver}/dialog/oauth`,
    tokenUrl: `https://graph.facebook.com/${ver}/oauth/access_token`,
  };
}

/** Emails básicos para o primeiro passo; aumente os escopos quando for publicar nas Páginas/IG (revisão Meta). */
const DEFAULT_SCOPES = 'public_profile,email';

export class MetaOAuthService {
  private get appId(): string {
    const id = process.env.META_APP_ID?.trim();
    if (!id) throw new ServiceUnavailableException('META_APP_ID não configurado no servidor.');
    return id;
  }

  private get appSecret(): string {
    const s = process.env.META_APP_SECRET?.trim();
    if (!s) throw new ServiceUnavailableException('META_APP_SECRET não configurado no servidor.');
    return s;
  }

  /** Precisa ser idêntico ao cadastrado na Meta (Valid OAuth Redirect URIs). */
  get redirectUri(): string {
    const u = process.env.META_OAUTH_REDIRECT_URI?.trim();
    if (!u) {
      throw new ServiceUnavailableException(
        'META_OAUTH_REDIRECT_URI não configurado (ex.: https://www.bostoncitygroup.biz/api/integration/meta/oauth/callback).',
      );
    }
    return u;
  }

  private successRedirectUrl(): string {
    return (
      process.env.META_OAUTH_SUCCESS_REDIRECT?.trim() ||
      'https://www.bostoncitygroup.biz/dashboard/marketing?meta=ok'
    );
  }

  private errorRedirectUrl(err: string): string {
    const base =
      process.env.META_OAUTH_ERROR_REDIRECT_PREFIX?.trim() ||
      'https://www.bostoncitygroup.biz/dashboard/marketing';
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}meta_err=${encodeURIComponent(err)}`;
  }

  buildAuthorizeUrl(user: CognitoJwtPayload): string {
    const secret = this.appSecret;
    const state = jwt.sign(
      { purpose: 'meta_oauth', sub: user.sub, email: user.email },
      secret,
      { expiresIn: '15m' },
    );
    const scopes = process.env.META_OAUTH_SCOPES?.trim() || DEFAULT_SCOPES;
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      state,
      response_type: 'code',
      scope: scopes,
    });
    const { dialogUrl } = graphVersions();
    return `${dialogUrl}?${params.toString()}`;
  }

  verifyState(state: string): jwt.JwtPayload {
    try {
      const decoded = jwt.verify(state, this.appSecret) as jwt.JwtPayload;
      if (decoded.purpose !== 'meta_oauth') throw new Error('invalid purpose');
      return decoded;
    } catch {
      throw new BadRequestException('Parâmetro state inválido ou expirado.');
    }
  }

  async exchangeCodeForShortLivedToken(code: string): Promise<{
    access_token: string;
    token_type?: string;
    expires_in?: number;
  }> {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      client_secret: this.appSecret,
      code,
    });
    const { tokenUrl } = graphVersions();
    const url = `${tokenUrl}?${params.toString()}`;
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as { access_token?: string; error?: unknown };
    if (!res.ok || !data.access_token) {
      const msg = typeof data.error === 'object' && data.error !== null ? JSON.stringify(data.error) : 'troca de code falhou';
      throw new BadRequestException(msg);
    }
    return data as { access_token: string; token_type?: string; expires_in?: number };
  }

  successRedirect(): string {
    return this.successRedirectUrl();
  }

  failureRedirect(message: string): string {
    return this.errorRedirectUrl(message);
  }
}
