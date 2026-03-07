import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyConsultationPayload {
  link: string;
  date: string;
  time?: string;
  psychologist?: string;
}

export interface NotifyResult {
  emailSent: boolean;
  emailError?: string;
  noContact?: boolean;
}

@Injectable()
export class ConsultationNotifyService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {
    const host = process.env.SMTP_HOST?.trim();
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number.isNaN(port) ? 587 : port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
    }
  }

  isEmailConfigured(): boolean {
    return this.transporter !== null;
  }

  async notifyPlayer(
    playerId: string,
    payload: NotifyConsultationPayload,
  ): Promise<NotifyResult> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { name: true, contactEmail: true, contactPhone: true },
    });
    if (!player) {
      return { emailSent: false, noContact: true };
    }
    const email = player.contactEmail?.trim();
    if (!email) {
      return { emailSent: false, noContact: true };
    }
    if (!this.transporter) {
      return { emailSent: false, emailError: 'SMTP não configurado' };
    }

    const from = process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@bcg.com';
    const dateFormatted = payload.date
      ? new Date(payload.date + (payload.time ? `T${payload.time}` : 'T00:00')).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: payload.time ? '2-digit' : undefined,
          minute: payload.time ? '2-digit' : undefined,
        })
      : payload.date;
    const body = [
      `Olá, ${player.name}!`,
      '',
      'Uma nova consulta foi agendada para você.',
      '',
      `Data/horário: ${dateFormatted}`,
      payload.psychologist ? `Psicólogo(a): ${payload.psychologist}` : null,
      '',
      'Link da videoconferência (Google Meet):',
      payload.link,
      '',
      'Até lá!',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await this.transporter.sendMail({
        from: `"Boston City Group" <${from}>`,
        to: email,
        subject: 'Consulta agendada – link da videoconferência',
        text: body,
      });
      return { emailSent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar e-mail';
      return { emailSent: false, emailError: message };
    }
  }
}
