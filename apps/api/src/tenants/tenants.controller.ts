import {
  Controller,
  Get,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Debug: testa conexão e query direta; retorna { ok, error?, count? } */
  @Get('debug')
  async debug() {
    try {
      const count = await this.prisma.tenant.count();
      return { ok: true, count };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      return {
        ok: false,
        error: msg,
        stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
      };
    }
  }

  @Get()
  async findAll() {
    try {
      return await this.tenantsService.findAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`GET /tenants: ${msg}`);
    }
  }
}
