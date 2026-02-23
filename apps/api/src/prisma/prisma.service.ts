import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma com motor nativo (sem adapter pg).
 * DATABASE_URL é lida automaticamente pelo Prisma (prisma.config.ts / env).
 * Evita congelamento no startup em ambientes como AWS Lightsail.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
