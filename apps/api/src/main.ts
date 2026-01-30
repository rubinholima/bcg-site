import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: true }); // permite localhost:3000 (Next) e outros em dev
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
