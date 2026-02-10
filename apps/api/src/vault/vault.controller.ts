import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { VaultService } from './vault.service';
import { CreateVaultItemDto } from './dto/create-vault-item.dto';
import { UpdateVaultItemDto } from './dto/update-vault-item.dto';
import { GeneratePasswordDto } from './dto/generate-password.dto';

@Controller('api/vault')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Get('items')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault')
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.vaultService.list(req.user, {
      tenantId,
      category,
      search,
      status,
    });
  }

  @Get('items/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault')
  async getOne(@Param('id') id: string, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.vaultService.getOne(id, req.user);
  }

  @Post('items')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault_manage')
  async create(@Body() dto: CreateVaultItemDto, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.vaultService.create(dto, req.user);
  }

  @Patch('items/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault_manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVaultItemDto,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    return this.vaultService.update(id, dto, req.user);
  }

  @Delete('items/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault_manage')
  async delete(@Param('id') id: string, @Req() req: Request & { user: CognitoJwtPayload }) {
    await this.vaultService.delete(id, req.user);
    return { ok: true };
  }

  @Post('items/:id/reveal')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault_reveal')
  async reveal(@Param('id') id: string, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.vaultService.reveal(id, req.user);
  }

  @Post('items/:id/copy')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault_reveal')
  async copyReveal(@Param('id') id: string, @Req() req: Request & { user: CognitoJwtPayload }) {
    return this.vaultService.copyReveal(id, req.user);
  }

  @Post('generate')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('vault')
  async generate(@Body() dto: GeneratePasswordDto) {
    return this.vaultService.generatePassword(dto);
  }
}
