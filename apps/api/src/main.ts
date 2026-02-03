import { config } from 'dotenv';
import { resolve } from 'path';

// Garante que .env seja carregado do diretório apps/api (mesmo rodando da raiz do monorepo)
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(__dirname, '..', '.env') });

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
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
