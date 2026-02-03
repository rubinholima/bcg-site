import { Controller, Get } from '@nestjs/common';
import { HomeContentService } from '../home-content/home-content.service';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly publicService: PublicService,
    private readonly homeContentService: HomeContentService,
  ) {}

  @Get('portfolio')
  getPortfolio() {
    return this.publicService.getPortfolio();
  }

  @Get('home-content')
  getHomeContent() {
    return this.homeContentService.get();
  }
}
