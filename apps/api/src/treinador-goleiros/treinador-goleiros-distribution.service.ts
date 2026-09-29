import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../common/mail.service';

const STAFF_ROLES_FOR_GK_REPORT = [
  'tecnico',
  'auxiliar_tecnico',
  'treinador_goleiros',
  'analista_desempenho',
] as const;

@Injectable()
export class TreinadorGoleirosDistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async resolveTenantRecipientEmails(tenantId: string): Promise<string[]> {
    const staff = await this.prisma.technicalStaff.findMany({
      where: {
        tenantId,
        email: { not: null },
        role: { in: [...STAFF_ROLES_FOR_GK_REPORT] },
      },
      select: { email: true },
    });
    const emails = new Set<string>();
    for (const s of staff) {
      const e = s.email?.trim().toLowerCase();
      if (e) emails.add(e);
    }
    const users = await this.prisma.user.findMany({
      where: {
        role: { in: ['gerente', 'diretoria', 'company_admin'] },
        blocked: false,
        OR: [{ userTenants: { some: { tenantId } } }, { role: 'company_admin' }],
      },
      select: { email: true },
    });
    for (const u of users) {
      const e = u.email?.trim().toLowerCase();
      if (e) emails.add(e);
    }
    return Array.from(emails);
  }

  async sendAndAudit(input: {
    tenantId: string;
    kind: string;
    referenceId: string;
    sentByUserId?: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    const recipients = await this.resolveTenantRecipientEmails(input.tenantId);
    if (recipients.length === 0) {
      return { sent: false, error: 'Nenhum destinatário com e-mail no tenant.', recipients: [] as string[] };
    }
    const result = await this.mail.sendMail({
      to: recipients.join(','),
      subject: input.subject,
      text: input.text,
      html: input.html ?? input.text.replace(/\n/g, '<br/>'),
    });
    if (result.sent) {
      await this.prisma.goalkeeperReportDistribution.create({
        data: {
          tenantId: input.tenantId,
          kind: input.kind,
          referenceId: input.referenceId,
          sentByUserId: input.sentByUserId ?? null,
          recipients: recipients,
          subject: input.subject,
        },
      });
    }
    return { ...result, recipients };
  }
}
