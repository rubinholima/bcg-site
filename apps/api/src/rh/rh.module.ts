import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { ContractsModule } from '../contracts/contracts.module';
import { HelloSignModule } from '../hello-sign/hello-sign.module';
import { S3Module } from '../s3/s3.module';
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
import { EmployeeDependentsController, EmployeeDependentItemController } from './employee-dependents.controller';
import { EmployeeDependentsService } from './employee-dependents.service';
import { LeavePeriodsController } from './leave-periods.controller';
import { LeavePeriodsService } from './leave-periods.service';
import { EmploymentContractsController } from './employment-contracts.controller';
import { JuridicoEmploymentContractsController } from './juridico-employment-contracts.controller';
import { JuridicoPersonsController } from './juridico-persons.controller';
import { JuridicoPersonsService } from './juridico-persons.service';
import { EmploymentContractsService } from './employment-contracts.service';
import { EmploymentCompensationController } from './employment-compensation.controller';
import { EmploymentCompensationService } from './employment-compensation.service';
import { EmploymentSalaryRevisionsController } from './employment-salary-revisions.controller';
import { EmploymentSalaryRevisionsService } from './employment-salary-revisions.service';

@Module({
  imports: [AuthModule, ModulesModule, ContractsModule, S3Module, HelloSignModule],
  controllers: [
    DepartmentsController,
    JobRolesController,
    EmployeesController,
    EmploymentsController,
    EmployeeDocumentsController,
    EmployeeDependentsController,
    EmployeeDependentItemController,
    LeavePeriodsController,
    EmploymentContractsController,
    JuridicoEmploymentContractsController,
    JuridicoPersonsController,
    EmploymentCompensationController,
    EmploymentSalaryRevisionsController,
  ],
  providers: [
    ModuleAccessGuard,
    DepartmentsService,
    JobRolesService,
    EmployeesService,
    EmploymentsService,
    EmployeeDocumentsService,
    EmployeeDependentsService,
    LeavePeriodsService,
    EmploymentContractsService,
    JuridicoPersonsService,
    EmploymentCompensationService,
    EmploymentSalaryRevisionsService,
  ],
  exports: [
    DepartmentsService,
    JobRolesService,
    EmployeesService,
    EmploymentsService,
    EmployeeDocumentsService,
    EmployeeDependentsService,
    LeavePeriodsService,
    EmploymentCompensationService,
    EmploymentSalaryRevisionsService,
  ],
})
export class RhModule {}
