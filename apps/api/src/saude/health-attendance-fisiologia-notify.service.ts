import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../common/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTryoutFisiologiaEmail } from '../tryout-workflow/tryout-workflow.notify.util';

export type HealthAttendanceNotifyInput = {
  tenantId: string;
  tenantName: string;
  playerName: string;
  category?: string | null;
  attendedAt: Date;
  areaLabel: string;
  availabilityNote?: string | null;
};

@Injectable()
export class HealthAttendanceFisiologiaNotifyService {
  private readonly log = new Logger(HealthAttendanceFisiologiaNotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private parseEnvEmails(): string[] {
    const raw =
      process.env.HEALTH_FISIOLOGIA_NOTIFY_EMAIL?.trim() ||
      process.env.FISIOLOGIA_NOTIFY_EMAIL?.trim() ||
      '';
    const fromEnv = raw
      .split(/[,;]/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (fromEnv.length) return fromEnv;
    const fallback = resolveTryoutFisiologiaEmail();
    return fallback ? [fallback] : [];
  }

  private async staffFisiologistaEmails(tenantId: string): Promise<string[]> {
    const rows = await this.prisma.medicalStaff.findMany({
      where: { tenantId, role: 'fisiologista' },
      select: { email: true },
    });
    return [
      ...new Set(
        rows.map((r) => r.email?.trim() ?? '').filter((e) => e.length > 3),
      ),
    ];
  }

  /** Avisa fisiologia quando atleta abre atendimento na Saúde. */
  async notifyNewAttendance(input: HealthAttendanceNotifyInput): Promise<void> {
    const recipients = [
      ...new Set([
        ...this.parseEnvEmails(),
        ...(await this.staffFisiologistaEmails(input.tenantId)),
      ]),
    ].filter(Boolean);
    if (recipients.length === 0) {
      this.log.warn(
        `Sem destinatário fisiologia (tenant=${input.tenantId}) — FISIOLOGIA_NOTIFY_EMAIL ou fisiologista com e-mail no cadastro.`,
      );
      return;
    }

    const base = (process.env.PUBLIC_APP_URL || 'https://bostoncitygroup.biz').replace(
      /\/$/,
      '',
    );
    const when = input.attendedAt.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
    const text = [
      'Atleta em atendimento na Saúde — comunique a comissão se houver indisponibilidade para treino.',
      '',
      `Clube: ${input.tenantName}`,
      `Atleta: ${input.playerName}`,
      input.category ? `Categoria: ${input.category}` : null,
      `Setor: ${input.areaLabel}`,
      `Horário: ${when}`,
      input.availabilityNote ? `Observação: ${input.availabilityNote}` : null,
      '',
      `Fisiologia / performance: ${base}/dashboard/futebol/preparacao-fisica`,
    ]
      .filter(Boolean)
      .join('\n');

    for (const to of recipients) {
      const result = await this.mail.sendMail({
        to,
        subject: `[Saúde → Fisiologia] ${input.playerName} em atendimento`,
        text,
      });
      if (!result.sent) {
        this.log.warn(`Falha e-mail fisiologia para ${to}: ${result.error ?? 'erro'}`);
      }
    }
  }
}
