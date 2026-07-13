import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { ComunicacaoService } from './comunicacao.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('comunicacao')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('comunicacao')
export class ComunicacaoController {
  constructor(private readonly service: ComunicacaoService) {}

  private actor(req: AuthedRequest) {
    return {
      sub: req.user.sub,
      name: (req.user.name as string) ?? null,
      email: (req.user.email as string) ?? null,
    };
  }

  @Get('stats')
  stats(@Query('tenantId') tenantId?: string) {
    return this.service.getStats(tenantId?.trim() || undefined);
  }

  @Get('conversations')
  listConversations(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('channelType') channelType?: string,
    @Query('search') search?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('favoritesOnly') favoritesOnly?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
  ) {
    return this.service.listConversations({
      tenantId: tenantId?.trim() || undefined,
      status,
      channelType,
      search,
      unreadOnly: unreadOnly === '1' || unreadOnly === 'true',
      favoritesOnly: favoritesOnly === '1' || favoritesOnly === 'true',
      assignedToUserId: assignedToUserId?.trim() || undefined,
    });
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string) {
    return this.service.getConversation(id);
  }

  @Post('conversations')
  createConversation(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    return this.service.createConversation(
      {
        tenantId: String(body.tenantId ?? ''),
        channelType: body.channelType != null ? String(body.channelType) : undefined,
        channelAccountId:
          body.channelAccountId != null ? String(body.channelAccountId) : undefined,
        contactName: body.contactName != null ? String(body.contactName) : undefined,
        contactPhone: body.contactPhone != null ? String(body.contactPhone) : undefined,
        contactEmail: body.contactEmail != null ? String(body.contactEmail) : undefined,
        subject: body.subject != null ? String(body.subject) : undefined,
        customerId: body.customerId != null ? String(body.customerId) : undefined,
        venuePipelineLeadId:
          body.venuePipelineLeadId != null ? String(body.venuePipelineLeadId) : undefined,
        initialMessage:
          body.initialMessage != null ? String(body.initialMessage) : undefined,
      },
      this.actor(req),
    );
  }

  @Patch('conversations/:id')
  updateConversation(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateConversation(
      id,
      {
        status: body.status != null ? String(body.status) : undefined,
        assignedToUserId:
          body.assignedToUserId === null
            ? null
            : body.assignedToUserId != null
              ? String(body.assignedToUserId)
              : undefined,
        assignedToName:
          body.assignedToName === null
            ? null
            : body.assignedToName != null
              ? String(body.assignedToName)
              : undefined,
        isFavorite: typeof body.isFavorite === 'boolean' ? body.isFavorite : undefined,
        subject:
          body.subject === null
            ? null
            : body.subject != null
              ? String(body.subject)
              : undefined,
        contactName:
          body.contactName === null
            ? null
            : body.contactName != null
              ? String(body.contactName)
              : undefined,
        customerId:
          body.customerId === null
            ? null
            : body.customerId != null
              ? String(body.customerId)
              : undefined,
        venuePipelineLeadId:
          body.venuePipelineLeadId === null
            ? null
            : body.venuePipelineLeadId != null
              ? String(body.venuePipelineLeadId)
              : undefined,
        linkedEntityType:
          body.linkedEntityType === null
            ? null
            : body.linkedEntityType != null
              ? String(body.linkedEntityType)
              : undefined,
        linkedEntityId:
          body.linkedEntityId === null
            ? null
            : body.linkedEntityId != null
              ? String(body.linkedEntityId)
              : undefined,
      },
      this.actor(req),
    );
  }

  @Post('conversations/:id/read')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { body?: string; messageType?: string; mediaUrl?: string },
  ) {
    return this.service.addOutboundMessage(
      id,
      {
        body: body.body ?? '',
        messageType: body.messageType,
        mediaUrl: body.mediaUrl,
      },
      this.actor(req),
    );
  }

  @Post('conversations/:id/notes')
  addNote(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { body?: string },
  ) {
    return this.service.addNote(id, body.body ?? '', this.actor(req));
  }

  @Post('conversations/:id/tags')
  setTags(
    @Req() req: AuthedRequest,
    @Param('id') id: string,
    @Body() body: { tagIds?: string[] },
  ) {
    return this.service.setConversationTags(id, body.tagIds ?? [], this.actor(req));
  }

  @Get('tags')
  listTags(@Query('tenantId') tenantId: string) {
    return this.service.listTags(tenantId?.trim() || '');
  }

  @Post('tags')
  createTag(@Body() body: { tenantId: string; name: string; color?: string }) {
    return this.service.createTag(body.tenantId, body.name, body.color);
  }

  @Get('channels')
  listChannels(@Query('tenantId') tenantId?: string) {
    return this.service.listChannelAccounts(tenantId?.trim() || undefined);
  }

  @Post('channels')
  upsertChannel(
    @Body()
    body: {
      tenantId: string;
      channelType: string;
      label: string;
      externalId?: string;
      displayAddress?: string;
      isActive?: boolean;
    },
  ) {
    return this.service.upsertChannelAccount(body);
  }

  @Get('templates')
  listTemplates(
    @Query('tenantId') tenantId: string,
    @Query('channelType') channelType?: string,
  ) {
    return this.service.listTemplates(tenantId?.trim() || '', channelType);
  }

  @Post('templates')
  createTemplate(
    @Body()
    body: {
      tenantId: string;
      channelType: string;
      name: string;
      body: string;
      externalName?: string;
    },
  ) {
    return this.service.createTemplate(body);
  }
}

/**
 * Webhook público WhatsApp Cloud API (Meta).
 * Verificação GET + ingestão POST. Sem JWT — protegido por VERIFY_TOKEN.
 */
@Controller('comunicacao/webhooks/whatsapp')
export class ComunicacaoWhatsAppWebhookController {
  constructor(private readonly service: ComunicacaoService) {}

  @Get()
  verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') token?: string,
    @Query('hub.challenge') challenge?: string,
  ) {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN?.trim();
    if (mode === 'subscribe' && expected && token === expected && challenge) {
      return challenge;
    }
    return { error: 'Forbidden' };
  }

  @Post()
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers('x-hub-signature-256') _signature?: string,
  ) {
    // Meta envia object=whatsapp_business_account com entry[].changes[].value.messages[]
    const object = body?.object;
    if (object !== 'whatsapp_business_account') {
      return { ok: true, ignored: true };
    }

    const entry = Array.isArray(body.entry) ? body.entry : [];
    const results: unknown[] = [];

    for (const ent of entry as Array<Record<string, unknown>>) {
      const changes = Array.isArray(ent.changes) ? ent.changes : [];
      for (const change of changes as Array<Record<string, unknown>>) {
        const value = (change.value ?? {}) as Record<string, unknown>;
        const metadata = (value.metadata ?? {}) as Record<string, unknown>;
        const phoneNumberId = metadata.phone_number_id
          ? String(metadata.phone_number_id)
          : undefined;
        const contacts = Array.isArray(value.contacts) ? value.contacts : [];
        const messages = Array.isArray(value.messages) ? value.messages : [];

        for (const msg of messages as Array<Record<string, unknown>>) {
          const from = msg.from != null ? String(msg.from) : '';
          const contact = contacts[0] as Record<string, unknown> | undefined;
          const profile = (contact?.profile ?? {}) as Record<string, unknown>;
          const textObj = (msg.text ?? {}) as Record<string, unknown>;
          const type = msg.type != null ? String(msg.type) : 'text';

          let bodyText: string | undefined;
          if (type === 'text') bodyText = textObj.body != null ? String(textObj.body) : undefined;
          else bodyText = `[${type}]`;

          try {
            const r = await this.service.ingestInbound({
              channelType: 'whatsapp',
              channelExternalId: phoneNumberId,
              externalContactId: from,
              contactPhone: from,
              contactName: profile.name != null ? String(profile.name) : undefined,
              messageExternalId: msg.id != null ? String(msg.id) : undefined,
              messageType: type,
              body: bodyText,
            });
            results.push(r);
          } catch (err) {
            results.push({
              error: err instanceof Error ? err.message : 'ingest_failed',
            });
          }
        }
      }
    }

    return { ok: true, results };
  }
}
