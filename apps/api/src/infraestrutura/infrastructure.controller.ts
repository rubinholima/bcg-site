import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { InfrastructureService } from './infrastructure.service';

@Controller('infraestrutura')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('infraestrutura')
export class InfrastructureController {
  constructor(private readonly service: InfrastructureService) {}

  private user(req: Request & { user: CognitoJwtPayload }) {
    return req.user;
  }

  @Get('dashboard')
  getDashboard(@Query('tenantId') tenantId?: string) {
    return this.service.getDashboard(tenantId?.trim() || undefined);
  }

  @Get('assets')
  listTechAssets(@Query('tenantId') tenantId?: string) {
    return this.service.listTechAssets(tenantId?.trim() || undefined);
  }

  @Get('assets/:assetId')
  getAssetBundle(@Param('assetId') assetId: string) {
    return this.service.getAssetBundle(assetId);
  }

  @Patch('assets/:assetId/profile')
  updateProfile(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateProfile(assetId, body, this.user(req));
  }

  @Get('assets/:assetId/interfaces')
  listInterfaces(@Param('assetId') assetId: string) {
    return this.service.listInterfaces(assetId);
  }

  @Post('assets/:assetId/interfaces')
  createInterface(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createInterface(assetId, body, this.user(req));
  }

  @Patch('assets/:assetId/interfaces/:interfaceId')
  updateInterface(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('interfaceId') interfaceId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateInterface(assetId, interfaceId, body, this.user(req));
  }

  @Delete('assets/:assetId/interfaces/:interfaceId')
  removeInterface(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('interfaceId') interfaceId: string,
  ) {
    return this.service.removeInterface(assetId, interfaceId, this.user(req));
  }

  @Get('topology')
  listTopology(@Query('tenantId') tenantId?: string) {
    return this.service.listTopology(tenantId?.trim() || undefined);
  }

  @Post('topology')
  createTopology(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createTopologyLink(body, this.user(req));
  }

  @Delete('topology/:id')
  removeTopology(@Param('id') id: string) {
    return this.service.removeTopologyLink(id);
  }

  @Get('backbone')
  listBackbone(@Query('tenantId') tenantId?: string) {
    return this.service.listBackbone(tenantId?.trim() || undefined);
  }

  @Post('backbone')
  createBackbone(@Body() body: Record<string, unknown>) {
    return this.service.createBackbone(body);
  }

  @Patch('backbone/:id')
  updateBackbone(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateBackbone(id, body);
  }

  @Delete('backbone/:id')
  removeBackbone(@Param('id') id: string) {
    return this.service.removeBackbone(id);
  }

  @Get('racks')
  listRacks(@Query('tenantId') tenantId?: string) {
    return this.service.listRacks(tenantId?.trim() || undefined);
  }

  @Post('racks')
  createRack(@Body() body: Record<string, unknown>) {
    return this.service.createRack(body);
  }

  @Patch('racks/:id')
  updateRack(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.service.updateRack(id, body);
  }

  @Delete('racks/:id')
  removeRack(@Param('id') id: string) {
    return this.service.removeRack(id);
  }

  @Post('assets/:assetId/documents')
  createDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createDocument(assetId, body, this.user(req));
  }

  @Delete('assets/:assetId/documents/:docId')
  removeDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('docId') docId: string,
  ) {
    return this.service.removeDocument(assetId, docId, this.user(req));
  }

  @Post('assets/:assetId/backups')
  createBackup(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createBackup(assetId, body, this.user(req));
  }

  @Delete('assets/:assetId/backups/:backupId')
  removeBackup(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('backupId') backupId: string,
  ) {
    return this.service.removeBackup(assetId, backupId, this.user(req));
  }

  @Post('assets/:assetId/credentials')
  createCredential(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createCredential(assetId, body, this.user(req));
  }

  @Post('assets/:assetId/credentials/:credentialId/reveal')
  revealCredential(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('credentialId') credentialId: string,
  ) {
    return this.service.revealCredential(assetId, credentialId, this.user(req));
  }

  @Post('assets/:assetId/credentials/:credentialId/copy-audit')
  copyCredentialAudit(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('credentialId') credentialId: string,
  ) {
    return this.service.copyCredentialAudit(assetId, credentialId, this.user(req));
  }

  @Delete('assets/:assetId/credentials/:credentialId')
  removeCredential(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('credentialId') credentialId: string,
  ) {
    return this.service.removeCredential(assetId, credentialId, this.user(req));
  }

  @Post('assets/:assetId/software')
  createSoftware(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createSoftwareInstall(assetId, body, this.user(req));
  }

  @Delete('assets/:assetId/software/:installId')
  removeSoftware(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Param('installId') installId: string,
  ) {
    return this.service.removeSoftwareInstall(assetId, installId, this.user(req));
  }

  @Patch('assets/:assetId/disaster-recovery')
  upsertDr(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('assetId') assetId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.upsertDisasterRecovery(assetId, body, this.user(req));
  }
}
