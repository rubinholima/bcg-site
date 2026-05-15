import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantKindDto } from './dto/create-tenant-kind.dto';
import { UpdateTenantKindDto } from './dto/update-tenant-kind.dto';
import { TenantKindResponseDto } from './dto/tenant-kind-response.dto';

@Injectable()
export class TenantKindsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<TenantKindResponseDto[]> {
    return this.prisma.tenantKind.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string): Promise<TenantKindResponseDto> {
    const kind = await this.prisma.tenantKind.findUnique({
      where: { id },
    });

    if (!kind) {
      throw new NotFoundException(`Tipo com ID "${id}" não encontrado`);
    }

    return kind;
  }

  async create(createTenantKindDto: CreateTenantKindDto): Promise<TenantKindResponseDto> {
    const name = cadastroUpperRequired(createTenantKindDto.name);
    const existingKind = await this.prisma.tenantKind.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });

    if (existingKind) {
      throw new ConflictException(`Tipo com nome "${name}" já existe`);
    }

    return this.prisma.tenantKind.create({
      data: { ...createTenantKindDto, name },
    });
  }

  async update(id: string, updateTenantKindDto: UpdateTenantKindDto): Promise<TenantKindResponseDto> {
    // Verificar se existe
    await this.findOne(id);

    if (updateTenantKindDto.name) {
      const name = cadastroUpperRequired(updateTenantKindDto.name);
      const existingKind = await this.prisma.tenantKind.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existingKind) {
        throw new ConflictException(`Tipo com nome "${name}" já existe`);
      }
    }

    const data = { ...updateTenantKindDto };
    if (updateTenantKindDto.name) {
      data.name = cadastroUpperRequired(updateTenantKindDto.name);
    }

    return this.prisma.tenantKind.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);

    // Verificar se há tenants usando este tipo (Tenant.kindId)
    const tenantsUsingKind = await this.prisma.tenant.findFirst({
      where: { kindId: id },
    });

    if (tenantsUsingKind) {
      throw new ConflictException(
        `Não é possível excluir o tipo pois existem empresas utilizando-o`
      );
    }

    await this.prisma.tenantKind.delete({
      where: { id },
    });
  }
}
