import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolAgendaService } from '../futebol-agenda/futebol-agenda.service';
import { MeService } from '../auth/me.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
} from '../common/sports-situation.util';
import { getPlayerListDisplayName } from '../common/player-list-display-name.util';
import {
  CreatePsychologySessionDto,
  PsychologyAttendanceRowDto,
  UpdatePsychologySessionDto,
} from './dto/psychology-session.dto';
import {
  isPsychologyEligiblePlayer,
  parsePsychologyPersonKey,
  playerPsychologyClassification,
  psychologyClassificationLabel,
  psychologyPersonKey,
  staffRoleLabel,
  type PsychologyCarePersonDto,
  type PsychologyPersonClassification,
  type PsychologyPersonType,
} from './psychology-care-person.util';
import { employeeVisibleInRhListFilter } from '../rh/rh-employee-visibility.util';

type AttendanceRow = PsychologyAttendanceRowDto & { playerName?: string };

type SessionEditLogEntry = {
  at: string;
  userId: string;
  userName: string;
  action: 'created' | 'updated';
  comment?: string;
};

@Injectable()
export class PsychologySessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly futebolAgenda: FutebolAgendaService,
    private readonly meService: MeService,
  ) {}

  async list(
    params?: {
      tenantId?: string;
      from?: string;
      to?: string;
      sessionType?: string;
      category?: string;
    },
    allowedTenantIds: string[] | null = null,
  ) {
    const where: Record<string, unknown> = {};
    if (params?.tenantId) {
      where.tenantId = params.tenantId;
    } else if (allowedTenantIds !== null) {
      where.tenantId = { in: allowedTenantIds };
    }
    if (params?.sessionType) where.sessionType = params.sessionType;
    if (params?.category) where.category = params.category;
    if (params?.from || params?.to) {
      where.date = {};
      if (params.from) (where.date as Record<string, string>).gte = params.from;
      if (params.to) (where.date as Record<string, string>).lte = params.to;
    }
    return this.prisma.psychologySession.findMany({
      where,
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const row = await this.prisma.psychologySession.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Sessão não encontrada');
    if (allowedTenantIds !== null && !allowedTenantIds.includes(row.tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
    return row;
  }

  async create(dto: CreatePsychologySessionDto, editor?: CognitoJwtPayload) {
    await this.assertTenant(dto.tenantId);
    const names = await this.resolveStaffNames(dto);
    const person = await this.resolvePersonBinding(dto);
    let attendance = dto.attendance;
    if (dto.sessionType === 'grupo' && dto.category && (!attendance || attendance.length === 0)) {
      attendance = await this.buildCategoryAttendance(dto.tenantId, dto.category);
    }
    const row = await this.prisma.psychologySession.create({
      data: {
        tenantId: dto.tenantId,
        sessionType: dto.sessionType,
        date: dto.date,
        time: dto.time ?? null,
        endTime: dto.endTime ?? null,
        category: dto.category ?? null,
        playerId: person.playerId,
        personType: person.personType,
        employeeId: person.employeeId,
        staffId: person.staffId,
        personClassification: person.personClassification,
        psychologistId: dto.psychologistId ?? null,
        estagiarioId: dto.estagiarioId ?? null,
        psychologistName: names.psychologistName ?? null,
        estagiarioName: names.estagiarioName ?? null,
        location: dto.location ?? null,
        status: dto.status ?? 'scheduled',
        notes: dto.notes ?? null,
        periodStart: dto.periodStart ?? null,
        periodEnd: dto.periodEnd ?? null,
        categoriesLabel: dto.categoriesLabel ?? null,
        activities: dto.activities ?? null,
        individualDemands: dto.individualDemands ?? null,
        weeklyDevelopment: dto.weeklyDevelopment ?? null,
        identifiedDemands: dto.identifiedDemands ?? null,
        nextWeekPlanning: dto.nextWeekPlanning ?? null,
        finalSummary: dto.finalSummary ?? null,
        generalNotes: dto.generalNotes ?? null,
        groupSummary: dto.groupSummary ?? null,
        attendance: attendance as object | undefined,
        durationSeconds: dto.durationSeconds ?? null,
        isPrivate: dto.isPrivate === true,
        editLog:
          dto.sessionType === 'relatorio_semanal' && editor
            ? (this.appendEditLog(null, {
                at: new Date().toISOString(),
                ...(await this.resolveEditor(editor)),
                action: 'created',
              }) as object)
            : undefined,
      },
    });

    let footballAgendaEntryId: string | null = null;
    if (!row.isPrivate && dto.syncAgenda !== false && dto.sessionType !== 'relatorio_semanal') {
      footballAgendaEntryId = await this.syncFootballAgenda(row);
    }

    const updated = await this.prisma.psychologySession.update({
      where: { id: row.id },
      data: { footballAgendaEntryId },
    });

    if (updated.status === 'completed') {
      await this.syncPersonRecords(updated);
    }

    return updated;
  }

  async update(id: string, dto: UpdatePsychologySessionDto, editor?: CognitoJwtPayload) {
    const existing = await this.findOne(id);
    const names = await this.resolveStaffNames({
      ...dto,
      psychologistId: dto.psychologistId ?? existing.psychologistId ?? undefined,
      estagiarioId: dto.estagiarioId ?? existing.estagiarioId ?? undefined,
      psychologistName: dto.psychologistName ?? existing.psychologistName ?? undefined,
      estagiarioName: dto.estagiarioName ?? existing.estagiarioName ?? undefined,
    });

    const reportFields = [
      'periodStart',
      'periodEnd',
      'categoriesLabel',
      'activities',
      'individualDemands',
      'weeklyDevelopment',
      'identifiedDemands',
      'nextWeekPlanning',
      'finalSummary',
      'generalNotes',
    ] as const;
    const hasReportFieldChange = reportFields.some((key) => {
      if (dto[key] === undefined) return false;
      const next = (dto[key] ?? '').trim();
      const prev = ((existing[key] as string | null) ?? '').trim();
      return next !== prev;
    });
    const editComment = dto.editComment?.trim();
    const shouldLog =
      existing.sessionType === 'relatorio_semanal' &&
      editor &&
      (hasReportFieldChange || Boolean(editComment));

    const mergedSessionType = dto.sessionType ?? existing.sessionType;
    const person =
      dto.personType !== undefined ||
      dto.playerId !== undefined ||
      dto.employeeId !== undefined ||
      dto.staffId !== undefined ||
      dto.personClassification !== undefined
        ? await this.resolvePersonBinding({
            sessionType: mergedSessionType,
            tenantId: dto.tenantId ?? existing.tenantId,
            playerId: dto.playerId ?? existing.playerId ?? undefined,
            personType: dto.personType ?? existing.personType ?? undefined,
            employeeId: dto.employeeId ?? existing.employeeId ?? undefined,
            staffId: dto.staffId ?? existing.staffId ?? undefined,
            personClassification:
              dto.personClassification ?? existing.personClassification ?? undefined,
          })
        : null;

    let nextEditLog: SessionEditLogEntry[] | undefined;
    if (shouldLog) {
      nextEditLog = this.appendEditLog(existing.editLog, {
        at: new Date().toISOString(),
        ...(await this.resolveEditor(editor!)),
        action: 'updated',
        comment: editComment || undefined,
      });
    }

    const row = await this.prisma.psychologySession.update({
      where: { id },
      data: {
        tenantId: dto.tenantId ?? existing.tenantId,
        sessionType: dto.sessionType ?? existing.sessionType,
        date: dto.date ?? existing.date,
        time: dto.time !== undefined ? dto.time : existing.time,
        endTime: dto.endTime !== undefined ? dto.endTime : existing.endTime,
        category: dto.category !== undefined ? dto.category : existing.category,
        playerId: person ? person.playerId : dto.playerId !== undefined ? dto.playerId : existing.playerId,
        personType: person ? person.personType : existing.personType,
        employeeId: person ? person.employeeId : existing.employeeId,
        staffId: person ? person.staffId : existing.staffId,
        personClassification: person ? person.personClassification : existing.personClassification,
        psychologistId:
          dto.psychologistId !== undefined ? dto.psychologistId : existing.psychologistId,
        estagiarioId:
          dto.estagiarioId !== undefined ? dto.estagiarioId : existing.estagiarioId,
        psychologistName: names.psychologistName ?? existing.psychologistName,
        estagiarioName: names.estagiarioName ?? existing.estagiarioName,
        location: dto.location !== undefined ? dto.location : existing.location,
        status: dto.status ?? existing.status,
        notes: dto.notes !== undefined ? dto.notes : existing.notes,
        periodStart: dto.periodStart !== undefined ? dto.periodStart : existing.periodStart,
        periodEnd: dto.periodEnd !== undefined ? dto.periodEnd : existing.periodEnd,
        categoriesLabel:
          dto.categoriesLabel !== undefined ? dto.categoriesLabel : existing.categoriesLabel,
        activities: dto.activities !== undefined ? dto.activities : existing.activities,
        individualDemands:
          dto.individualDemands !== undefined ? dto.individualDemands : existing.individualDemands,
        weeklyDevelopment:
          dto.weeklyDevelopment !== undefined
            ? dto.weeklyDevelopment
            : existing.weeklyDevelopment,
        identifiedDemands:
          dto.identifiedDemands !== undefined
            ? dto.identifiedDemands
            : existing.identifiedDemands,
        nextWeekPlanning:
          dto.nextWeekPlanning !== undefined ? dto.nextWeekPlanning : existing.nextWeekPlanning,
        finalSummary: dto.finalSummary !== undefined ? dto.finalSummary : existing.finalSummary,
        generalNotes: dto.generalNotes !== undefined ? dto.generalNotes : existing.generalNotes,
        groupSummary: dto.groupSummary !== undefined ? dto.groupSummary : existing.groupSummary,
        attendance:
          dto.attendance !== undefined
            ? (dto.attendance as object)
            : (existing.attendance as object | undefined),
        durationSeconds:
          dto.durationSeconds !== undefined ? dto.durationSeconds : existing.durationSeconds,
        isPrivate: dto.isPrivate !== undefined ? dto.isPrivate === true : existing.isPrivate,
        ...(nextEditLog ? { editLog: nextEditLog as object } : {}),
      },
    });

    if (row.status === 'completed') {
      await this.syncPersonRecords(row);
    }

    return row;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.psychologySession.delete({ where: { id } });
    return { ok: true };
  }

  async categoryRoster(tenantId: string, category: string) {
    await this.assertTenant(tenantId);
    const players = await this.findPsychologyPlayersByCategory(tenantId, category);
    return players
      .map((p) => ({
        playerId: p.id,
        playerName: getPlayerListDisplayName(p),
        present: false,
        classification: playerPsychologyClassification(p.registrationProfile),
      }))
      .sort((a, b) =>
        (a.playerName ?? '').localeCompare(b.playerName ?? '', 'pt-BR', { sensitivity: 'base' }),
      );
  }

  async listCarePersons(
    tenantId: string,
    allowedTenantIds: string[] | null = null,
  ): Promise<PsychologyCarePersonDto[]> {
    await this.assertTenant(tenantId);
    if (allowedTenantIds !== null && !allowedTenantIds.includes(tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }

    const [players, employees, staffMembers] = await Promise.all([
      this.prisma.player.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          category: true,
          photoUrl: true,
          contactEmail: true,
          registrationProfile: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.employee.findMany({
        where: { tenantId, ...employeeVisibleInRhListFilter, playerId: null },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          email: true,
          type: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.technicalStaff.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          photoUrl: true,
          email: true,
          role: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const linkedEmployeePlayerIds = new Set(
      (
        await this.prisma.employee.findMany({
          where: { tenantId, playerId: { not: null } },
          select: { playerId: true },
        })
      )
        .map((row) => row.playerId)
        .filter(Boolean) as string[],
    );

    const out: PsychologyCarePersonDto[] = [];

    for (const player of players) {
      if (!isPsychologyEligiblePlayer(player.registrationProfile)) continue;
      if (linkedEmployeePlayerIds.has(player.id)) continue;
      const classification = playerPsychologyClassification(player.registrationProfile);
      out.push({
        personType: 'player',
        personId: player.id,
        key: psychologyPersonKey('player', player.id),
        name: getPlayerListDisplayName(player),
        classification,
        classificationLabel: psychologyClassificationLabel(classification),
        tenantId,
        category: player.category,
        photoUrl: player.photoUrl,
        email: player.contactEmail,
      });
    }

    for (const employee of employees) {
      out.push({
        personType: 'employee',
        personId: employee.id,
        key: psychologyPersonKey('employee', employee.id),
        name: employee.name,
        classification: 'funcionario',
        classificationLabel: psychologyClassificationLabel('funcionario'),
        tenantId,
        roleLabel: employee.type,
        photoUrl: employee.photoUrl,
        email: employee.email,
      });
    }

    for (const member of staffMembers) {
      out.push({
        personType: 'staff',
        personId: member.id,
        key: psychologyPersonKey('staff', member.id),
        name: member.name,
        classification: 'funcionario',
        classificationLabel: psychologyClassificationLabel('funcionario'),
        tenantId,
        roleLabel: staffRoleLabel(member.role),
        photoUrl: member.photoUrl,
        email: member.email,
      });
    }

    return out.sort((a, b) => {
      const rank = (row: PsychologyCarePersonDto) =>
        row.classification === 'elenco' ? 0 : row.classification === 'emprestado' ? 1 : 2;
      const rankDiff = rank(a) - rank(b);
      if (rankDiff !== 0) return rankDiff;
      return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
    });
  }

  async getCarePersonClinical(
    personType: PsychologyPersonType,
    personId: string,
    allowedTenantIds: string[] | null = null,
  ) {
    const row = await this.loadCarePersonClinicalRow(personType, personId, allowedTenantIds);
    return {
      personType,
      personId,
      psychologicalAssessment: row.psychologicalAssessment,
      onlineConsultations: row.onlineConsultations,
    };
  }

  async updateCarePersonClinical(
    personType: PsychologyPersonType,
    personId: string,
    payload: { psychologicalAssessment?: unknown; onlineConsultations?: unknown },
    allowedTenantIds: string[] | null = null,
  ) {
    await this.loadCarePersonClinicalRow(personType, personId, allowedTenantIds);
    const data: Record<string, unknown> = {};
    if (payload.psychologicalAssessment !== undefined) {
      data.psychologicalAssessment = payload.psychologicalAssessment as object;
    }
    if (payload.onlineConsultations !== undefined) {
      data.onlineConsultations = payload.onlineConsultations as object;
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Nenhum dado clínico informado.');
    }

    if (personType === 'player') {
      return this.prisma.player.update({ where: { id: personId }, data });
    }
    if (personType === 'employee') {
      return this.prisma.employee.update({ where: { id: personId }, data });
    }
    return this.prisma.technicalStaff.update({ where: { id: personId }, data });
  }

  private async loadCarePersonClinicalRow(
    personType: PsychologyPersonType,
    personId: string,
    allowedTenantIds: string[] | null,
  ) {
    if (personType === 'player') {
      const row = await this.prisma.player.findUnique({
        where: { id: personId },
        select: {
          tenantId: true,
          psychologicalAssessment: true,
          onlineConsultations: true,
        },
      });
      if (!row) throw new NotFoundException('Atleta não encontrado');
      if (allowedTenantIds !== null && !allowedTenantIds.includes(row.tenantId)) {
        throw new ForbiddenException('Acesso negado a esta empresa.');
      }
      return row;
    }
    if (personType === 'employee') {
      const row = await this.prisma.employee.findUnique({
        where: { id: personId },
        select: {
          tenantId: true,
          psychologicalAssessment: true,
          onlineConsultations: true,
        },
      });
      if (!row) throw new NotFoundException('Funcionário não encontrado');
      if (allowedTenantIds !== null && !allowedTenantIds.includes(row.tenantId)) {
        throw new ForbiddenException('Acesso negado a esta empresa.');
      }
      return row;
    }
    const row = await this.prisma.technicalStaff.findUnique({
      where: { id: personId },
      select: {
        tenantId: true,
        psychologicalAssessment: true,
        onlineConsultations: true,
      },
    });
    if (!row) throw new NotFoundException('Membro da comissão não encontrado');
    if (allowedTenantIds !== null && !allowedTenantIds.includes(row.tenantId)) {
      throw new ForbiddenException('Acesso negado a esta empresa.');
    }
    return row;
  }

  private sportsSituationFromProfile(registrationProfile: unknown): string | undefined {
    if (!registrationProfile || typeof registrationProfile !== 'object' || Array.isArray(registrationProfile)) {
      return undefined;
    }
    const sports = (registrationProfile as Record<string, unknown>).sports;
    if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return undefined;
    const situation = (sports as Record<string, unknown>).situation;
    return typeof situation === 'string' ? situation : undefined;
  }

  /** Elenco + emprestados (sem desligados). */
  private isPsychologyRosterPlayer(registrationProfile: unknown): boolean {
    return isPsychologyEligiblePlayer(registrationProfile);
  }

  private async findPsychologyPlayersByCategory(tenantId: string, category: string) {
    const players = await this.prisma.player.findMany({
      where: { tenantId, category },
      select: { id: true, name: true, registrationProfile: true },
      orderBy: { name: 'asc' },
    });
    return players.filter((p) => this.isPsychologyRosterPlayer(p.registrationProfile));
  }

  private async resolvePersonBinding(dto: {
    sessionType: string;
    tenantId: string;
    playerId?: string;
    personType?: string;
    employeeId?: string;
    staffId?: string;
    personClassification?: string;
  }) {
    if (dto.sessionType !== 'presencial') {
      return {
        personType: 'player' as PsychologyPersonType,
        playerId: dto.playerId ?? null,
        employeeId: null as string | null,
        staffId: null as string | null,
        personClassification: (dto.personClassification ?? null) as string | null,
      };
    }

    const personType = (dto.personType?.trim() || 'player') as PsychologyPersonType;
    if (personType === 'employee') {
      const employeeId = dto.employeeId?.trim();
      if (!employeeId) throw new BadRequestException('Funcionário obrigatório');
      const employee = await this.prisma.employee.findFirst({
        where: { id: employeeId, tenantId: dto.tenantId },
        select: { id: true },
      });
      if (!employee) throw new NotFoundException('Funcionário não encontrado');
      return {
        personType,
        playerId: null,
        employeeId,
        staffId: null,
        personClassification: 'funcionario',
      };
    }

    if (personType === 'staff') {
      const staffId = dto.staffId?.trim();
      if (!staffId) throw new BadRequestException('Membro da comissão obrigatório');
      const staff = await this.prisma.technicalStaff.findFirst({
        where: { id: staffId, tenantId: dto.tenantId },
        select: { id: true },
      });
      if (!staff) throw new NotFoundException('Membro da comissão não encontrado');
      return {
        personType,
        playerId: null,
        employeeId: null,
        staffId,
        personClassification: 'funcionario',
      };
    }

    const playerId = dto.playerId?.trim();
    if (!playerId) throw new BadRequestException('Atleta obrigatório');
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, tenantId: dto.tenantId },
      select: { id: true, registrationProfile: true },
    });
    if (!player) throw new NotFoundException('Atleta não encontrado');
    return {
      personType: 'player' as PsychologyPersonType,
      playerId,
      employeeId: null,
      staffId: null,
      personClassification:
        dto.personClassification?.trim() ||
        playerPsychologyClassification(player.registrationProfile),
    };
  }

  private async assertTenant(tenantId: string) {
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!t) throw new BadRequestException('Clube não encontrado');
  }

  private appendEditLog(existing: unknown, entry: SessionEditLogEntry): SessionEditLogEntry[] {
    const list = Array.isArray(existing) ? [...(existing as SessionEditLogEntry[])] : [];
    list.push(entry);
    return list;
  }

  private async resolveEditor(user: CognitoJwtPayload) {
    const dbUser =
      (await this.meService.findUserByCognitoSub(user.sub)) ??
      (await this.meService.findUserById(user.sub));
    const userName =
      dbUser?.name?.trim() ||
      (typeof user.name === 'string' ? user.name.trim() : '') ||
      (typeof user.email === 'string' ? user.email.trim() : '') ||
      dbUser?.username ||
      'Usuário';
    return { userId: dbUser?.id ?? user.sub, userName };
  }

  private async resolveStaffNames(dto: {
    psychologistId?: string;
    estagiarioId?: string;
    psychologistName?: string;
    estagiarioName?: string;
  }) {
    let psychologistName = dto.psychologistName?.trim();
    let estagiarioName = dto.estagiarioName?.trim();
    if (dto.psychologistId) {
      const p = await this.prisma.psychologist.findUnique({
        where: { id: dto.psychologistId },
        select: { name: true },
      });
      if (p) psychologistName = p.name;
    }
    if (dto.estagiarioId) {
      const intern = await this.prisma.healthIntern.findUnique({
        where: { id: dto.estagiarioId },
        select: { name: true },
      });
      if (intern) {
        estagiarioName = intern.name;
      } else {
        const e = await this.prisma.psychologist.findUnique({
          where: { id: dto.estagiarioId },
          select: { name: true },
        });
        if (e) estagiarioName = e.name;
      }
    }
    return { psychologistName, estagiarioName };
  }

  private async buildCategoryAttendance(tenantId: string, category: string): Promise<AttendanceRow[]> {
    const players = await this.findPsychologyPlayersByCategory(tenantId, category);
    return players.map((p) => ({
      playerId: p.id,
      playerName: getPlayerListDisplayName(p),
      present: false,
    }));
  }

  private sessionTitle(row: {
    sessionType: string;
    category: string | null;
    categoriesLabel: string | null;
    psychologistName: string | null;
  }) {
    if (row.sessionType === 'grupo') {
      const cat = row.category ?? row.categoriesLabel ?? 'grupo';
      return `Psicologia em grupo — ${cat}`;
    }
    if (row.sessionType === 'presencial') {
      return `Atendimento psicológico presencial`;
    }
    return `Relatório semanal — Psicologia`;
  }

  private toStartAt(date: string, time?: string | null) {
    const t = time?.trim() || '09:00';
    const iso = `${date}T${t.length === 5 ? `${t}:00` : t}`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Data/hora inválida');
    return d.toISOString();
  }

  private async syncFootballAgenda(row: {
    id: string;
    tenantId: string;
    sessionType: string;
    date: string;
    time: string | null;
    endTime: string | null;
    category: string | null;
    location: string | null;
    notes: string | null;
    psychologistName: string | null;
    attendance: unknown;
  }) {
    try {
      const attendance = Array.isArray(row.attendance)
        ? (row.attendance as AttendanceRow[])
        : [];
      const playerIds = attendance.map((a) => a.playerId).filter(Boolean);
      const startAt = this.toStartAt(row.date, row.time);
      let endAt: string | null = null;
      if (row.endTime) {
        endAt = this.toStartAt(row.date, row.endTime);
      }
      const entry = await this.futebolAgenda.createEntry({
        tenantId: row.tenantId,
        category: row.category ?? undefined,
        type: 'compromisso',
        title: this.sessionTitle({
          sessionType: row.sessionType,
          category: row.category,
          categoriesLabel: null,
          psychologistName: row.psychologistName,
        }),
        startAt,
        endAt: endAt ?? undefined,
        location: row.location ?? undefined,
        description: [
          row.psychologistName ? `Profissional: ${row.psychologistName}` : null,
          row.notes,
        ]
          .filter(Boolean)
          .join('\n'),
        playerIds: playerIds.length ? playerIds : undefined,
        allowConflict: true,
      });
      return entry.id;
    } catch {
      return null;
    }
  }

  private async syncPersonRecords(row: {
    id: string;
    sessionType: string;
    date: string;
    time: string | null;
    category: string | null;
    playerId: string | null;
    personType: string | null;
    employeeId: string | null;
    staffId: string | null;
    psychologistName: string | null;
    estagiarioName: string | null;
    groupSummary: string | null;
    notes: string | null;
    finalSummary: string | null;
    attendance: unknown;
  }) {
    const evaluator = row.estagiarioName ?? row.psychologistName ?? undefined;
    const base = {
      date: row.date,
      time: row.time ?? undefined,
      evaluator,
      supervisor: row.psychologistName ?? undefined,
      estagiario: row.estagiarioName ?? undefined,
      sessionId: row.id,
    };

    if (row.sessionType === 'relatorio_semanal') {
      return;
    }

    if (row.sessionType === 'presencial') {
      const personType = (row.personType ?? 'player') as PsychologyPersonType;
      const entry = {
        ...base,
        kind: 'atendimento_presencial',
        category: row.category ?? undefined,
        observacaoGeral: row.notes ?? row.groupSummary ?? undefined,
      };
      if (personType === 'employee' && row.employeeId) {
        await this.appendPersonPsychEntry('employee', row.employeeId, entry);
        return;
      }
      if (personType === 'staff' && row.staffId) {
        await this.appendPersonPsychEntry('staff', row.staffId, entry);
        return;
      }
      if (row.playerId) {
        await this.appendPersonPsychEntry('player', row.playerId, entry);
      }
      return;
    }

    if (row.sessionType === 'grupo') {
      const attendance = Array.isArray(row.attendance)
        ? (row.attendance as AttendanceRow[])
        : [];
      for (const item of attendance) {
        if (!item.playerId) continue;
        await this.appendPersonPsychEntry('player', item.playerId, {
          ...base,
          kind: 'atendimento_grupo',
          category: row.category ?? undefined,
          present: item.present !== false,
          groupSummary: row.groupSummary ?? undefined,
          individualNotes: item.individualNotes ?? undefined,
          observacaoGeral: item.individualNotes ?? row.groupSummary ?? undefined,
        });
      }
    }
  }

  private async appendPersonPsychEntry(
    personType: PsychologyPersonType,
    personId: string,
    entry: Record<string, unknown>,
  ) {
    const row = await this.loadCarePersonClinicalRow(personType, personId, null);
    const list = Array.isArray(row.psychologicalAssessment)
      ? [...(row.psychologicalAssessment as Record<string, unknown>[])]
      : [];
    const sessionId = entry.sessionId as string;
    const kind = entry.kind as string;
    const filtered = list.filter((x) => !(x.sessionId === sessionId && x.kind === kind));
    filtered.push(entry);

    if (personType === 'player') {
      await this.prisma.player.update({
        where: { id: personId },
        data: { psychologicalAssessment: filtered as object },
      });
      return;
    }
    if (personType === 'employee') {
      await this.prisma.employee.update({
        where: { id: personId },
        data: { psychologicalAssessment: filtered as object },
      });
      return;
    }
    await this.prisma.technicalStaff.update({
      where: { id: personId },
      data: { psychologicalAssessment: filtered as object },
    });
  }
}
