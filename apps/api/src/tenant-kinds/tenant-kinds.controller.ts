import { Controller, Get, Param } from '@nestjs/common';
import { TenantKindsService } from './tenant-kinds.service';

@Controller('tenant-kinds')
export class TenantKindsController {
  constructor(private readonly tenantKindsService: TenantKindsService) {}

  @Get()
  findAll() {
    return this.tenantKindsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantKindsService.findOne(id);
  }
}
