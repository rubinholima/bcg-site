import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env: primeiro da API, depois do cwd e da raiz do monorepo (para VAULT_MASTER_KEY etc.)
const apiDir = resolve(__dirname, '..');
const rootDir = resolve(apiDir, '../..');
config({ path: resolve(apiDir, '.env') });
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(rootDir, '.env') });

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'], // sem banner/log de startup no console
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true }); // permite localhost:3000 (Next) e outros em dev
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
bootstrap();
