import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { CreateLogisticsGuestDto } from './dto/create-logistics-guest.dto';
import { CreateLogisticsHotelDto } from './dto/create-logistics-hotel.dto';
import { CreateLogisticsLookupDto } from './dto/create-logistics-lookup.dto';
import { CreateLogisticsLoyaltyProgramDto } from './dto/create-logistics-loyalty-program.dto';
import { CreateLogisticsRoomTypeDto } from './dto/create-logistics-room-type.dto';
import {
  CreateLogisticsAirportDto,
  UpdateLogisticsAirportDto,
} from './dto/create-logistics-airport.dto';
import {
  CreateLogisticsServiceProductDto,
  UpdateLogisticsServiceProductDto,
} from './dto/create-logistics-service-product.dto';
import {
  CreateLogisticsClothingGroupDto,
  UpdateLogisticsClothingGroupDto,
} from './dto/create-logistics-clothing-group.dto';
import {
  CreateLogisticsClothingCategoryDto,
  UpdateLogisticsClothingCategoryDto,
} from './dto/create-logistics-clothing-category.dto';
import {
  CreateLogisticsUniformTypeDto,
  UpdateLogisticsUniformTypeDto,
} from './dto/create-logistics-uniform-type.dto';
import {
  CreateLogisticsClothingItemDto,
  UpdateLogisticsClothingItemDto,
} from './dto/create-logistics-clothing-item.dto';
import {
  CreateLogisticsUniformKitDto,
  LogisticsUniformKitItemInputDto,
  UpdateLogisticsUniformKitDto,
} from './dto/create-logistics-uniform-kit.dto';
import { UpdateLogisticsGuestDto } from './dto/update-logistics-guest.dto';
import { UpdateLogisticsHotelDto } from './dto/update-logistics-hotel.dto';
import { UpdateLogisticsLookupDto } from './dto/update-logistics-lookup.dto';
import { UpdateLogisticsLoyaltyProgramDto } from './dto/update-logistics-loyalty-program.dto';
import { UpdateLogisticsRoomTypeDto } from './dto/update-logistics-room-type.dto';

@Injectable()
export class LogisticaCadastrosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  private async ensureClubTenant(tenantId: string) {
    const tenant = await this.tenants.findOne(tenantId);
    const kindName = (tenant as { kind?: { name?: string } }).kind?.name;
    if (!kindName) throw new BadRequestException('Tenant sem tipo definido');
    const k = kindName.toLowerCase();
    const isClub =
      k.includes('futebol') || k.includes('clube') || k.includes('football');
    if (
      !isClub ||
      k.includes('construtora') ||
      k.includes('real estate') ||
      k.includes('construção')
    ) {
      throw new BadRequestException(
        'Cadastros de logística são disponíveis apenas para clubes de futebol',
      );
    }
  }

  private guardSystemEdit(isSystem: boolean) {
    if (isSystem) {
      throw new ForbiddenException(
        'Registro padrão do sistema não pode ser alterado ou excluído',
      );
    }
  }

  // ——— Companhias de transporte ———
  findTransportCompanies(activeOnly?: string) {
    return this.prisma.logisticsTransportCompany.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findTransportCompany(id: string) {
    const item = await this.prisma.logisticsTransportCompany.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Transportadora não encontrada');
    return item;
  }

  async createTransportCompany(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsTransportCompany.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsTransportCompany.create({
      data: {
        name,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateTransportCompany(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findTransportCompany(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsTransportCompany.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsTransportCompany.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeTransportCompany(id: string) {
    const current = await this.findTransportCompany(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsTransportCompany.delete({ where: { id } });
  }

  // ——— Programas de fidelidade ———
  findLoyaltyPrograms(activeOnly?: string) {
    return this.prisma.logisticsLoyaltyProgram.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      include: { transportCompany: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findLoyaltyProgram(id: string) {
    const item = await this.prisma.logisticsLoyaltyProgram.findUnique({
      where: { id },
      include: { transportCompany: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundException('Programa de milhas não encontrado');
    return item;
  }

  async createLoyaltyProgram(dto: CreateLogisticsLoyaltyProgramDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsLoyaltyProgram.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    if (dto.transportCompanyId)
      await this.findTransportCompany(dto.transportCompanyId);
    return this.prisma.logisticsLoyaltyProgram.create({
      data: {
        name,
        transportCompanyId: dto.transportCompanyId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
      include: { transportCompany: { select: { id: true, name: true } } },
    });
  }

  async updateLoyaltyProgram(
    id: string,
    dto: UpdateLogisticsLoyaltyProgramDto,
  ) {
    const current = await this.findLoyaltyProgram(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsLoyaltyProgram.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    if (dto.transportCompanyId)
      await this.findTransportCompany(dto.transportCompanyId);
    return this.prisma.logisticsLoyaltyProgram.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.transportCompanyId !== undefined && {
          transportCompanyId: dto.transportCompanyId || null,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { transportCompany: { select: { id: true, name: true } } },
    });
  }

  async removeLoyaltyProgram(id: string) {
    const current = await this.findLoyaltyProgram(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsLoyaltyProgram.delete({ where: { id } });
  }

  // ——— Momentos de uso ———
  findUsageMoments(activeOnly?: string) {
    return this.prisma.logisticsUsageMoment.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findUsageMoment(id: string) {
    const item = await this.prisma.logisticsUsageMoment.findUnique({
      where: { id },
    });
    if (!item)
      throw new NotFoundException('Finalidade do deslocamento não encontrada');
    return item;
  }

  async createUsageMoment(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsUsageMoment.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsUsageMoment.create({
      data: { name, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true },
    });
  }

  async updateUsageMoment(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findUsageMoment(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsUsageMoment.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsUsageMoment.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeUsageMoment(id: string) {
    const current = await this.findUsageMoment(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsUsageMoment.delete({ where: { id } });
  }

  // ——— Tipos de pagamento ———
  findPaymentTypes(activeOnly?: string) {
    return this.prisma.logisticsPaymentType.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findPaymentType(id: string) {
    const item = await this.prisma.logisticsPaymentType.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Forma de pagamento não encontrada');
    return item;
  }

  async createPaymentType(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsPaymentType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsPaymentType.create({
      data: { name, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true },
    });
  }

  async updatePaymentType(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findPaymentType(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsPaymentType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsPaymentType.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removePaymentType(id: string) {
    const current = await this.findPaymentType(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsPaymentType.delete({ where: { id } });
  }

  // ——— Tipos de quarto ———
  findRoomTypes(activeOnly?: string) {
    return this.prisma.logisticsRoomType.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findRoomType(id: string) {
    const item = await this.prisma.logisticsRoomType.findUnique({
      where: { id },
    });
    if (!item)
      throw new NotFoundException('Categoria de acomodação não encontrada');
    return item;
  }

  async createRoomType(dto: CreateLogisticsRoomTypeDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsRoomType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    const capacity = dto.capacity ?? 1;
    if (capacity < 1)
      throw new BadRequestException('Capacidade deve ser no mínimo 1');
    return this.prisma.logisticsRoomType.create({
      data: {
        name,
        capacity,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateRoomType(id: string, dto: UpdateLogisticsRoomTypeDto) {
    const current = await this.findRoomType(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsRoomType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    if (dto.capacity !== undefined && dto.capacity < 1) {
      throw new BadRequestException('Capacidade deve ser no mínimo 1');
    }
    return this.prisma.logisticsRoomType.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeRoomType(id: string) {
    const current = await this.findRoomType(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsRoomType.delete({ where: { id } });
  }

  // ——— Tipos de visto ———
  findVisaTypes(activeOnly?: string) {
    return this.prisma.logisticsVisaType.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findVisaType(id: string) {
    const item = await this.prisma.logisticsVisaType.findUnique({
      where: { id },
    });
    if (!item)
      throw new NotFoundException('Visto internacional não encontrado');
    return item;
  }

  async createVisaType(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsVisaType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsVisaType.create({
      data: { name, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true },
    });
  }

  async updateVisaType(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findVisaType(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsVisaType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsVisaType.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeVisaType(id: string) {
    const current = await this.findVisaType(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsVisaType.delete({ where: { id } });
  }

  // ——— Convidados (por clube) ———
  findGuests(tenantId: string, activeOnly?: string, search?: string) {
    return this.prisma.logisticsGuest.findMany({
      where: {
        tenantId,
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { cpf: { contains: search.trim(), mode: 'insensitive' } },
                { phone: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async findGuest(id: string) {
    const item = await this.prisma.logisticsGuest.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Pessoa autorizada não encontrada');
    return item;
  }

  async createGuest(dto: CreateLogisticsGuestDto) {
    await this.ensureClubTenant(dto.tenantId);
    return this.prisma.logisticsGuest.create({
      data: {
        tenantId: dto.tenantId,
        name: cadastroUpperRequired(dto.name),
        guestType: cadastroUpper(dto.guestType),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        phone: cadastroUpper(dto.phone),
        rg: cadastroUpper(dto.rg),
        rgIssuer: cadastroUpper(dto.rgIssuer),
        cpf: cadastroUpper(dto.cpf),
        passport: cadastroUpper(dto.passport),
        passportExpiry: dto.passportExpiry
          ? new Date(dto.passportExpiry)
          : null,
        notes: cadastroUpper(dto.notes),
        active: dto.active ?? true,
      },
    });
  }

  async updateGuest(id: string, dto: UpdateLogisticsGuestDto) {
    await this.findGuest(id);
    return this.prisma.logisticsGuest.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.guestType !== undefined && {
          guestType: cadastroUpper(dto.guestType),
        }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
        ...(dto.phone !== undefined && { phone: cadastroUpper(dto.phone) }),
        ...(dto.rg !== undefined && { rg: cadastroUpper(dto.rg) }),
        ...(dto.rgIssuer !== undefined && {
          rgIssuer: cadastroUpper(dto.rgIssuer),
        }),
        ...(dto.cpf !== undefined && { cpf: cadastroUpper(dto.cpf) }),
        ...(dto.passport !== undefined && {
          passport: cadastroUpper(dto.passport),
        }),
        ...(dto.passportExpiry !== undefined && {
          passportExpiry: dto.passportExpiry
            ? new Date(dto.passportExpiry)
            : null,
        }),
        ...(dto.notes !== undefined && { notes: cadastroUpper(dto.notes) }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeGuest(id: string) {
    const guest = await this.findGuest(id);
    const linked = await this.prisma.travelParticipant.count({
      where: { logisticsGuestId: id },
    });
    if (linked > 0) {
      await this.prisma.logisticsGuest.update({
        where: { id },
        data: { active: false },
      });
      return { deactivated: true, id: guest.id };
    }
    await this.prisma.logisticsGuest.delete({ where: { id } });
    return { deleted: true, id: guest.id };
  }

  // ——— Hotéis (global — extra BCG) ———
  findHotels(activeOnly?: string, search?: string) {
    return this.prisma.logisticsHotel.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { city: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findHotel(id: string) {
    const item = await this.prisma.logisticsHotel.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Hospedagem não encontrada');
    return item;
  }

  async createHotel(dto: CreateLogisticsHotelDto) {
    const name = cadastroUpperRequired(dto.name);
    const city = cadastroUpper(dto.city);
    const existing = await this.prisma.logisticsHotel.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        city: city ? { equals: city, mode: 'insensitive' } : null,
      },
    });
    if (existing)
      throw new ConflictException('Hotel já cadastrado nesta cidade');
    return this.prisma.logisticsHotel.create({
      data: {
        name,
        city,
        state: cadastroUpper(dto.state),
        country: cadastroUpper(dto.country),
        address: cadastroUpper(dto.address),
        phone: cadastroUpper(dto.phone),
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateHotel(id: string, dto: UpdateLogisticsHotelDto) {
    await this.findHotel(id);
    return this.prisma.logisticsHotel.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.city !== undefined && { city: cadastroUpper(dto.city) }),
        ...(dto.state !== undefined && { state: cadastroUpper(dto.state) }),
        ...(dto.country !== undefined && {
          country: cadastroUpper(dto.country),
        }),
        ...(dto.address !== undefined && {
          address: cadastroUpper(dto.address),
        }),
        ...(dto.phone !== undefined && { phone: cadastroUpper(dto.phone) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeHotel(id: string) {
    await this.findHotel(id);
    await this.prisma.logisticsHotel.delete({ where: { id } });
  }

  // ——— Aeroportos ———
  findAirports(activeOnly?: string, search?: string) {
    return this.prisma.logisticsAirport.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(search?.trim()
          ? {
              OR: [
                { name: { contains: search.trim(), mode: 'insensitive' } },
                { code: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findAirport(id: string) {
    const item = await this.prisma.logisticsAirport.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Aeroporto não encontrado');
    return item;
  }

  async createAirport(dto: CreateLogisticsAirportDto) {
    const name = cadastroUpperRequired(dto.name);
    const code = cadastroUpper(dto.code);
    const existing = await this.prisma.logisticsAirport.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsAirport.create({
      data: {
        name,
        code,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateAirport(id: string, dto: UpdateLogisticsAirportDto) {
    const current = await this.findAirport(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsAirport.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsAirport.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.code !== undefined && { code: cadastroUpper(dto.code) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeAirport(id: string) {
    const current = await this.findAirport(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsAirport.delete({ where: { id } });
  }

  // ——— Categorias de despesas ———
  findExpenseCategories(activeOnly?: string) {
    return this.prisma.logisticsExpenseCategory.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findExpenseCategory(id: string) {
    const item = await this.prisma.logisticsExpenseCategory.findUnique({
      where: { id },
    });
    if (!item)
      throw new NotFoundException('Categoria de despesa não encontrada');
    return item;
  }

  async createExpenseCategory(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsExpenseCategory.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsExpenseCategory.create({
      data: { name, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true },
    });
  }

  async updateExpenseCategory(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findExpenseCategory(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsExpenseCategory.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsExpenseCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeExpenseCategory(id: string) {
    const current = await this.findExpenseCategory(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsExpenseCategory.delete({ where: { id } });
  }

  // ——— Apoio logístico (locais de interesse) ———
  findPointsOfInterest(activeOnly?: string) {
    return this.prisma.logisticsPointOfInterest.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findPointOfInterest(id: string) {
    const item = await this.prisma.logisticsPointOfInterest.findUnique({
      where: { id },
    });
    if (!item)
      throw new NotFoundException('Local de apoio logístico não encontrado');
    return item;
  }

  async createPointOfInterest(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsPointOfInterest.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsPointOfInterest.create({
      data: { name, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true },
    });
  }

  async updatePointOfInterest(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findPointOfInterest(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsPointOfInterest.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsPointOfInterest.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removePointOfInterest(id: string) {
    const current = await this.findPointOfInterest(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsPointOfInterest.delete({ where: { id } });
  }

  // ——— Destinos ———
  findDestinations(activeOnly?: string, search?: string) {
    return this.prisma.logisticsDestination.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: 'insensitive' } }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findDestination(id: string) {
    const item = await this.prisma.logisticsDestination.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Destino não encontrado');
    return item;
  }

  async createDestination(dto: CreateLogisticsLookupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsDestination.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsDestination.create({
      data: { name, sortOrder: dto.sortOrder ?? 0, active: dto.active ?? true },
    });
  }

  async updateDestination(id: string, dto: UpdateLogisticsLookupDto) {
    const current = await this.findDestination(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsDestination.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsDestination.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeDestination(id: string) {
    const current = await this.findDestination(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsDestination.delete({ where: { id } });
  }

  // ——— Serviços e produtos ———
  findServiceProducts(activeOnly?: string, search?: string) {
    return this.prisma.logisticsServiceProduct.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: 'insensitive' } }
          : {}),
      },
      include: { expenseCategory: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findServiceProduct(id: string) {
    const item = await this.prisma.logisticsServiceProduct.findUnique({
      where: { id },
      include: { expenseCategory: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundException('Serviço/produto não encontrado');
    return item;
  }

  async createServiceProduct(dto: CreateLogisticsServiceProductDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsServiceProduct.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsServiceProduct.create({
      data: {
        name,
        expenseCategoryId: dto.expenseCategoryId || null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
      include: { expenseCategory: { select: { id: true, name: true } } },
    });
  }

  async updateServiceProduct(
    id: string,
    dto: UpdateLogisticsServiceProductDto,
  ) {
    const current = await this.findServiceProduct(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsServiceProduct.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsServiceProduct.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.expenseCategoryId !== undefined && {
          expenseCategoryId: dto.expenseCategoryId || null,
        }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { expenseCategory: { select: { id: true, name: true } } },
    });
  }

  async removeServiceProduct(id: string) {
    const current = await this.findServiceProduct(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsServiceProduct.delete({ where: { id } });
  }

  // ——— Vestuário/uniformes — grupos ———
  findClothingGroups(activeOnly?: string) {
    return this.prisma.logisticsClothingGroup.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findClothingGroup(id: string) {
    const item = await this.prisma.logisticsClothingGroup.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Grupo de vestuário não encontrado');
    return item;
  }

  async createClothingGroup(dto: CreateLogisticsClothingGroupDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsClothingGroup.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsClothingGroup.create({
      data: {
        name,
        beatscodeId: dto.beatscodeId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateClothingGroup(id: string, dto: UpdateLogisticsClothingGroupDto) {
    const current = await this.findClothingGroup(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsClothingGroup.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsClothingGroup.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.beatscodeId !== undefined && { beatscodeId: dto.beatscodeId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeClothingGroup(id: string) {
    const current = await this.findClothingGroup(id);
    this.guardSystemEdit(current.isSystem);
    const categoriesLinked = await this.prisma.logisticsClothingCategory.count({
      where: { groupId: id },
    });
    const itemsLinked = await this.prisma.logisticsClothingItem.count({
      where: { groupId: id },
    });
    if (categoriesLinked > 0 || itemsLinked > 0) {
      throw new ConflictException(
        'Grupo possui categorias ou peças vinculadas — remova-as antes',
      );
    }
    await this.prisma.logisticsClothingGroup.delete({ where: { id } });
  }

  // ——— Vestuário/uniformes — categorias ———
  findClothingCategories(activeOnly?: string, groupId?: string) {
    return this.prisma.logisticsClothingCategory.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(groupId ? { groupId } : {}),
      },
      include: { group: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findClothingCategory(id: string) {
    const item = await this.prisma.logisticsClothingCategory.findUnique({
      where: { id },
      include: { group: { select: { id: true, name: true } } },
    });
    if (!item)
      throw new NotFoundException('Categoria de vestuário não encontrada');
    return item;
  }

  async createClothingCategory(dto: CreateLogisticsClothingCategoryDto) {
    const name = cadastroUpperRequired(dto.name);
    await this.findClothingGroup(dto.groupId);
    const existing = await this.prisma.logisticsClothingCategory.findFirst({
      where: {
        groupId: dto.groupId,
        name: { equals: name, mode: 'insensitive' },
      },
    });
    if (existing)
      throw new ConflictException(`"${name}" já existe neste grupo`);
    return this.prisma.logisticsClothingCategory.create({
      data: {
        name,
        groupId: dto.groupId,
        beatscodeId: dto.beatscodeId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
      include: { group: { select: { id: true, name: true } } },
    });
  }

  async updateClothingCategory(
    id: string,
    dto: UpdateLogisticsClothingCategoryDto,
  ) {
    const current = await this.findClothingCategory(id);
    this.guardSystemEdit(current.isSystem);
    const groupId = dto.groupId ?? current.groupId;
    if (dto.groupId) await this.findClothingGroup(dto.groupId);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsClothingCategory.findFirst({
        where: {
          groupId,
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing)
        throw new ConflictException(`"${name}" já existe neste grupo`);
    }
    return this.prisma.logisticsClothingCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.groupId && { groupId: dto.groupId }),
        ...(dto.beatscodeId !== undefined && { beatscodeId: dto.beatscodeId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: { group: { select: { id: true, name: true } } },
    });
  }

  async removeClothingCategory(id: string) {
    const current = await this.findClothingCategory(id);
    this.guardSystemEdit(current.isSystem);
    const linked = await this.prisma.logisticsClothingItem.count({
      where: { categoryId: id },
    });
    if (linked > 0) {
      throw new ConflictException(
        'Categoria possui peças vinculadas — remova-as antes',
      );
    }
    await this.prisma.logisticsClothingCategory.delete({ where: { id } });
  }

  // ——— Vestuário/uniformes — tipos de uniforme (Jogo, Passeio, Treino, Viagem) ———
  findUniformTypes(activeOnly?: string) {
    return this.prisma.logisticsUniformType.findMany({
      where: activeOnly === 'true' ? { active: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findUniformType(id: string) {
    const item = await this.prisma.logisticsUniformType.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Tipo de uniforme não encontrado');
    return item;
  }

  async createUniformType(dto: CreateLogisticsUniformTypeDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsUniformType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    return this.prisma.logisticsUniformType.create({
      data: {
        name,
        beatscodeId: dto.beatscodeId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async updateUniformType(id: string, dto: UpdateLogisticsUniformTypeDto) {
    const current = await this.findUniformType(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsUniformType.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    return this.prisma.logisticsUniformType.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.beatscodeId !== undefined && { beatscodeId: dto.beatscodeId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
  }

  async removeUniformType(id: string) {
    const current = await this.findUniformType(id);
    this.guardSystemEdit(current.isSystem);
    const itemsLinked = await this.prisma.logisticsClothingItem.count({
      where: { uniformTypeId: id },
    });
    const kitsLinked = await this.prisma.logisticsUniformKit.count({
      where: { uniformTypeId: id },
    });
    if (itemsLinked > 0 || kitsLinked > 0) {
      throw new ConflictException(
        'Tipo de uniforme possui peças ou kits vinculados — remova-os antes',
      );
    }
    await this.prisma.logisticsUniformType.delete({ where: { id } });
  }

  // ——— Vestuário/uniformes — peças ———
  private clothingItemInclude() {
    return {
      category: { select: { id: true, name: true } },
      group: { select: { id: true, name: true } },
      uniformType: { select: { id: true, name: true } },
    };
  }

  findClothingItems(
    activeOnly?: string,
    search?: string,
    categoryId?: string,
    groupId?: string,
    uniformTypeId?: string,
  ) {
    return this.prisma.logisticsClothingItem.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(groupId ? { groupId } : {}),
        ...(uniformTypeId ? { uniformTypeId } : {}),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: 'insensitive' } }
          : {}),
      },
      include: this.clothingItemInclude(),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findClothingItem(id: string) {
    const item = await this.prisma.logisticsClothingItem.findUnique({
      where: { id },
      include: this.clothingItemInclude(),
    });
    if (!item) throw new NotFoundException('Peça de vestuário não encontrada');
    return item;
  }

  async createClothingItem(dto: CreateLogisticsClothingItemDto) {
    const name = cadastroUpperRequired(dto.name);
    if (dto.categoryId) await this.findClothingCategory(dto.categoryId);
    if (dto.groupId) await this.findClothingGroup(dto.groupId);
    if (dto.uniformTypeId) await this.findUniformType(dto.uniformTypeId);
    return this.prisma.logisticsClothingItem.create({
      data: {
        name,
        categoryId: dto.categoryId ?? null,
        groupId: dto.groupId ?? null,
        uniformTypeId: dto.uniformTypeId ?? null,
        season: cadastroUpper(dto.season),
        imageUrl: dto.imageUrl?.trim() || null,
        notes: cadastroUpper(dto.notes),
        beatscodeId: dto.beatscodeId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
      include: this.clothingItemInclude(),
    });
  }

  async updateClothingItem(id: string, dto: UpdateLogisticsClothingItemDto) {
    const current = await this.findClothingItem(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.categoryId) await this.findClothingCategory(dto.categoryId);
    if (dto.groupId) await this.findClothingGroup(dto.groupId);
    if (dto.uniformTypeId) await this.findUniformType(dto.uniformTypeId);
    return this.prisma.logisticsClothingItem.update({
      where: { id },
      data: {
        ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.categoryId !== undefined && {
          categoryId: dto.categoryId || null,
        }),
        ...(dto.groupId !== undefined && { groupId: dto.groupId || null }),
        ...(dto.uniformTypeId !== undefined && {
          uniformTypeId: dto.uniformTypeId || null,
        }),
        ...(dto.season !== undefined && { season: cadastroUpper(dto.season) }),
        ...(dto.imageUrl !== undefined && {
          imageUrl: dto.imageUrl?.trim() || null,
        }),
        ...(dto.notes !== undefined && { notes: cadastroUpper(dto.notes) }),
        ...(dto.beatscodeId !== undefined && { beatscodeId: dto.beatscodeId }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: this.clothingItemInclude(),
    });
  }

  async removeClothingItem(id: string) {
    const current = await this.findClothingItem(id);
    this.guardSystemEdit(current.isSystem);
    const linked = await this.prisma.logisticsUniformKitItem.count({
      where: { clothingItemId: id },
    });
    if (linked > 0) {
      throw new ConflictException(
        'Peça está vinculada a kits — remova-a dos kits antes',
      );
    }
    await this.prisma.logisticsClothingItem.delete({ where: { id } });
  }

  // ——— Vestuário/uniformes — kits ———
  private uniformKitInclude() {
    return {
      uniformType: { select: { id: true, name: true } },
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          clothingItem: {
            include: {
              category: { select: { id: true, name: true } },
              group: { select: { id: true, name: true } },
            },
          },
        },
      },
    };
  }

  findUniformKits(
    activeOnly?: string,
    search?: string,
    uniformTypeId?: string,
  ) {
    return this.prisma.logisticsUniformKit.findMany({
      where: {
        ...(activeOnly === 'true' ? { active: true } : {}),
        ...(uniformTypeId ? { uniformTypeId } : {}),
        ...(search?.trim()
          ? { name: { contains: search.trim(), mode: 'insensitive' } }
          : {}),
      },
      include: this.uniformKitInclude(),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findUniformKit(id: string) {
    const item = await this.prisma.logisticsUniformKit.findUnique({
      where: { id },
      include: this.uniformKitInclude(),
    });
    if (!item) throw new NotFoundException('Kit de uniforme não encontrado');
    return item;
  }

  private async validateKitItems(items?: LogisticsUniformKitItemInputDto[]) {
    if (!items?.length) return;
    const ids = items.map((i) => i.clothingItemId);
    const found = await this.prisma.logisticsClothingItem.count({
      where: { id: { in: ids } },
    });
    if (found !== new Set(ids).size) {
      throw new BadRequestException('Uma ou mais peças informadas não existem');
    }
  }

  async createUniformKit(dto: CreateLogisticsUniformKitDto) {
    const name = cadastroUpperRequired(dto.name);
    if (dto.uniformTypeId) await this.findUniformType(dto.uniformTypeId);
    await this.validateKitItems(dto.items);
    return this.prisma.logisticsUniformKit.create({
      data: {
        name,
        uniformTypeId: dto.uniformTypeId ?? null,
        season: cadastroUpper(dto.season),
        imageUrl: dto.imageUrl?.trim() || null,
        description: cadastroUpper(dto.description),
        beatscodeId: dto.beatscodeId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
        items: dto.items?.length
          ? {
              create: dto.items.map((i, idx) => ({
                clothingItemId: i.clothingItemId,
                sortOrder: i.sortOrder ?? idx,
              })),
            }
          : undefined,
      },
      include: this.uniformKitInclude(),
    });
  }

  async updateUniformKit(id: string, dto: UpdateLogisticsUniformKitDto) {
    const current = await this.findUniformKit(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.uniformTypeId) await this.findUniformType(dto.uniformTypeId);
    await this.validateKitItems(dto.items);
    return this.prisma.$transaction(async (tx) => {
      if (dto.items !== undefined) {
        await tx.logisticsUniformKitItem.deleteMany({ where: { kitId: id } });
        if (dto.items.length) {
          await tx.logisticsUniformKitItem.createMany({
            data: dto.items.map((i, idx) => ({
              kitId: id,
              clothingItemId: i.clothingItemId,
              sortOrder: i.sortOrder ?? idx,
            })),
          });
        }
      }
      return tx.logisticsUniformKit.update({
        where: { id },
        data: {
          ...(dto.name && { name: cadastroUpperRequired(dto.name) }),
          ...(dto.uniformTypeId !== undefined && {
            uniformTypeId: dto.uniformTypeId || null,
          }),
          ...(dto.season !== undefined && {
            season: cadastroUpper(dto.season),
          }),
          ...(dto.imageUrl !== undefined && {
            imageUrl: dto.imageUrl?.trim() || null,
          }),
          ...(dto.description !== undefined && {
            description: cadastroUpper(dto.description),
          }),
          ...(dto.beatscodeId !== undefined && {
            beatscodeId: dto.beatscodeId,
          }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...(dto.active !== undefined && { active: dto.active }),
        },
        include: this.uniformKitInclude(),
      });
    });
  }

  async removeUniformKit(id: string) {
    const current = await this.findUniformKit(id);
    this.guardSystemEdit(current.isSystem);
    await this.prisma.logisticsUniformKit.delete({ where: { id } });
  }
}
