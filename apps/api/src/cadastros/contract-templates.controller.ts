import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { ContractTemplatesService } from './contract-templates.service';

@Controller('contract-templates')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class ContractTemplatesController {
  constructor(private readonly service: ContractTemplatesService) {}

  @Get('field-catalog')
  fieldCatalog() {
    return this.service.getFieldCatalog();
  }

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('type') type?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll({
      tenantId,
      type,
      activeOnly: includeInactive !== 'true',
    });
  }

  @Get(':id/preview/:employmentId')
  preview(@Param('id') id: string, @Param('employmentId') employmentId: string) {
    return this.service.previewFill(id, employmentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  create(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,
    @Body('name') name?: string,
    @Body('type') type?: string,
    @Body('tenantId') tenantId?: string,
    @Body('notes') notes?: string,
    @Body('signaturePage') signaturePage?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um PDF (campo "file").');
    }
    const isPdf =
      file.mimetype === 'application/pdf' ||
      (file.originalname?.toLowerCase().endsWith('.pdf') ?? false);
    if (!isPdf) {
      throw new BadRequestException('Apenas PDF.');
    }
    if (!name?.trim() || !type?.trim()) {
      throw new BadRequestException('Campos "name" e "type" são obrigatórios.');
    }
    const page =
      signaturePage != null ? Math.max(1, parseInt(String(signaturePage), 10) || 1) : 1;

    return this.service.createFromUpload({
      tenantId: tenantId?.trim() || null,
      name: name.trim(),
      type: type.trim(),
      fileBuffer: file.buffer,
      originalName: file.originalname || 'modelo.pdf',
      notes: notes?.trim(),
      signaturePage: page,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body('name') name?: string,
    @Body('type') type?: string,
    @Body('fieldMapping') fieldMapping?: Record<string, string>,
    @Body('signaturePage') signaturePage?: number,
    @Body('active') active?: boolean,
    @Body('notes') notes?: string | null,
  ) {
    return this.service.update(id, {
      name,
      type,
      fieldMapping,
      signaturePage,
      active,
      notes,
    });
  }

  @Post(':id/rescan-fields')
  rescanFields(@Param('id') id: string) {
    return this.service.rescanFields(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
