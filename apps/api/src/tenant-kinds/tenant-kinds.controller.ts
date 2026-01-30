import { Controller, Get } from '@nestjs/common';
import { TenantKindsService } from './tenant-kinds.service';

@Controller('tenant-kinds')
export class TenantKindsController {
  constructor(private readonly tenantKindsService: TenantKindsService) {}

  @Get()
  findAll() {
    return this.tenantKindsService.findAll();
  }
}
