/**
 * Aplica regras de lifecycle no bucket S3 (economia e limpeza).
 *
 * Rodar (monorepo, com AWS credenciais):
 *   pnpm --filter api run s3:lifecycle
 *
 * Regras:
 * - Aborta uploads multipart incompletos após 7 dias
 * - Novos objetos em media/ e logos/ → Intelligent-Tiering (AWS otimiza custo automaticamente)
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  S3Client,
  GetBucketLifecycleConfigurationCommand,
  PutBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import { getAwsClientConfig } from '../src/common/aws-credentials';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.AWS_S3_BUCKET) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

async function main() {
  const bucket = (process.env.AWS_S3_BUCKET ?? '').trim();
  if (!bucket) {
    console.error('AWS_S3_BUCKET não definido.');
    process.exit(1);
  }

  const client = new S3Client(getAwsClientConfig());

  const rules = [
    {
      ID: 'abort-incomplete-multipart-7d',
      Status: 'Enabled' as const,
      Filter: { Prefix: '' },
      AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
    },
    {
      ID: 'intelligent-tiering-media',
      Status: 'Enabled' as const,
      Filter: { Prefix: 'media/' },
      Transitions: [{ Days: 0, StorageClass: 'INTELLIGENT_TIERING' as const }],
    },
    {
      ID: 'intelligent-tiering-logos',
      Status: 'Enabled' as const,
      Filter: { Prefix: 'logos/' },
      Transitions: [{ Days: 0, StorageClass: 'INTELLIGENT_TIERING' as const }],
    },
  ];

  try {
    const current = await client.send(
      new GetBucketLifecycleConfigurationCommand({ Bucket: bucket }),
    );
    console.log(
      'Lifecycle atual:',
      (current.Rules ?? []).map((r) => r.ID).join(', ') || '(nenhuma)',
    );
  } catch {
    console.log('Lifecycle atual: (nenhuma ou sem permissão de leitura)');
  }

  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: bucket,
      LifecycleConfiguration: { Rules: rules },
    }),
  );

  console.log(`Lifecycle aplicado no bucket ${bucket}:`);
  for (const r of rules) console.log(`  - ${r.ID}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
