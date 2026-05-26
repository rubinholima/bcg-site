import { Injectable } from '@nestjs/common';
import { MailService } from '../common/mail.service';
import { PrismaService } from '../prisma/prisma.service';

type NotifySettings = {
  comprasNotifyEmail?: string | null;
  comprasNotifyPhone?: string | null;
  financeiroNotifyEmail?: string | null;
  financeiroNotifyPhone?: string | null;
  tiNotifyEmail?: string | null;
  tiNotifyPhone?: string | null;
  diretoriaNotifyEmail?: string | null;
  diretoriaNotifyPhone?: string | null;
};

@Injectable()
export class WorkflowNotifyService {
  constructor(
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
  ) {}

  private dashboardUrl(path: string): string {
    const base = (process.env.PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private contactLine(email?: string | null, phone?: string | null): string {
    const parts = [email?.trim(), phone?.trim()].filter(Boolean);
    return parts.length ? parts.join(' · ') : '';
  }

  private async loadSettings(tenantId: string): Promise<NotifySettings> {
    return (
      (await this.prisma.purchaseSetting.findUnique({ where: { tenantId } })) ?? {
        comprasNotifyEmail: null,
        comprasNotifyPhone: null,
        financeiroNotifyEmail: null,
        financeiroNotifyPhone: null,
        tiNotifyEmail: null,
        tiNotifyPhone: null,
        diretoriaNotifyEmail: null,
        diretoriaNotifyPhone: null,
      }
    );
  }

  private async notify(
    toEmail: string | null | undefined,
    subject: string,
    lines: Array<string | null | undefined>,
  ): Promise<{ emailSent: boolean; emailError?: string }> {
    if (!toEmail?.trim()) {
      return { emailSent: false, emailError: 'E-mail do responsável não configurado' };
    }
    const result = await this.mail.sendMail({
      to: toEmail.trim(),
      subject,
      text: lines.filter(Boolean).join('\n'),
    });
    return result.sent
      ? { emailSent: true }
      : { emailSent: false, emailError: result.error };
  }

  async notifyNewRequisition(input: {
    tenantId: string;
    tenantName: string;
    requisitionId: string;
    requestedByName: string;
    requestType?: string | null;
    departmentName?: string | null;
    justification?: string | null;
  }) {
    const settings = await this.loadSettings(input.tenantId);
    const typeLabel = input.requestType === 'ti' ? 'equipamento TI' : 'compra';
    const link = this.dashboardUrl('/dashboard/adm/compras');
    const lines = [
      'Nova requisição no Boston City Group',
      '',
      `Empresa: ${input.tenantName}`,
      `Tipo: ${typeLabel}`,
      `Solicitante: ${input.requestedByName}`,
      input.departmentName ? `Departamento: ${input.departmentName}` : null,
      input.justification ? `Justificativa: ${input.justification}` : null,
      '',
      `Abrir fila de Compras: ${link}`,
      settings.comprasNotifyPhone ? `Contato Compras: ${settings.comprasNotifyPhone}` : null,
    ];

    const compras = await this.notify(
      settings.comprasNotifyEmail,
      `[Compras] Nova requisição — ${input.tenantName}`,
      lines,
    );

    let ti: { emailSent: boolean; emailError?: string } = { emailSent: false };
    if (input.requestType === 'ti') {
      ti = await this.notify(
        settings.tiNotifyEmail,
        `[TI] Nova requisição de equipamento — ${input.tenantName}`,
        [
          ...lines,
          '',
          `Chamados TI: ${this.dashboardUrl('/dashboard/adm/ti')}`,
          settings.tiNotifyPhone ? `Contato TI: ${settings.tiNotifyPhone}` : null,
        ],
      );
    }

    return { compras, ti };
  }

  async notifyPendingFinanceiro(input: {
    tenantId: string;
    tenantName: string;
    requisitionId: string;
    requestedByName: string;
    totalAmount?: number | null;
  }) {
    const settings = await this.loadSettings(input.tenantId);
    const total =
      input.totalAmount != null
        ? input.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—';
    return this.notify(
      settings.financeiroNotifyEmail,
      `[Financeiro] Aprovação de compra pendente — ${input.tenantName}`,
      [
        'Requisição aguardando aprovação financeira.',
        '',
        `Empresa: ${input.tenantName}`,
        `Solicitante: ${input.requestedByName}`,
        `Valor (cotação vencedora): ${total}`,
        '',
        `Aprovar em: ${this.dashboardUrl('/dashboard/adm/financeiro/aprovacoes')}`,
        settings.financeiroNotifyPhone
          ? `Contato Financeiro: ${settings.financeiroNotifyPhone}`
          : null,
      ],
    );
  }

  async notifyPendingDiretoria(input: {
    tenantId: string;
    tenantName: string;
    requestedByName: string;
    totalAmount?: number | null;
  }) {
    const settings = await this.loadSettings(input.tenantId);
    const total =
      input.totalAmount != null
        ? input.totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        : '—';
    return this.notify(
      settings.diretoriaNotifyEmail,
      `[Diretoria] Aprovação de compra pendente — ${input.tenantName}`,
      [
        'Requisição aguardando aprovação da Diretoria (valor acima do limite).',
        '',
        `Empresa: ${input.tenantName}`,
        `Solicitante: ${input.requestedByName}`,
        `Valor: ${total}`,
        '',
        `Aprovar em: ${this.dashboardUrl('/dashboard/diretoria/aprovacoes-compras')}`,
        settings.diretoriaNotifyPhone
          ? `Contato Diretoria: ${settings.diretoriaNotifyPhone}`
          : null,
      ],
    );
  }

  async notifyNewTiTicket(input: {
    tenantId: string;
    tenantName: string;
    subject: string;
    requestedByName: string;
    priority?: string | null;
    description?: string | null;
  }) {
    const settings = await this.loadSettings(input.tenantId);
    return this.notify(
      settings.tiNotifyEmail,
      `[TI] Novo chamado — ${input.tenantName}`,
      [
        'Novo chamado de suporte TI.',
        '',
        `Empresa: ${input.tenantName}`,
        `Assunto: ${input.subject}`,
        `Solicitante: ${input.requestedByName}`,
        input.priority ? `Prioridade: ${input.priority}` : null,
        input.description ? `Descrição: ${input.description}` : null,
        '',
        `Atender em: ${this.dashboardUrl('/dashboard/adm/ti')}`,
        settings.tiNotifyPhone ? `Contato TI: ${settings.tiNotifyPhone}` : null,
      ],
    );
  }

  async getInboxCounts(tenantId?: string) {
    const tenantFilter = tenantId?.trim() ? { tenantId: tenantId.trim() } : {};
    const [comprasEnviadas, financeiroPendentes, diretoriaPendentes, tiAbertos] =
      await Promise.all([
        this.prisma.purchaseRequisition.count({
          where: { ...tenantFilter, status: 'enviada' },
        }),
        this.prisma.purchaseRequisition.count({
          where: { ...tenantFilter, status: 'aguardando_financeiro' },
        }),
        this.prisma.purchaseRequisition.count({
          where: { ...tenantFilter, status: 'aguardando_diretoria' },
        }),
        this.prisma.tiSupportTicket.count({
          where: { ...tenantFilter, status: 'aberto' },
        }),
      ]);
    return { comprasEnviadas, financeiroPendentes, diretoriaPendentes, tiAbertos };
  }
}
