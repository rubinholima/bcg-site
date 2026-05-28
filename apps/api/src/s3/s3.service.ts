import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  PutObjectCommand,
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { getAwsClientConfig } from '../common/aws-credentials';
import {
  extensionForContentType,
  optimizeDocumentImage,
  optimizeLogoImage,
  optimizeUploadImage,
} from '../common/optimize-upload-image';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
] as const;

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
] as const;

const AUDIO_EXT_BY_MIME: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
};

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

const MEDIA_PREFIX = 'media/';
const LOGOS_PREFIX = 'logos/';
/** Logos de adversários (Clubes Adv) — pasta dedicada no bucket */
const LOGOS_CLUBES_ADV_PREFIX = 'logos/clubes-adv/';
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

  private async normalizeImageUpload(
    buffer: Buffer,
    contentType: string,
    kind: 'logo' | 'media' | 'document',
    sizeKey?: string,
  ): Promise<{ buffer: Buffer; contentType: string; ext: string }> {
    let optimized: { buffer: Buffer; contentType: string };
    if (kind === 'logo') {
      optimized = await optimizeLogoImage(buffer, contentType);
    } else if (kind === 'document') {
      optimized = await optimizeDocumentImage(buffer, contentType);
    } else {
      optimized = await optimizeUploadImage(buffer, contentType, sizeKey);
    }
    return {
      ...optimized,
      ext: extensionForContentType(optimized.contentType),
    };
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
    const optimized = await this.normalizeImageUpload(buffer, contentType, 'logo');
    buffer = optimized.buffer;
    contentType = optimized.contentType;
    const ext = optimized.ext;
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
    const optimized = await this.normalizeImageUpload(buffer, contentType, 'media', sizeKey);
    buffer = optimized.buffer;
    contentType = optimized.contentType;
    const ext = optimized.ext;
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

  /** Upload de áudio (MP3/WAV) — pasta media/{sizeKey}/, sem otimização de imagem. */
  async uploadAudio(
    buffer: Buffer,
    contentType: string,
    sizeKey: string = 'hino',
  ): Promise<{ key: string; url: string }> {
    const mime = contentType === 'audio/mp3' ? 'audio/mpeg' : contentType;
    if (!ALLOWED_AUDIO_TYPES.includes(mime as (typeof ALLOWED_AUDIO_TYPES)[number])) {
      throw new InternalServerErrorException(
        `Tipo de áudio não permitido. Use: MP3, WAV ou M4A.`,
      );
    }
    const ext = AUDIO_EXT_BY_MIME[mime] ?? 'mp3';
    const safeKey = sizeKey.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'hino';
    const key = `${MEDIA_PREFIX}${safeKey}/${randomUUID()}.${ext}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: mime,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao enviar áudio para S3: ${message}`,
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
    const optimized = await this.normalizeImageUpload(buffer, contentType, 'logo');
    buffer = optimized.buffer;
    contentType = optimized.contentType;
    const ext = optimized.ext;
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
    const optimized = await this.normalizeImageUpload(buffer, contentType, 'logo');
    buffer = optimized.buffer;
    contentType = optimized.contentType;
    const ext = optimized.ext;
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
   * Upload de logo de time adversário (Clubes Adv) para logos/clubes-adv/.
   * Pasta legada logos/external/ deve ser migrada via POST /media/migrate-external-logos.
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
    const optimized = await this.normalizeImageUpload(buffer, contentType, 'logo');
    buffer = optimized.buffer;
    contentType = optimized.contentType;
    const ext = optimized.ext;
    const key = `${LOGOS_CLUBES_ADV_PREFIX}${randomUUID()}.${ext}`;

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
   * Lista todos os objetos sob um prefixo (paginação S3 — antes só 500 itens e cortava a lista).
   */
  private async listAllObjectsUnderPrefix(
    prefix: string,
  ): Promise<Array<{ Key?: string; Size?: number; LastModified?: Date; ETag?: string }>> {
    const out: Array<{ Key?: string; Size?: number; LastModified?: Date; ETag?: string }> = [];
    let continuationToken: string | undefined;
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        }),
      );
      for (const o of response.Contents ?? []) {
        if (o.Key && !o.Key.endsWith('/')) out.push(o);
      }
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);
    return out;
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
      const items = await this.listAllObjectsUnderPrefix(prefix);
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
   * Lista logos/ + media/ com ETag (para detectar duplicatas).
   */
  async listAllAssetsWithMeta(): Promise<
    Array<{
      key: string;
      url: string;
      size: number;
      lastModified: string;
      folder: string;
      etag: string;
    }>
  > {
    try {
      const [logosRaw, mediaRaw] = await Promise.all([
        this.listAllObjectsUnderPrefix(LOGOS_PREFIX),
        this.listAllObjectsUnderPrefix(MEDIA_PREFIX),
      ]);

      const toItem = (
        o: { Key?: string; Size?: number; LastModified?: Date; ETag?: string },
        folder: string,
      ) => ({
        key: o.Key!,
        url: this.getPublicUrl(o.Key!),
        size: o.Size ?? 0,
        lastModified: o.LastModified?.toISOString() ?? '',
        folder,
        etag: (o.ETag ?? '').replace(/"/g, ''),
      });

      const logos = logosRaw.map((o) => toItem(o, 'logos'));
      const media = mediaRaw.map((o) => toItem(o, 'media'));

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
   * Lista todas as imagens a partir das primeiras pastas do bucket: logos/ e media/.
   * Retorna key, url, size, lastModified e folder (ex: "logos", "media") para exibir na UI.
   */
  async listAllAssets(): Promise<
    Array<{ key: string; url: string; size: number; lastModified: string; folder: string }>
  > {
    try {
      const [logosRaw, mediaRaw] = await Promise.all([
        this.listAllObjectsUnderPrefix(LOGOS_PREFIX),
        this.listAllObjectsUnderPrefix(MEDIA_PREFIX),
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

      const logos = logosRaw.map((o) => toItem(o, 'logos'));
      const media = mediaRaw.map((o) => toItem(o, 'media'));

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
   * Lista apenas as keys (paths) sob um prefixo (ex.: logos/external/).
   */
  async listKeysUnderPrefix(prefix: string): Promise<string[]> {
    const safe = prefix.replace(/^\/+/, '').replace(/\.\./g, '');
    const items = await this.listAllObjectsUnderPrefix(safe);
    return items.map((o) => o.Key!).filter(Boolean);
  }

  /**
   * Copia um objeto dentro do mesmo bucket (ex.: logos/external/x → logos/clubes-adv/x).
   */
  async copyObject(sourceKey: string, destKey: string): Promise<void> {
    const safeSource = sourceKey.replace(/^\/+/, '').replace(/\.\./g, '');
    const safeDest = destKey.replace(/^\/+/, '').replace(/\.\./g, '');
    if (
      !safeSource.startsWith(LOGOS_PREFIX) ||
      !safeDest.startsWith(LOGOS_PREFIX)
    ) {
      throw new InternalServerErrorException('Key inválida para cópia');
    }
    try {
      const copySource = `${this.bucket}/${encodeURIComponent(safeSource)}`;
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          Key: safeDest,
          CopySource: copySource,
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(
        `Falha ao copiar objeto no S3: ${message}`,
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
   * Upload de modelo de contrato base (PDF AcroForm).
   * Salva em legal/templates/{scope}/{uuid}.pdf
   */
  async uploadContractTemplate(
    buffer: Buffer,
    scope: string,
    filename: string,
  ): Promise<{ key: string; url: string }> {
    const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, '_') || 'global';
    const key = `${LEGAL_PREFIX}templates/${safeScope}/${randomUUID()}.pdf`;

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
        `Falha ao enviar modelo de contrato para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de contrato gerado no vínculo RH.
   * Salva em legal/rh/{employmentId}/{uuid}.pdf
   */
  async uploadEmploymentContract(
    buffer: Buffer,
    employmentId: string,
    filename: string,
  ): Promise<{ key: string; url: string }> {
    const key = `${LEGAL_PREFIX}rh/${employmentId}/${randomUUID()}.pdf`;

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
        `Falha ao enviar contrato RH para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de documento do cadastro do atleta (PDF ou imagem).
   * Salva em media/jogadores-documentos/{playerId}/{uuid}.{ext}
   */
  async uploadPlayerRegistrationDocument(
    buffer: Buffer,
    playerId: string,
    filename: string,
    mimeType?: string,
  ): Promise<{ key: string; url: string }> {
    const lower = filename.toLowerCase();
    let ext = 'pdf';
    let contentType = 'application/pdf';
    if (lower.endsWith('.png')) {
      ext = 'png';
      contentType = 'image/png';
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      ext = 'jpg';
      contentType = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      ext = 'webp';
      contentType = 'image/webp';
    } else if (lower.endsWith('.pdf')) {
      ext = 'pdf';
      contentType = 'application/pdf';
    } else if (mimeType?.startsWith('image/')) {
      ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      contentType = mimeType;
    }

    if (contentType.startsWith('image/')) {
      const optimized = await this.normalizeImageUpload(buffer, contentType, 'document');
      buffer = optimized.buffer;
      contentType = optimized.contentType;
      ext = optimized.ext;
    }

    const key = `media/jogadores-documentos/${playerId}/${randomUUID()}.${ext}`;

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
        `Falha ao enviar documento para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de documento via convite público de cadastro (pendente aprovação RH).
   * Salva em media/cadastro-convite/{inviteId}/{uuid}.{ext}
   */
  async uploadRegistrationInviteDocument(
    buffer: Buffer,
    inviteId: string,
    filename: string,
    mimeType?: string,
  ): Promise<{ key: string; url: string }> {
    const lower = filename.toLowerCase();
    let ext = 'pdf';
    let contentType = 'application/pdf';
    if (lower.endsWith('.png')) {
      ext = 'png';
      contentType = 'image/png';
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      ext = 'jpg';
      contentType = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      ext = 'webp';
      contentType = 'image/webp';
    } else if (lower.endsWith('.pdf')) {
      ext = 'pdf';
      contentType = 'application/pdf';
    } else if (mimeType?.startsWith('image/')) {
      ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      contentType = mimeType;
    }

    if (contentType.startsWith('image/')) {
      const optimized = await this.normalizeImageUpload(buffer, contentType, 'document');
      buffer = optimized.buffer;
      contentType = optimized.contentType;
      ext = optimized.ext;
    }

    const key = `media/cadastro-convite/${inviteId}/${randomUUID()}.${ext}`;

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
        `Falha ao enviar documento para S3: ${message}`,
      );
    }

    return { key, url: this.getPublicUrl(key) };
  }

  /**
   * Upload de documentos RH (PDF ou imagem).
   * Salva em media/rh_documentos/{uuid}.{ext}
   */
  async uploadRhDocument(
    buffer: Buffer,
    filename: string,
    mimeType?: string,
  ): Promise<{ key: string; url: string }> {
    const lower = filename.toLowerCase();
    let ext = 'pdf';
    let contentType = 'application/pdf';
    if (lower.endsWith('.png')) {
      ext = 'png';
      contentType = 'image/png';
    } else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
      ext = 'jpg';
      contentType = 'image/jpeg';
    } else if (lower.endsWith('.webp')) {
      ext = 'webp';
      contentType = 'image/webp';
    } else if (lower.endsWith('.pdf')) {
      ext = 'pdf';
      contentType = 'application/pdf';
    } else if (mimeType?.startsWith('image/')) {
      ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      contentType = mimeType;
    }

    if (contentType.startsWith('image/')) {
      const optimized = await this.normalizeImageUpload(buffer, contentType, 'document');
      buffer = optimized.buffer;
      contentType = optimized.contentType;
      ext = optimized.ext;
    }

    const key = `${MEDIA_PREFIX}rh_documentos/${randomUUID()}.${ext}`;

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
        `Falha ao enviar documento RH para S3: ${message}`,
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
