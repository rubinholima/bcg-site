import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { TenantKindsService } from './tenant-kinds.service';
import { CreateTenantKindDto } from './dto/create-tenant-kind.dto';
import { UpdateTenantKindDto } from './dto/update-tenant-kind.dto';

@Controller('tenant-kinds')
export class TenantKindsController {
  constructor(private readonly tenantKindsService: TenantKindsService) {}

  @Get()
  findAll() {
    return this.tenantKindsService.findAll();
  }

  @Post()
  create(@Body() createTenantKindDto: CreateTenantKindDto) {
    return this.tenantKindsService.create(createTenantKindDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantKindsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantKindDto: UpdateTenantKindDto) {
    return this.tenantKindsService.update(id, updateTenantKindDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tenantKindsService.remove(id);
  }
}
