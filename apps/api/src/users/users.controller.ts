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
import { AccessAdminUsersService } from '../modules/access-admin-users.service';
import { isPlatformIdentityAdmin } from '../modules/user-identity-admin.constants';
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
    private readonly accessAdminUsers: AccessAdminUsersService,
  ) {}

  private actorRole(req: Request & { user: CognitoJwtPayload }): string {
    return (req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user') as string;
  }

  @Get()
  async findAll(@Req() req: Request & { user: CognitoJwtPayload }) {
    const actorRole = this.actorRole(req);
    this.accessAdminUsers.assertCanCreateOrManageIdentities(actorRole);
    return this.accessAdminUsers.listManageableUsersAsListItems(req.user.sub, actorRole);
  }

  @Get(':username')
  async findOne(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
  ) {
    const actorRole = this.actorRole(req);
    const decoded = decodeURIComponent(username);
    this.accessAdminUsers.assertCanCreateOrManageIdentities(actorRole);
    await this.accessAdminUsers.assertActorCanManageUserByUsername(
      req.user.sub,
      actorRole,
      decoded,
    );
    const user = await this.usersService.findOne(decoded);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }

  @Post()
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateUserDto) {
    const actorRole = this.actorRole(req);
    this.accessAdminUsers.assertCanCreateOrManageIdentities(actorRole);

    if (actorRole === 'company_admin') {
      this.accessAdminUsers.assertCompanyAdminCreatePayload(dto.tenantIds, dto.role);
      await this.tenantAccess.assertActorCanAssignTenants(
        req.user.sub,
        actorRole,
        dto.tenantIds ?? [],
      );
    } else if (dto.tenantIds !== undefined) {
      await this.tenantAccess.assertActorCanAssignTenants(
        req.user.sub,
        actorRole,
        dto.tenantIds,
      );
    }

    const role = this.accessAdminUsers.resolveCreateRoleForActor(actorRole, dto.role);
    return await this.usersService.create({ ...dto, role });
  }

  @Patch(':username/role')
  async updateRole(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: UpdateRoleDto,
  ) {
    const actorRole = this.actorRole(req);
    const decoded = decodeURIComponent(username);
    if (actorRole === 'company_admin') {
      throw new ForbiddenException('Company admin não pode alterar o perfil legado do usuário.');
    }
    if (!isPlatformIdentityAdmin(actorRole)) {
      throw new ForbiddenException('Apenas super admin ou company admin podem alterar perfis.');
    }
    await this.accessAdminUsers.assertActorCanManageUserByUsername(
      req.user.sub,
      actorRole,
      decoded,
    );
    await this.usersService.updateRole(decoded, dto.role as UserRole);
    return { ok: true };
  }

  @Patch(':username')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: UpdateUserDto,
  ) {
    const actorRole = this.actorRole(req);
    this.accessAdminUsers.assertCanCreateOrManageIdentities(actorRole);
    const decoded = decodeURIComponent(username);
    await this.accessAdminUsers.assertActorCanManageUserByUsername(
      req.user.sub,
      actorRole,
      decoded,
    );

    if (actorRole === 'company_admin') {
      this.accessAdminUsers.assertCompanyAdminRoleChange(dto.role);
      if (dto.role !== undefined) {
        throw new ForbiddenException('Company admin não pode alterar o perfil legado do usuário.');
      }
    }

    if (dto.tenantIds !== undefined) {
      await this.tenantAccess.assertActorCanAssignTenants(
        req.user.sub,
        actorRole,
        dto.tenantIds,
      );
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

    if (dto.tenantIds !== undefined && actorRole === 'company_admin') {
      const target = await this.usersService.findOne(decoded);
      if (!target) throw new NotFoundException('Usuário não encontrado');
      const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, actorRole);
      if (!allowed?.length) {
        throw new ForbiddenException('Seu usuário não tem empresas vinculadas.');
      }
      const merged = this.accessAdminUsers.mergeTenantIdsForCompanyAdminUpdate(
        target.tenantIds ?? [],
        dto.tenantIds,
        allowed,
      );
      dto = { ...dto, tenantIds: merged };
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
    const actorRole = this.actorRole(req);
    this.accessAdminUsers.assertCanCreateOrManageIdentities(actorRole);
    const decoded = decodeURIComponent(username);
    await this.accessAdminUsers.assertActorCanManageUserByUsername(
      req.user.sub,
      actorRole,
      decoded,
    );
    await this.usersService.remove(decoded);
    return { ok: true };
  }

  @Patch(':username/block')
  async setBlocked(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('username') username: string,
    @Body() dto: SetUserBlockedDto,
  ) {
    const actorRole = this.actorRole(req);
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
    const actorRole = this.actorRole(req);
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
