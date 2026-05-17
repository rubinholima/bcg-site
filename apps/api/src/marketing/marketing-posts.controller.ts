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
import { MarketingPostsService } from './marketing-posts.service';
import { CreateMarketingPostDto } from './dto/create-marketing-post.dto';
import { UpdateMarketingPostDto } from './dto/update-marketing-post.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { MetaOAuthService } from '../integrations/meta/meta-oauth.service';

@Controller('marketing/posts')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
@UseGuards(ModuleAccessGuard)
@RequireModule('marketing')
export class MarketingPostsController {
  constructor(
    private readonly service: MarketingPostsService,
    private readonly metaOAuth: MetaOAuthService,
  ) {}

  @Get()
  list(
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    const m = month ? parseInt(month, 10) : undefined;
    // tenantId=group → filtrar por grupo (tenantId null); ausente = todos
    const effectiveTenantId = tenantId === 'group' ? '' : (tenantId ?? undefined);
    return this.service.findAll({
      year: y,
      month: m,
      tenantId: effectiveTenantId,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** Super admin: publica no feed da Página Meta (usa token gravado + /me/accounts). */
  @Post(':id/publish-facebook')
  @UseGuards(SuperAdminGuard)
  publishFacebook(@Param('id') id: string) {
    return this.metaOAuth.publishMarketingPostToFacebook(id);
  }

  @Post()
  create(@Body() dto: CreateMarketingPostDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMarketingPostDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
