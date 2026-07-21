import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { CreatePlatformRoleDto, UpdatePlatformRoleDto } from './dto/platform-role.dto';
import { PlatformRoleDto, RolesService } from './roles.service';

@Controller('settings/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /** Lista perfis — qualquer usuário autenticado (selects). */
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<{ roles: PlatformRoleDto[] }> {
    const roles = await this.rolesService.listAll({
      includeInactive: includeInactive === '1' || includeInactive === 'true',
    });
    return { roles };
  }

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async create(@Body() body: CreatePlatformRoleDto): Promise<PlatformRoleDto> {
    return this.rolesService.create(body);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async update(
    @Param('slug') slug: string,
    @Body() body: UpdatePlatformRoleDto,
  ): Promise<PlatformRoleDto> {
    return this.rolesService.update(slug, body);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async remove(@Param('slug') slug: string): Promise<{ ok: boolean }> {
    await this.rolesService.remove(slug);
    return { ok: true };
  }
}
