import { Injectable, Logger } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';

export interface CreateMeetEventParams {
  summary: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm (default: start + 1h)
  attendeeEmails?: string[];
  timeZone?: string;
}

export interface CreateMeetEventResult {
  meetLink: string;      // Link Meet ou htmlLink (para abrir no Calendar e adicionar Meet manualmente)
  eventId: string;
  htmlLink: string;
}

const CONFERENCE_TYPES_TO_TRY = ['hangoutsMeet', 'eventHangout', 'eventNamedHangout'] as const;

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);
  private calendar: calendar_v3.Calendar | null = null;
  private isConfigured = false;
  private cachedConferenceType: string | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const clientEmail = process.env.GOOGLE_CALENDAR_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_CALENDAR_PRIVATE_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!clientEmail || !privateKey || !calendarId) {
      this.logger.warn(
        'Google Calendar não configurado. Defina GOOGLE_CALENDAR_CLIENT_EMAIL, GOOGLE_CALENDAR_PRIVATE_KEY e GOOGLE_CALENDAR_ID no .env',
      );
      return;
    }

    try {
      // Suporta tanto \n literal (do .env) quanto quebras reais
      const key = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
      const impersonateEmail = process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL?.trim();
      const auth = new google.auth.JWT({
        email: clientEmail,
        key,
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        ...(impersonateEmail && { subject: impersonateEmail }),
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.isConfigured = true;
      this.logger.log(impersonateEmail
        ? `Google Calendar configurado (impersonando ${impersonateEmail})`
        : 'Google Calendar configurado');
    } catch (err) {
      this.logger.error('Erro ao configurar Google Calendar: ' + (err instanceof Error ? err.message : String(err)));
      this.isConfigured = false;
    }
  }

  isAvailable(): boolean {
    return this.isConfigured && this.calendar !== null;
  }

  async createMeetEvent(params: CreateMeetEventParams): Promise<CreateMeetEventResult | null> {
    if (!this.calendar || !this.isConfigured) {
      this.logger.warn('createMeetEvent: Google Calendar não está configurado');
      return null;
    }

    const timeZone = params.timeZone ?? 'America/Sao_Paulo';
    const startTime = this.normalizeTime(params.startTime ?? '09:00');
    const { endDate, endTime } = params.endTime
      ? { endDate: params.startDate, endTime: this.normalizeTime(params.endTime) }
      : this.addHourOrNextDay(params.startDate, startTime);

    const startDateTime = `${params.startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    this.logger.debug(`Criando evento: ${startDateTime} - ${endDateTime}`);

    const baseEvent: calendar_v3.Schema$Event = {
      summary: params.summary,
      description: params.description ?? undefined,
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
      attendees: (params.attendeeEmails ?? []).map((email) => ({ email })),
    };

    const conferenceType = await this.getConferenceType();
    const tryWithMeet = conferenceType !== null;

    if (tryWithMeet) {
      try {
        const event: calendar_v3.Schema$Event = {
          ...baseEvent,
          conferenceData: {
            createRequest: {
              requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              conferenceSolutionKey: { type: conferenceType },
            },
          },
        };
        const response = await this.calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
          requestBody: event,
          conferenceDataVersion: 1,
        });
        const data = response.data;
        const meetLink = data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;
        const htmlLink = data.htmlLink ?? undefined;
        if (meetLink && data.id) {
          return { meetLink, eventId: data.id, htmlLink: htmlLink ?? meetLink };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Invalid conference type')) {
          const idx = CONFERENCE_TYPES_TO_TRY.indexOf(conferenceType as typeof CONFERENCE_TYPES_TO_TRY[number]);
          const nextIdx = idx >= 0 ? idx + 1 : 0;
          if (nextIdx < CONFERENCE_TYPES_TO_TRY.length) {
            this.cachedConferenceType = CONFERENCE_TYPES_TO_TRY[nextIdx];
            return this.createMeetEvent(params);
          }
          this.cachedConferenceType = null;
          this.logger.warn('Meet não suportado (Gmail/calendário pessoal). Criando evento sem link Meet.');
        } else {
          let details = err && typeof err === 'object' && 'response' in err
            ? ` [${(err as { response?: { status?: number } }).response?.status}]` : '';
          this.logger.error(`Erro ao criar evento: ${msg}${details}`);
          return null;
        }
      }
    }

    try {
      const response = await this.calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
        requestBody: baseEvent,
      });
      const data = response.data;
      const htmlLink = data.htmlLink;
      const eventId = data.id;
      if (!eventId || !htmlLink) return null;

      // Tentar adicionar Meet ao evento (funciona com Google Workspace)
      for (const confType of CONFERENCE_TYPES_TO_TRY) {
        try {
          const patched = await this.calendar.events.patch({
            calendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
            eventId,
            requestBody: {
              conferenceData: {
                createRequest: {
                  requestId: `meet-patch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  conferenceSolutionKey: { type: confType },
                },
              },
            },
            conferenceDataVersion: 1,
          });
          const meetLink = patched.data.conferenceData?.entryPoints?.find(
            (e) => e.entryPointType === 'video',
          )?.uri;
          if (meetLink) {
            this.logger.log(`Meet adicionado ao evento via PATCH (${confType})`);
            return { meetLink, eventId, htmlLink };
          }
        } catch (patchErr) {
          this.logger.debug(
            `PATCH ${confType}: ` + (patchErr instanceof Error ? patchErr.message : String(patchErr)),
          );
        }
      }

      return {
        meetLink: htmlLink,
        eventId,
        htmlLink,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Erro ao criar evento no Google Calendar: ${msg}`);
      return null;
    }
  }

  /** Obtém o tipo de conferência permitido pelo calendário (hangoutsMeet, eventHangout, etc.) */
  private async getConferenceType(): Promise<string | null> {
    if (this.cachedConferenceType) return this.cachedConferenceType;
    if (!this.calendar) return null;

    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';
    try {
      const res = await this.calendar.calendars.get({ calendarId });
      const allowed = (res.data?.conferenceProperties as { allowedConferenceSolutionTypes?: Array<{ type?: string } | string> })
        ?.allowedConferenceSolutionTypes;
      if (Array.isArray(allowed) && allowed.length > 0) {
        for (const item of allowed) {
          const type = typeof item === 'string' ? item : (item as { type?: string })?.type;
          if (type && CONFERENCE_TYPES_TO_TRY.includes(type as typeof CONFERENCE_TYPES_TO_TRY[number])) {
            this.cachedConferenceType = type;
            this.logger.debug(`Tipo de conferência do calendário: ${type}`);
            return type;
          }
        }
        const first = allowed[0];
        const type = typeof first === 'string' ? first : (first as { type?: string })?.type;
        if (type) {
          this.cachedConferenceType = type;
          return type;
        }
      }
    } catch (err) {
      this.logger.warn('Não foi possível obter conferenceProperties do calendário: ' + (err instanceof Error ? err.message : String(err)));
    }

    this.cachedConferenceType = CONFERENCE_TYPES_TO_TRY[0];
    return this.cachedConferenceType;
  }

  /** Garante horário em HH:mm (24h). Aceita "01:00 PM" -> "13:00" */
  private normalizeTime(time: string): string {
    const trimmed = time.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return trimmed;
    let h = parseInt(match[1], 10);
    const m = match[2];
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }

  /** Quando passa de 23h, end vai para o dia seguinte (evita timeRangeEmpty) */
  private addHourOrNextDay(
    dateStr: string,
    time: string,
  ): { endDate: string; endTime: string } {
    const [h, m] = time.split(':').map(Number);
    const nextH = h + 1;
    if (nextH >= 24) {
      const [y, mo, day] = dateStr.split('-').map(Number);
      const d = new Date(y, mo - 1, day + 1);
      const nextDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { endDate: nextDate, endTime: `00:${String(m).padStart(2, '0')}` };
    }
    return {
      endDate: dateStr,
      endTime: `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    };
  }
}
