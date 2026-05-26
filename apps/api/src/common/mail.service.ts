import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
}

export interface SendMailResult {
  sent: boolean;
  error?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
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

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    const to = input.to?.trim();
    if (!to) return { sent: false, error: 'Destinatário vazio' };
    if (!this.transporter) return { sent: false, error: 'SMTP não configurado no servidor' };

    const from = process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@bcg.com';
    try {
      await this.transporter.sendMail({
        from: `"Boston City Group" <${from}>`,
        to,
        subject: input.subject,
        text: input.text,
      });
      return { sent: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar e-mail';
      this.logger.warn(`Falha ao enviar e-mail para ${to}: ${message}`);
      return { sent: false, error: message };
    }
  }
}
