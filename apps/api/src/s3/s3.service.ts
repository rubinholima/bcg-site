import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getAwsClientConfig } from '../common/aws-credentials';

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

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return { key, url };
  }
}
