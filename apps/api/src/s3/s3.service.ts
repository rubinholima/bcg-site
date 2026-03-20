import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand, S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { getAwsClientConfig } from '../common/aws-credentials';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
] as const;

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const MEDIA_PREFIX = 'media/';
const LOGOS_PREFIX = 'logos/';
const LEGAL_PREFIX = 'legal/';

/** Quando definido, URLs públicas são retornadas via este domínio (CloudFront OAC) em vez de s3.amazonaws.com. */
const PUBLIC_MEDIA_ORIGIN = (process.env.PUBLIC_MEDIA_ORIGIN ?? '').replace(/\/$/, '');

@Injectable()
export class S3Service {
  private readonly bucket: string;
  private readonly region: string;
  private readonly client: S3Client;

  constructor() {
    const bucket = (process.env.AWS_S3_BUCKET ?? '').trim();
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET must be set');
    }
    this.bucket = bucket;
    const config = getAwsClientConfig();
    this.region = config.region;
    this.client = new S3Client(config);
  }

  /** URL pública do objeto: domínio oficial se configurado, senão S3 direto. */
  getPublicUrl(key: string): string {
    if (PUBLIC_MEDIA_ORIGIN) {
      const path = key.startsWith('/') ? key : `/${key}`;
      return `${PUBLIC_MEDIA_ORIGIN}${path}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload de logo para S3.
   * - scope 'group' → logos/group/logo.{ext} (logo BCG)
   * - scope = tenantId → logos/tenants/{tenantId}/logo.{ext}
   * Retorna a URL pública (requer bucket policy de leitura em logos/*).
   */
  async uploadLogo(
    buffer: Buffer,
    contentType: string,
    scope: 'group' | string,
  ): Promise<{ key: string; url: string }> {
    if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
      throw new InternalServerErrorException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}`,
      );
    }
    const ext = EXT_BY_MIME[contentType] ?? 'png';
    const key =
      scope === 'group'
        ? `logos/group/logo.${ext}`
        : `logos/tenants/${scope}/logo.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar logo para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de imagem para a pasta de mídia do site (placeholders, fundos).
   * Salva em media/{sizeKey}/{uuid}.{ext}. sizeKey padrão: "custom".
   * Quando sizeKey é "galeria_clubes" e subfolder (slug) é informado: media/galeria_clubes/{slug}/{uuid}.{ext}.
   * Retorna key e URL pública (requer bucket policy de leitura em media/*).
   */
  async uploadMedia(
    buffer: Buffer,
    contentType: string,
    sizeKey: string = 'custom',
    subfolder?: string,
  ): Promise<{ key: string; url: string }> {
    if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
      throw new InternalServerErrorException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}`,
      );
    }
    const ext = EXT_BY_MIME[contentType] ?? 'png';
    const safeKey = sizeKey.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'custom';
    const safeSub = subfolder?.trim()
      ? subfolder.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
      : '';
    const pathSuffix =
      safeKey === 'galeria_clubes' && safeSub
        ? `${safeKey}/${safeSub}/${randomUUID()}.${ext}`
        : safeKey === 'eventos' && safeSub
          ? `${safeKey}/${safeSub}/${randomUUID()}.${ext}`
          : `${safeKey}/${randomUUID()}.${ext}`;
    const key = `${MEDIA_PREFIX}${pathSuffix}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar mídia para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de logo de competição para logos/competitions/.
   * Usado no cadastro de campeonatos.
   */
  async uploadLogoCompetition(
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
      throw new InternalServerErrorException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}`,
      );
    }
    const ext = EXT_BY_MIME[contentType] ?? 'png';
    const key = `logos/competitions/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar logo para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de logo de evento para logos/eventos/.
   * Salva em logos/eventos/{eventId}.{ext}.
   */
  async uploadLogoEvent(
    eventId: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
      throw new InternalServerErrorException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}`,
      );
    }
    const ext = EXT_BY_MIME[contentType] ?? 'png';
    const safeId = eventId.replace(/[^a-z0-9_-]/gi, '_').slice(0, 64) || randomUUID();
    const key = `logos/eventos/${safeId}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar logo do evento para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de logo de time adversário/externo para logos/external/.
   * Usado no módulo Próximos Jogos (lista manual) para logos de visitantes/casa contrária.
   */
  async uploadLogoExternal(
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    if (!ALLOWED_TYPES.includes(contentType as (typeof ALLOWED_TYPES)[number])) {
      throw new InternalServerErrorException(
        `Tipo de arquivo não permitido. Use: ${ALLOWED_TYPES.join(', ')}`,
      );
    }
    const ext = EXT_BY_MIME[contentType] ?? 'png';
    const key = `logos/external/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar logo para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Lista objetos na pasta media/ (ou media/{sizeKey}/).
   * Quando sizeKey é "galeria_clubes" e subfolder (slug) é informado: media/galeria_clubes/{slug}/.
   * Retorna key, url, size (bytes), lastModified.
   */
  async listMedia(sizeKey?: string, subfolder?: string): Promise<Array<{ key: string; url: string; size: number; lastModified: string }>> {
    let prefix = MEDIA_PREFIX;
    if (sizeKey) {
      const safeKey = sizeKey.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      const safeSub = subfolder?.trim()
        ? subfolder.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
        : '';
      prefix =
        safeKey === 'galeria_clubes' && safeSub
          ? `${MEDIA_PREFIX}${safeKey}/${safeSub}/`
          : `${MEDIA_PREFIX}${safeKey}/`;
    }

    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 500,
        }),
      );
      const items = (response.Contents ?? []).filter((o) => o.Key && !o.Key.endsWith('/'));
      return items.map((o) => ({
        key: o.Key!,
        url: this.getPublicUrl(o.Key!),
        size: o.Size ?? 0,
        lastModified: o.LastModified?.toISOString() ?? '',
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao listar mídia no S3: ${message}`,
      );
    }
  }

  /**
   * Lista todas as imagens a partir das primeiras pastas do bucket: logos/ e media/.
   * Retorna key, url, size, lastModified e folder (ex: "logos", "media") para exibir na UI.
   */
  async listAllAssets(): Promise<
    Array<{ key: string; url: string; size: number; lastModified: string; folder: string }>
  > {
    try {
      const [logosRes, mediaRes] = await Promise.all([
        this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: LOGOS_PREFIX,
            MaxKeys: 500,
          }),
        ),
        this.client.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            Prefix: MEDIA_PREFIX,
            MaxKeys: 500,
          }),
        ),
      ]);

      const toItem = (
        o: { Key?: string; Size?: number; LastModified?: Date },
        folder: string,
      ) => ({
        key: o.Key!,
        url: this.getPublicUrl(o.Key!),
        size: o.Size ?? 0,
        lastModified: o.LastModified?.toISOString() ?? '',
        folder,
      });

      const logos = (logosRes.Contents ?? [])
        .filter((o) => o.Key && !o.Key.endsWith('/'))
        .map((o) => toItem(o, 'logos'));
      const media = (mediaRes.Contents ?? [])
        .filter((o) => o.Key && !o.Key.endsWith('/'))
        .map((o) => toItem(o, 'media'));

      return [...logos, ...media].sort(
        (a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao listar assets no S3: ${message}`,
      );
    }
  }

  /**
   * Remove um objeto do S3 (imagem ou logo).
   * Key deve começar com media/ ou logos/.
   */
  async deleteObject(key: string): Promise<void> {
    const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
    if (
      !safeKey.startsWith(MEDIA_PREFIX) &&
      !safeKey.startsWith(LOGOS_PREFIX) &&
      !safeKey.startsWith(LEGAL_PREFIX)
    ) {
      throw new InternalServerErrorException('Key inválida');
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: safeKey,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao remover objeto do S3: ${message}`,
      );
    }
  }

  /**
   * Upload de documento jurídico (PDF) para S3.
   * Salva em legal/{playerId}/{uuid}.pdf
   */
  async uploadLegalDocument(
    buffer: Buffer,
    playerId: string,
    filename: string,
  ): Promise<{ key: string; url: string }> {
    const ext = filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'pdf';
    const key = `${LEGAL_PREFIX}${playerId}/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: 'application/pdf',
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar documento para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Retorna o buffer de um objeto (para envio ao Adobe Sign).
   */
  async getObjectBuffer(key: string): Promise<Buffer> {
    const { body } = await this.getObject(key);
    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Retorna o stream de um objeto do S3 (para miniatura na página Mídia).
   * Usa credenciais AWS, então funciona mesmo com bucket privado.
   */
  async getObject(key: string): Promise<{ body: Readable; contentType: string }> {
    const safeKey = key.replace(/^\/+/, '').replace(/\.\./g, '');
    if (
      !safeKey.startsWith(MEDIA_PREFIX) &&
      !safeKey.startsWith(LOGOS_PREFIX) &&
      !safeKey.startsWith(LEGAL_PREFIX)
    ) {
      throw new InternalServerErrorException('Key inválida');
    }
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: safeKey,
        }),
      );
      const body = response.Body;
      if (!body) {
        throw new InternalServerErrorException('Objeto vazio');
      }
      const contentType = response.ContentType ?? 'application/octet-stream';
      return { body: body as Readable, contentType };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao obter objeto do S3: ${message}`,
      );
    }
  }
}
