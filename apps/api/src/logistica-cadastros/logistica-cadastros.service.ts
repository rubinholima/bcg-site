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
import { CreateLogisticsAirportDto, UpdateLogisticsAirportDto } from './dto/create-logistics-airport.dto';
import {
  CreateLogisticsServiceProductDto,
  UpdateLogisticsServiceProductDto,
} from './dto/create-logistics-service-product.dto';
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
    if (dto.transportCompanyId) await this.findTransportCompany(dto.transportCompanyId);
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

  async updateLoyaltyProgram(id: string, dto: UpdateLogisticsLoyaltyProgramDto) {
    const current = await this.findLoyaltyProgram(id);
    this.guardSystemEdit(current.isSystem);
    if (dto.name) {
      const name = cadastroUpperRequired(dto.name);
      const existing = await this.prisma.logisticsLoyaltyProgram.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, id: { not: id } },
      });
      if (existing) throw new ConflictException(`"${name}" já existe`);
    }
    if (dto.transportCompanyId) await this.findTransportCompany(dto.transportCompanyId);
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
    const item = await this.prisma.logisticsUsageMoment.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Finalidade do deslocamento não encontrada');
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
    const item = await this.prisma.logisticsPaymentType.findUnique({ where: { id } });
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
    const item = await this.prisma.logisticsRoomType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Categoria de acomodação não encontrada');
    return item;
  }

  async createRoomType(dto: CreateLogisticsRoomTypeDto) {
    const name = cadastroUpperRequired(dto.name);
    const existing = await this.prisma.logisticsRoomType.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException(`"${name}" já existe`);
    const capacity = dto.capacity ?? 1;
    if (capacity < 1) throw new BadRequestException('Capacidade deve ser no mínimo 1');
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
    const item = await this.prisma.logisticsVisaType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Visto internacional não encontrado');
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
        passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : null,
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
        ...(dto.guestType !== undefined && { guestType: cadastroUpper(dto.guestType) }),
        ...(dto.birthDate !== undefined && {
          birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        }),
        ...(dto.phone !== undefined && { phone: cadastroUpper(dto.phone) }),
        ...(dto.rg !== undefined && { rg: cadastroUpper(dto.rg) }),
        ...(dto.rgIssuer !== undefined && { rgIssuer: cadastroUpper(dto.rgIssuer) }),
        ...(dto.cpf !== undefined && { cpf: cadastroUpper(dto.cpf) }),
        ...(dto.passport !== undefined && { passport: cadastroUpper(dto.passport) }),
        ...(dto.passportExpiry !== undefined && {
          passportExpiry: dto.passportExpiry ? new Date(dto.passportExpiry) : null,
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
    if (existing) throw new ConflictException('Hotel já cadastrado nesta cidade');
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
        ...(dto.country !== undefined && { country: cadastroUpper(dto.country) }),
        ...(dto.address !== undefined && { address: cadastroUpper(dto.address) }),
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
    const item = await this.prisma.logisticsAirport.findUnique({ where: { id } });
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
    const item = await this.prisma.logisticsExpenseCategory.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Categoria de despesa não encontrada');
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
    const item = await this.prisma.logisticsPointOfInterest.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Local de apoio logístico não encontrado');
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
    const item = await this.prisma.logisticsDestination.findUnique({ where: { id } });
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

  async updateServiceProduct(id: string, dto: UpdateLogisticsServiceProductDto) {
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
}
