import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env: primeiro da API, depois do cwd e da raiz do monorepo (para VAULT_MASTER_KEY etc.)
const apiDir = resolve(__dirname, '..');
const rootDir = resolve(apiDir, '../..');
config({ path: resolve(apiDir, '.env') });
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(rootDir, '.env') });

// Em produção (ex.: AWS Lightsail), usar 127.0.0.1 evita problemas de resolução IPv6 do Node com "localhost"
if (
  process.env.NODE_ENV === 'production' &&
  process.env.DATABASE_URL?.includes('localhost')
) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(
    /localhost/g,
    '127.0.0.1',
  );
}

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Response } from 'express';
import * as express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
    bodyParser: false, // vamos aplicar com limit maior abaixo
  });
  // Limite 2mb para JSON (página com Hero + dois títulos longos pode passar de 100kb)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ limit: '2mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true }); // permite localhost:3000 (Next) e outros em dev
  // Garante charset UTF-8 em respostas JSON
  app.use((_req, res: Response, next: NextFunction) => {
    const origJson = res.json.bind(res) as (body: unknown) => Response;
    res.json = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return origJson(body);
    };
    next();
  });
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
void bootstrap();
