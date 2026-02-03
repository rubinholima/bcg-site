import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { HomeContentService } from './home-content.service';
import type { HomeContentDto } from './home-content.service';

@Controller('home-content')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class HomeContentController {
  constructor(private readonly homeContentService: HomeContentService) {}

  @Get()
  get() {
    return this.homeContentService.get();
  }

  @Patch()
  update(@Body() body: HomeContentDto) {
    return this.homeContentService.update(body);
  }
}
