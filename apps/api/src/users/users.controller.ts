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
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { UsersService, UserRole } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetUserBlockedDto } from './dto/set-user-blocked.dto';
import { AdminSetPasswordDto } from './dto/admin-set-password.dto';
import { validatePlatformPassword } from '../auth/password-policy.util';

@Controller('users')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('usuarios')
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
    if (actorRole === 'company_admin' && dto.role === 'super_admin') {
      throw new ForbiddenException('Company admin não pode criar usuário com perfil super admin.');
    }
    if (dto.tenantIds !== undefined) {
      if (actorRole !== 'super_admin' && actorRole !== 'company_admin') {
        throw new ForbiddenException(
          'Apenas super admin ou company admin podem definir o escopo de empresas do usuário.',
        );
      }
      await this.tenantAccess.assertActorCanAssignTenants(req.user.sub, actorRole, dto.tenantIds);
    }
    return await this.usersService.create(dto);
  }

  @Patch(':username/role')
  async updateRole(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    const decoded = decodeURIComponent(username);
    const target = await this.usersService.findOne(decoded);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (actorRole === 'company_admin' && target.role === 'super_admin') {
      throw new ForbiddenException('Company admin não pode alterar o perfil de um super admin.');
    }
    if (actorRole === 'company_admin' && dto.role === 'super_admin') {
      throw new ForbiddenException('Company admin não pode atribuir perfil super admin.');
    }
    await this.usersService.updateRole(decoded, dto.role as UserRole);
    return { ok: true };
  }

  @Patch(':username')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: UpdateUserDto,
  ) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    const decoded = decodeURIComponent(username);
    const target = await this.usersService.findOne(decoded);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (actorRole === 'company_admin' && target.role === 'super_admin') {
      throw new ForbiddenException('Company admin não pode alterar um usuário super admin.');
    }
    if (actorRole === 'company_admin' && dto.role === 'super_admin') {
      throw new ForbiddenException('Company admin não pode atribuir perfil super admin.');
    }
    if (dto.tenantIds !== undefined) {
      if (actorRole !== 'super_admin' && actorRole !== 'company_admin') {
        throw new ForbiddenException(
          'Apenas super admin ou company admin podem definir o escopo de empresas do usuário.',
        );
      }
      await this.tenantAccess.assertActorCanAssignTenants(req.user.sub, actorRole, dto.tenantIds);
    }
    if (dto.password !== undefined && dto.password.length > 0) {
      if (actorRole !== 'super_admin') {
        throw new ForbiddenException('Apenas super admin pode alterar a senha de outro usuário.');
      }
      const policyError = validatePlatformPassword(dto.password);
      if (policyError) {
        throw new BadRequestException(policyError);
      }
    }
    await this.usersService.update(decoded, {
      name: dto.name,
      email: dto.email,
      username: dto.username,
      role: dto.role as UserRole,
      password: dto.password,
      tenantIds: dto.tenantIds,
    });
    return { ok: true };
  }

  @Delete(':username')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('username') username: string) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    const decoded = decodeURIComponent(username);
    const target = await this.usersService.findOne(decoded);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (actorRole === 'company_admin' && target.role === 'super_admin') {
      throw new ForbiddenException('Company admin não pode remover um usuário super admin.');
    }
    await this.usersService.remove(decoded);
    return { ok: true };
  }

  @Patch(':username/block')
  async setBlocked(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: SetUserBlockedDto,
  ) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    if (actorRole !== 'super_admin') {
      throw new ForbiddenException('Apenas super admin pode bloquear ou desbloquear usuários.');
    }
    const decoded = decodeURIComponent(username);
    const target = await this.usersService.findOne(decoded);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const actor = await this.usersService.findOneById(req.user.sub);
    if (dto.blocked && actor?.username === target.username) {
      throw new BadRequestException('Você não pode bloquear a própria conta.');
    }
    await this.usersService.setBlocked(decoded, dto.blocked);
    return { ok: true, blocked: dto.blocked };
  }

  @Patch(':username/password')
  async adminSetPassword(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: AdminSetPasswordDto,
  ) {
    const actorRole = (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
    if (actorRole !== 'super_admin') {
      throw new ForbiddenException('Apenas super admin pode alterar a senha de outro usuário.');
    }
    const decoded = decodeURIComponent(username);
    const target = await this.usersService.findOne(decoded);
    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const policyError = validatePlatformPassword(dto.password);
    if (policyError) {
      throw new BadRequestException(policyError);
    }
    await this.usersService.adminSetPassword(
      decoded,
      dto.password,
      dto.mustChangePassword ?? false,
    );
    return { ok: true };
  }
}
