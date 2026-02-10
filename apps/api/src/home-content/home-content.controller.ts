import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { HomeContentService } from './home-content.service';
import type { HomeContentDto } from './home-content.service';

@Controller('home-content')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class HomeContentController {
  constructor(private readonly homeContentService: HomeContentService) {}

  /** Retorna conteúdo já enriquecido (clubes/empresas/países do cadastro) para o dashboard ver valores atuais. */
  @Get()
  get() {
    return this.homeContentService.getPublic();
  }

  @Patch()
  update(@Body() body: HomeContentDto) {
    return this.homeContentService.update(body);
  }
}
