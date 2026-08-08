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
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Response } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

/** Páginas de tenant com muitos módulos (JSON grande) — evita 413 request entity too large */
const JSON_BODY_LIMIT = '15mb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'], // sem banner/log de startup no console
    bodyParser: false,
  });
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: JSON_BODY_LIMIT, extended: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const allowedOrigins =
    corsOrigins.length > 0
      ? corsOrigins
      : process.env.NODE_ENV === 'production'
        ? [
            'https://www.bostoncitygroup.biz',
            'https://bostoncitygroup.biz',
            'https://origin.bostoncitygroup.biz',
          ]
        : defaultDevOrigins;
  app.enableCors({
    origin: (origin, callback) => {
      // same-origin / server-to-server (sem Origin) — Next BFF
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });

  // Headers básicos de endurecimento (sem quebrar assets/API JSON)
  app.use((_req, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Garante charset UTF-8 em respostas JSON
  app.use((_req, res: Response, next: NextFunction) => {
    const origJson = res.json.bind(res) as (body: unknown) => Response;
    res.json = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return origJson(body);
    };
    next();
  });

  const host =
    process.env.API_BIND_HOST?.trim() ||
    (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
  await app.listen(Number(process.env.PORT ?? 3001), host);
}
void bootstrap();
