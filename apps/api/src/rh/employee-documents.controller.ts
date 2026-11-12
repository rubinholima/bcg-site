import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { EmployeeDocumentsService } from './employee-documents.service';
import { CreateEmployeeDocumentDto } from './dto/create-employee-document.dto';
import { RhScopeService } from './rh-scope.service';
import { RhAccessService } from './rh-access.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/employee-documents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, RhCapabilityGuard)
export class EmployeeDocumentsController {
  constructor(
    private readonly service: EmployeeDocumentsService,
    private readonly scope: RhScopeService,
    private readonly rhAccess: RhAccessService,
  ) {}

  @Get('by-employee/:employeeId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async findByEmployee(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employeeId') employeeId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findByEmployee(employeeId, allowed);
  }

  @Get(':id/download')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_private_docs_view')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    const doc = await this.service.findOne(id, allowed);
    if (this.service.isPrivateDocumentType(doc.documentType)) {
      await this.rhAccess.assertCapability(req.user, 'rh_private_docs_view');
    }
    const { body, contentType } = await this.service.downloadStream(id, allowed);
    return new StreamableFile(body, {
      type: contentType || 'application/octet-stream',
      disposition: `attachment; filename="documento-rh"`,
    });
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_private_docs_manage')
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateEmployeeDocumentDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    if (this.service.isPrivateDocumentType(dto.documentType)) {
      await this.rhAccess.assertCapability(req.user, 'rh_private_docs_manage');
    }
    return this.service.create(dto, allowed, getRhActor(this.scope, req));
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_private_docs_manage')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.remove(id, allowed);
  }
}
