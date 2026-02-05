import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ImapFlow } from 'imapflow';
import { PrismaService } from '../prisma/prisma.service';

const REGION = (process.env.AWS_REGION ?? 'us-east-1').trim();
const IMAP_HOST = `imap.mail.${REGION}.awsapps.com`;
const IMAP_PORT = 993;

export interface InboxMessageSummary {
  uid: number;
  subject: string;
  from: string;
  date: string;
  snippet?: string;
}

export interface InboxMessageDetail {
  uid: number;
  subject: string;
  from: string;
  to: string;
  date: string;
  text?: string;
  html?: string;
}

interface BodyPart {
  type?: string;
  subtype?: string;
  childNodes?: BodyPart[];
}

/**
 * Senha do mailbox: env WORKMAIL_<SLUG>_PASSWORD (slug em maiúsculas, hífens mantidos).
 * Ex.: americanofc -> WORKMAIL_AMERICANOFC_PASSWORD
 */
function getMailboxPassword(tenantSlug: string): string | null {
  const key = `WORKMAIL_${tenantSlug.replace(/-/g, '_').toUpperCase()}_PASSWORD`;
  const value = (process.env[key] ?? '').trim();
  return value || null;
}

@Injectable()
export class WorkMailInboxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o email do mailbox principal do tenant (primeira conta WorkMail ativa).
   */
  private async getMailboxEmail(tenantSlug: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    if (!tenant) return null;
    const account = await this.prisma.workMailAccount.findFirst({
      where: { organizationId: tenant.id, status: 'ACTIVE' },
      select: { email: true },
      orderBy: { createdAt: 'asc' },
    });
    return account?.email ?? null;
  }

  /**
   * Lista mensagens da INBOX do mailbox do tenant (últimas N).
   */
  async listInbox(tenantSlug: string, limit = 50): Promise<InboxMessageSummary[]> {
    const email = await this.getMailboxEmail(tenantSlug);
    const password = getMailboxPassword(tenantSlug);
    if (!email) {
      throw new NotFoundException(
        'Nenhuma conta de e-mail WorkMail ativa para este clube/empresa.',
      );
    }
    if (!password) {
      throw new ServiceUnavailableException(
        'Senha do mailbox não configurada. Defina WORKMAIL_<SLUG>_PASSWORD no servidor.',
      );
    }

    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
    });

    const results: InboxMessageSummary[] = [];
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const mailbox = client.mailbox;
        const total = (mailbox && typeof mailbox === 'object' && 'exists' in mailbox) ? (mailbox as { exists: number }).exists : 0;
        if (total === 0) return [];
        const start = Math.max(1, total - limit + 1);
        const range = `${start}:*`;
        const messages = await client.fetchAll(range, {
          envelope: true,
          bodyStructure: false,
          uid: true,
        });
        for (const msg of messages) {
          const env = msg.envelope;
          const from = env?.from?.[0]
            ? `${(env.from[0] as { name?: string[] }).name?.[0] ?? ''} <${(env.from[0] as { address?: string }).address ?? ''}>`.trim() || String(env.from[0])
            : '';
          results.push({
            uid: msg.uid,
            subject: (env?.subject ?? '').toString().trim() || '(sem assunto)',
            from: from || '(desconhecido)',
            date: env?.date ? new Date(env.date).toISOString() : '',
          });
        }
        results.reverse();
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    return results;
  }

  /**
   * Obtém uma mensagem pelo UID (corpo texto/html).
   */
  async getMessage(tenantSlug: string, uid: number): Promise<InboxMessageDetail | null> {
    const email = await this.getMailboxEmail(tenantSlug);
    const password = getMailboxPassword(tenantSlug);
    if (!email || !password) return null;

    const client = new ImapFlow({
      host: IMAP_HOST,
      port: IMAP_PORT,
      secure: true,
      auth: { user: email, pass: password },
      logger: false,
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const list = await client.fetchOne(String(uid), {
          envelope: true,
          uid: true,
          bodyStructure: true,
        }, { uid: true });
        if (!list) return null;
        const env = list.envelope;
        const from = env?.from?.[0]
          ? `${(env.from[0] as { name?: string[] }).name?.[0] ?? ''} <${(env.from[0] as { address?: string }).address ?? ''}>`.trim() || String(env.from[0])
          : '';
        const to = env?.to?.map((t) => `${(t as { address?: string }).address ?? ''}`).filter(Boolean).join(', ') ?? '';
        let text: string | undefined;
        let html: string | undefined;
        const structure = list.bodyStructure as BodyPart | undefined;
        if (structure) {
          const textPart = this.findPartByType(structure, 'text', 'plain', '1');
          const htmlPart = this.findPartByType(structure, 'text', 'html', '1');
          if (textPart) {
            const { content } = await client.download(String(uid), textPart, { uid: true });
            const chunks: Buffer[] = [];
            for await (const chunk of content) chunks.push(chunk);
            text = Buffer.concat(chunks).toString('utf-8');
          }
          if (htmlPart) {
            const { content } = await client.download(String(uid), htmlPart, { uid: true });
            const chunks: Buffer[] = [];
            for await (const chunk of content) chunks.push(chunk);
            html = Buffer.concat(chunks).toString('utf-8');
          }
        }
        return {
          uid: list.uid,
          subject: (env?.subject ?? '').toString().trim() || '(sem assunto)',
          from: from || '(desconhecido)',
          to,
          date: env?.date ? new Date(env.date).toISOString() : '',
          text,
          html,
        };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout();
    }
    return null;
  }

  private findPartByType(
    node: BodyPart,
    type: string,
    subtype: string,
    path: string,
  ): string | null {
    if (node.type === type && node.subtype === subtype) return path;
    const children = node.childNodes;
    if (children?.length) {
      for (let i = 0; i < children.length; i++) {
        const childPath = path === '1' ? `${i + 1}` : `${path}.${i + 1}`;
        const found = this.findPartByType(children[i] as BodyPart, type, subtype, childPath);
        if (found) return found;
      }
    }
    return null;
  }
}
