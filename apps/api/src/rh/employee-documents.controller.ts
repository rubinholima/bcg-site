import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmployeeDocumentsService } from './employee-documents.service';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';

@Controller('rh/employee-documents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EmployeeDocumentsController {
  constructor(private readonly service: EmployeeDocumentsService) {}

  @Get('by-employee/:employeeId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  create(@Body() dto: CreateEmployeeDocumentDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
