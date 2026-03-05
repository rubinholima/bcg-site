import { BadRequestException, Body, Delete, Get, Param, Post, Controller, UseGuards } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('consultations')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class ConsultationsController {
  constructor(private readonly service: ConsultationsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('psicologia')
  async list() {
    return this.service.listAllConsultations();
  }

  @Get('meet-available')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('psicologia')
  meetAvailable() {
    return { available: this.service.isGoogleMeetAvailable() };
  }

  @Post('create-meet')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('psicologia')
  async createMeet(
    @Body()
    body: {
      summary: string;
      description?: string;
      startDate: string;
      startTime?: string;
      endTime?: string;
      attendeeEmails?: string[];
    },
  ) {
    const { summary, startDate } = body;
    if (!summary?.trim() || !startDate?.trim()) {
      throw new BadRequestException('summary e startDate são obrigatórios');
    }

    const result = await this.service.createMeetLink({
      summary: summary.trim(),
      description: body.description?.trim(),
      startDate: startDate.trim(),
      startTime: body.startTime?.trim(),
      endTime: body.endTime?.trim(),
      attendeeEmails: Array.isArray(body.attendeeEmails) ? body.attendeeEmails : undefined,
    });

    if (!result) {
      throw new BadRequestException(
        'Não foi possível criar o evento. Verifique: (1) variáveis GOOGLE_CALENDAR_* no .env da API; (2) calendário compartilhado com a Service Account; (3) logs da API para detalhes do erro.',
      );
    }

    const isRealMeet = result.meetLink?.startsWith('https://meet.google.com/');
    return { ...result, createdWithMeet: isRealMeet };
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('psicologia')
  async removeConsultation(@Param('id') id: string) {
    const ok = await this.service.removeConsultation(id);
    if (!ok) {
      throw new BadRequestException('Consulta não encontrada');
    }
    return { success: true };
  }
}
