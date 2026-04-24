import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { UsersService, UserRole } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get(':username')
  async findOne(@Param('username') username: string) {
    const user = await this.usersService.findOne(decodeURIComponent(username));
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  @Post()
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateUserDto) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    if (dto.tenantIds !== undefined) {
      if (actorRole !== 'super_admin' && actorRole !== 'company_admin') {
        throw new ForbiddenException(
          'Apenas super admin ou company admin podem definir o escopo de empresas do utilizador.',
        );
      }
      await this.tenantAccess.assertActorCanAssignTenants(req.user.sub, actorRole, dto.tenantIds);
    }
    return await this.usersService.create(dto);
  }

  @Patch(':username/role')
  async updateRole(
    @Param('username') username: string,
    @Body() dto: UpdateRoleDto,
  ) {
    await this.usersService.updateRole(decodeURIComponent(username), dto.role as UserRole);
    return { ok: true };
  }

  @Patch(':username')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: UpdateUserDto,
  ) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    if (dto.tenantIds !== undefined) {
      if (actorRole !== 'super_admin' && actorRole !== 'company_admin') {
        throw new ForbiddenException(
          'Apenas super admin ou company admin podem definir o escopo de empresas do utilizador.',
        );
      }
      await this.tenantAccess.assertActorCanAssignTenants(req.user.sub, actorRole, dto.tenantIds);
    }
    await this.usersService.update(decodeURIComponent(username), {
      name: dto.name,
      email: dto.email,
      role: dto.role as UserRole,
      password: dto.password,
      tenantIds: dto.tenantIds,
    });
    return { ok: true };
  }

  @Delete(':username')
  async remove(@Param('username') username: string) {
    await this.usersService.remove(decodeURIComponent(username));
    return { ok: true };
  }
}
