import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env: primeiro da API, depois do cwd e da raiz do monorepo (para VAULT_MASTER_KEY etc.)
const apiDir = resolve(__dirname, '..');
const rootDir = resolve(apiDir, '../..');
config({ path: resolve(apiDir, '.env') });
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(rootDir, '.env') });

// Em produção (ex.: AWS Lightsail), usar 127.0.0.1 evita problemas de resolução IPv6 do Node com "localhost"
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('localhost')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/localhost/g, '127.0.0.1');
}

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
  // Garante charset UTF-8 em respostas JSON
  app.use((_req, res, next) => {
    const origJson = res.json.bind(res);
    res.json = (body: unknown) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return origJson(body);
    };
    next();
  });
  await app.listen(Number(process.env.PORT ?? 3001), '0.0.0.0');
}
bootstrap();
