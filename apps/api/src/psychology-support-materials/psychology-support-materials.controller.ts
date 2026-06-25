import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PsychologySupportMaterialsService } from './psychology-support-materials.service';

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'application/msword', 'application/vnd.'];

function isAllowedUpload(mime: string | undefined, filename: string): boolean {
  const lower = filename.toLowerCase();
  if (/\.(pdf|png|jpe?g|webp|docx?|xlsx?|pptx?)$/i.test(lower)) return true;
  if (!mime) return false;
  return ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p));
}

@Controller('psychology-support-materials')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PsychologySupportMaterialsController {
  constructor(private readonly service: PsychologySupportMaterialsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  list(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.service.list({ tenantId, category, search });
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  create(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string; size?: number } | undefined,
    @Body('title') title?: string,
    @Body('description') description?: string,
    @Body('category') category?: string,
    @Body('tenantId') tenantId?: string,
    @Req() req?: Request & { user?: { sub?: string; name?: string; email?: string; username?: string } },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    if (!title?.trim()) {
      throw new BadRequestException('Campo "title" é obrigatório.');
    }
    const originalName = file.originalname || 'arquivo';
    if (!isAllowedUpload(file.mimetype, originalName)) {
      throw new BadRequestException(
        'Formato não permitido. Use PDF, imagens ou documentos Office (Word, Excel, PowerPoint).',
      );
    }

    const user = req?.user;
    const uploadedBy =
      (user?.name as string | undefined) ||
      (user?.username as string | undefined) ||
      (user?.email as string | undefined) ||
      (user?.sub as string | undefined) ||
      null;

    return this.service.createFromUpload({
      title: title.trim(),
      description: description?.trim() || null,
      category: category?.trim() || null,
      tenantId: tenantId?.trim() || null,
      uploadedBy,
      fileBuffer: file.buffer,
      originalName,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    });
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
