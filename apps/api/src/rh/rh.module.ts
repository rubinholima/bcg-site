import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { JobRolesController } from './job-roles.controller';
import { JobRolesService } from './job-roles.service';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmploymentsController } from './employments.controller';
import { EmploymentsService } from './employments.service';
import { EmployeeDocumentsController } from './employee-documents.controller';
import { EmployeeDocumentsService } from './employee-documents.service';
import { LeavePeriodsController } from './leave-periods.controller';
import { LeavePeriodsService } from './leave-periods.service';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [
    DepartmentsController,
    JobRolesController,
    EmployeesController,
    EmploymentsController,
    EmployeeDocumentsController,
    LeavePeriodsController,
  ],
  providers: [
    ModuleAccessGuard,
    DepartmentsService,
    JobRolesService,
    EmployeesService,
    EmploymentsService,
    EmployeeDocumentsService,
    LeavePeriodsService,
  ],
  exports: [
    DepartmentsService,
    JobRolesService,
    EmployeesService,
    EmploymentsService,
    EmployeeDocumentsService,
    LeavePeriodsService,
  ],
})
export class RhModule {}
