import { BadRequestException, Body, Delete, Get, Param, Patch, Post, Controller, UseGuards } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationNotifyService, NotifyConsultationPayload } from './consultation-notify.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('consultations')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class ConsultationsController {
  constructor(
    private readonly service: ConsultationsService,
    private readonly notifyService: ConsultationNotifyService,
  ) {}

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

  /** Atualiza data, horário, status (ex.: cancelar), psicólogo ou notas da consulta. */
  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('psicologia')
  async updateConsultation(
    @Param('id') id: string,
    @Body()
    body: {
      date?: string;
      time?: string;
      status?: string;
      psychologist?: string;
      notes?: string;
    },
  ) {
    const ok = await this.service.updateConsultation(id, body);
    if (!ok) {
      throw new BadRequestException('Consulta não encontrada');
    }
    return { success: true };
  }

  /** Envia o link da consulta por e-mail para o atleta (usa contactEmail do cadastro). */
  @Post('notify-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('psicologia')
  async notifyPlayer(
    @Body()
    body: { playerId: string; link: string; date: string; time?: string; psychologist?: string },
  ) {
    const { playerId, link, date } = body;
    if (!playerId?.trim() || !link?.trim() || !date?.trim()) {
      throw new BadRequestException('playerId, link e date são obrigatórios');
    }
    const payload: NotifyConsultationPayload = {
      link: body.link.trim(),
      date: body.date.trim(),
      time: body.time?.trim(),
      psychologist: body.psychologist?.trim(),
    };
    return this.notifyService.notifyPlayer(playerId.trim(), payload);
  }
}
