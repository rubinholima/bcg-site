import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { CognitoJwtPayload } from '../../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

const META_USER_CONFIG_KEY = 'meta_graph_user_connection';

/** Mesma versão no diálogo e na troca de token (manual: facebook-login/guides/advanced/manual-flow). */
function graphVersions(): { dialogUrl: string; tokenUrl: string; graphBase: string } {
  const v = process.env.META_GRAPH_API_VERSION?.trim() || 'v22.0';
  const ver = /^v\d+(\.\d+)?$/.test(v) ? v : 'v22.0';
  return {
    dialogUrl: `https://www.facebook.com/${ver}/dialog/oauth`,
    tokenUrl: `https://graph.facebook.com/${ver}/oauth/access_token`,
    graphBase: `https://graph.facebook.com/${ver}`,
  };
}

interface MetaUserConnectionConfig {
  accessToken: string;
  /** epoch ms; null se desconhecido */
  expiresAtMs: number | null;
}

/** Emails básicos para o primeiro passo; escopos extras exigem revisão Meta para publicar em Páginas. */
const DEFAULT_SCOPES = 'public_profile,email';

/** URL HTTPS pública para a Meta baixar a imagem (IG exige). Use META_IMAGE_PUBLIC_ORIGIN se diferente do site. */
export function graphPublicImageUrl(raw: string): string | null {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return null;
  const origin =
    process.env.META_IMAGE_PUBLIC_ORIGIN?.trim().replace(/\/$/, '') ?? 'https://www.bostoncitygroup.biz';

  if (/^https:\/\/bcg-platform-assets\.s3[a-z0-9.-]*\.amazonaws\.com\//i.test(t)) return t;

  try {
    const qi = t.indexOf('?');
    if (qi !== -1 && t.includes('key=')) {
      const params = new URLSearchParams(t.slice(qi + 1));
      const key = params.get('key');
      if (key) {
        const k = decodeURIComponent(key).trim();
        if (k.startsWith('media/') || k.startsWith('logos/')) return `${origin}/${k}`;
      }
    }
  } catch {
    /* continua */
  }

  try {
    if (/^https:\/\//i.test(t)) {
      const u = new URL(t);
      const host = u.hostname.toLowerCase();
      if (host === 'www.bostoncitygroup.biz' || host === 'bostoncitygroup.biz')
        return `${origin}${u.pathname}${u.search}`;
      if (/amazonaws\.com$/i.test(host)) return t;
      if (/facebook\.com|fbcdn\.net/i.test(host)) return t;
      return t;
    }
  } catch {
    return null;
  }

  const pathish = t.replace(/^\/+/, '');
  if (
    pathish.startsWith('media/') ||
    pathish.startsWith('logos/')
  )
    return `${origin}/${pathish}`;

  if (/amazonaws\.com/i.test(t) && (t.includes('/media/') || t.includes('/logos/'))) return t;
  return null;
}

@Injectable()
export class MetaOAuthService {
  constructor(private readonly prisma: PrismaService) {}

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
      const msg =
        typeof data.error === 'object' && data.error !== null
          ? JSON.stringify(data.error)
          : 'troca de code falhou';
      throw new BadRequestException(msg);
    }
    return data as { access_token: string; token_type?: string; expires_in?: number };
  }

  /** Troca token de curta duração por um de longa duração (~60 dias, conforme Meta). */
  async exchangeForLongLivedUserToken(shortToken: string): Promise<{
    access_token: string;
    expires_in?: number;
  }> {
    const { tokenUrl } = graphVersions();
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortToken,
    });
    const url = `${tokenUrl}?${params.toString()}`;
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: unknown };
    if (!res.ok || !data.access_token) {
      return { access_token: shortToken, expires_in: undefined };
    }
    return { access_token: data.access_token, expires_in: data.expires_in };
  }

  /** Persiste user access token (long-lived quando possível). */
  async persistOAuthTokens(shortLived: {
    access_token: string;
    expires_in?: number;
  }): Promise<void> {
    const long = await this.exchangeForLongLivedUserToken(shortLived.access_token);
    const token = long.access_token;
    const sec = long.expires_in ?? shortLived.expires_in ?? 3600;
    const expiresAtMs = Date.now() + Math.max(60, sec) * 1000;

    const cfg: MetaUserConnectionConfig = {
      accessToken: token,
      expiresAtMs,
    };
    await this.prisma.integrationConfig.upsert({
      where: { key: META_USER_CONFIG_KEY },
      create: { key: META_USER_CONFIG_KEY, config: cfg as object },
      update: { config: cfg as object },
    });
  }

  async getConnectionStatus(): Promise<{
    connected: boolean;
    expiresAt: string | null;
  }> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: META_USER_CONFIG_KEY },
    });
    if (!row?.config) return { connected: false, expiresAt: null };
    const c = row.config as unknown as MetaUserConnectionConfig;
    if (!c.accessToken?.trim()) return { connected: false, expiresAt: null };
    const exp = c.expiresAtMs ? new Date(c.expiresAtMs).toISOString() : null;
    const fresh = !c.expiresAtMs || c.expiresAtMs > Date.now();
    return { connected: fresh, expiresAt: exp };
  }

  private async getStoredUserAccessToken(): Promise<string | null> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { key: META_USER_CONFIG_KEY },
    });
    if (!row?.config) return null;
    const c = row.config as unknown as MetaUserConnectionConfig;
    if (!c.accessToken?.trim()) return null;
    if (c.expiresAtMs && c.expiresAtMs <= Date.now()) return null;
    return c.accessToken;
  }

  /**
   * Resolve token de Página para postar no feed. Requer escopos páginas na Meta.
   * META_FACEBOOK_PAGE_ID: ID numérico da Página; senão usa a primeira retornada por /me/accounts.
   */
  private async resolvePageAccessToken(): Promise<{ pageId: string; accessToken: string }> {
    const userToken = await this.getStoredUserAccessToken();
    if (!userToken) {
      throw new BadRequestException('Meta não conectada ou token expirado. Conecte de novo no Planner.');
    }
    const { graphBase } = graphVersions();
    const url = `${graphBase}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(userToken)}`;
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as {
      data?: { id: string; name?: string; access_token: string }[];
      error?: { message?: string };
    };
    if (!res.ok || data.error) {
      throw new BadRequestException(
        data.error?.message ??
          'Não foi possível listar Páginas. Inclua permissões de Página no app Meta (ex.: pages_show_list, pages_manage_posts) e reconecte.',
      );
    }
    const pages = data.data ?? [];
    if (pages.length === 0) {
      throw new BadRequestException(
        'Nenhuma Página encontrada para esta conta Meta. Use uma conta administradora da Página.',
      );
    }
    const configured = process.env.META_FACEBOOK_PAGE_ID?.trim();
    let pick = configured ? pages.find((p) => p.id === configured) : undefined;
    pick ??= pages[0];
    if (!pick?.access_token) {
      throw new BadRequestException('Token de Página inválido.');
    }
    return { pageId: pick.id, accessToken: pick.access_token };
  }

  private async getInstagramBusinessUserId(
    pageId: string,
    pageAccessToken: string,
  ): Promise<string | null> {
    const { graphBase } = graphVersions();
    const url = `${graphBase}/${encodeURIComponent(pageId)}?fields=instagram_business_account&access_token=${encodeURIComponent(pageAccessToken)}`;
    const res = await fetch(url, { method: 'GET' });
    const data = (await res.json()) as {
      instagram_business_account?: { id: string };
      error?: { message?: string };
    };
    if (!res.ok || data.error) return null;
    return data.instagram_business_account?.id ?? null;
  }

  /**
   * Publicação manual ou agendada: Facebook e/ou Instagram conforme `platforms` do post.
   */
  async publishMarketingPostScheduled(postId: string): Promise<{
    facebook?: string;
    instagram?: string;
    errors: string[];
  }> {
    const post = await this.prisma.marketingPost.findUnique({ where: { id: postId } });
    if (!post) throw new BadRequestException('Postagem não encontrada.');

    const platforms = (Array.isArray(post.platforms) ? post.platforms : []) as string[];
    const want = new Set(platforms.map((p) => String(p).toLowerCase()));
    if (!want.has('facebook') && !want.has('instagram')) {
      return { errors: [] };
    }

    const ext = { ...((post.externalIds as Record<string, string> | null) ?? {}) };
    const errors: string[] = [];

    const { pageId, accessToken } = await this.resolvePageAccessToken();
    const { graphBase } = graphVersions();

    const parts = [post.title?.trim(), post.content?.trim()].filter(Boolean);
    const message = parts.join('\n\n').slice(0, 8000);
    const imageUrls = (post.imageUrls as string[] | null) ?? [];
    const firstRaw = typeof imageUrls[0] === 'string' ? imageUrls[0].trim() : '';
    const publicImage = firstRaw ? graphPublicImageUrl(firstRaw) : null;

    if (want.has('facebook') && !ext.facebook) {
      try {
        if (publicImage) {
          const body = new URLSearchParams();
          body.set('access_token', accessToken);
          body.set('url', publicImage);
          body.set('published', 'true');
          if (message) body.set('caption', message.slice(0, 8000));
          const res = await fetch(`${graphBase}/${encodeURIComponent(pageId)}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          const j = (await res.json()) as { id?: string; error?: { message?: string } };
          if (!res.ok || !j.id || j.error) {
            throw new Error(j.error?.message ?? 'Falha ao publicar foto na Página.');
          }
          ext.facebook = j.id;
        } else {
          const body = new URLSearchParams();
          body.set('access_token', accessToken);
          body.set('message', message || ' ');
          const res = await fetch(`${graphBase}/${encodeURIComponent(pageId)}/feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          const j = (await res.json()) as { id?: string; error?: { message?: string } };
          if (!res.ok || !j.id || j.error) {
            throw new Error(j.error?.message ?? 'Falha ao publicar no feed da Página.');
          }
          ext.facebook = j.id;
        }
      } catch (e) {
        errors.push(`Facebook: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (want.has('instagram') && !ext.instagram) {
      if (!publicImage) {
        errors.push('Instagram: é necessário pelo menos uma imagem com URL pública (mídia BCG ou S3).');
      } else {
        const igUserId = await this.getInstagramBusinessUserId(pageId, accessToken);
        if (!igUserId) {
          errors.push('Instagram: Página sem conta Instagram Business vinculada ou sem permissão.');
        } else {
          try {
            const cap = message.slice(0, 2200);
            const create = new URLSearchParams();
            create.set('access_token', accessToken);
            create.set('image_url', publicImage);
            create.set('caption', cap || ' ');
            const r1 = await fetch(`${graphBase}/${encodeURIComponent(igUserId)}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: create,
            });
            const j1 = (await r1.json()) as { id?: string; error?: { message?: string } };
            if (!r1.ok || !j1.id || j1.error) {
              throw new Error(j1.error?.message ?? 'Falha ao criar mídia no Instagram.');
            }
            const pub = new URLSearchParams();
            pub.set('access_token', accessToken);
            pub.set('creation_id', j1.id);
            const r2 = await fetch(`${graphBase}/${encodeURIComponent(igUserId)}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: pub,
            });
            const j2 = (await r2.json()) as { id?: string; error?: { message?: string } };
            if (!r2.ok || !j2.id || j2.error) {
              throw new Error(j2.error?.message ?? 'Falha ao publicar no Instagram.');
            }
            ext.instagram = j2.id;
          } catch (e) {
            errors.push(`Instagram: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    const needFb = want.has('facebook');
    const needIg = want.has('instagram');
    const success =
      errors.length === 0 && (!needFb || !!ext.facebook) && (!needIg || !!ext.instagram);

    const notesJoined = errors.length
      ? [post.notes, errors.join(' | ')].filter(Boolean).join(' | ')
      : post.notes;

    await this.prisma.marketingPost.update({
      where: { id: postId },
      data: {
        externalIds: ext as object,
        status:
          success && (needFb || needIg) ? 'published' : errors.length > 0 ? 'failed' : post.status,
        publishedAt: success && (needFb || needIg) ? new Date() : post.publishedAt ?? undefined,
        notes: notesJoined,
      },
    });

    return { facebook: ext.facebook, instagram: ext.instagram, errors };
  }

  /** Publicar agora (rota planner): Meta conforme Facebook/Instagram marcados. */
  async publishMarketingPostToFacebook(postId: string): Promise<{ postId: string; pageId: string }> {
    const post = await this.prisma.marketingPost.findUnique({ where: { id: postId } });
    if (!post) throw new BadRequestException('Postagem não encontrada.');
    const pl = ((post.platforms as string[]) ?? []).map((p) => String(p).toLowerCase());
    if (!pl.includes('facebook') && !pl.includes('instagram')) {
      throw new BadRequestException('Marque Facebook e/ou Instagram nesta postagem.');
    }
    const { pageId } = await this.resolvePageAccessToken();
    const r = await this.publishMarketingPostScheduled(postId);
    const want = new Set(pl);
    if (r.errors.length > 0) {
      throw new BadRequestException(r.errors.join('; '));
    }
    const metaOk =
      (!want.has('facebook') || !!r.facebook) && (!want.has('instagram') || !!r.instagram);
    if (!metaOk) {
      throw new BadRequestException(
        'Publicação incompleta. Verifique conta Instagram Business, permissões da Página e URL pública das imagens.',
      );
    }
    return {
      postId: r.facebook ?? r.instagram ?? postId,
      pageId,
    };
  }

  successRedirect(): string {
    return this.successRedirectUrl();
  }

  failureRedirect(message: string): string {
    return this.errorRedirectUrl(message);
  }
}
