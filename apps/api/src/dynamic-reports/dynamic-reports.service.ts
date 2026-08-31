import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModulesService } from '../modules/modules.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import { employeeVisibleInRhListFilter } from '../rh/rh-employee-visibility.util';
import {
  normalizeSportsSituation,
} from '../common/sports-situation.util';
import {
  authorizeRequestedFields,
  DYNAMIC_REPORT_FIELDS,
  filterFieldsForModules,
  getFieldDefinition,
} from './fields/field.registry';
import {
  calcAgeFromBirthDate,
  cbfFromPlayer,
  isArchivedPlayer,
  isCurrentBidPlayer,
  isLoanedPlayer,
  parseRegistrationProfile,
  pickActiveEmployment,
  resolveBankData,
  sportsSituationLabel,
} from './populations/population.util';
import {
  DYNAMIC_REPORT_GROUP_OPTIONS,
  DYNAMIC_REPORT_POPULATIONS,
  DYNAMIC_REPORT_PRESETS,
  DYNAMIC_REPORT_SORT_OPTIONS,
  getPopulationDefinition,
  getPresetDefinition,
} from './presets/preset.registry';
import type {
  DynamicReportMetaResult,
  DynamicReportRunInput,
  DynamicReportRunResult,
  DynamicReportRow,
  DynamicReportSection,
  DynamicReportRunFilters,
} from './dynamic-reports.types';

type PlayerRow = {
  id: string;
  tenantId: string;
  name: string;
  birthDate: string | null;
  category: string | null;
  position: string | null;
  jerseyNumber: number | null;
  cbfRegistration: string | null;
  registrationProfile: unknown;
  rhEmployee?: {
    id: string;
    pixKey: string | null;
    employments: Array<{
      status: string;
      endDate: Date | null;
      contractType: string;
      bankData: unknown;
      department: { id: string; name: string } | null;
    }>;
  } | null;
};

type EmployeeRow = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  playerId: string | null;
  pixKey: string | null;
  employments: Array<{
    status: string;
    endDate: Date | null;
    contractType: string;
    bankData: unknown;
    department: { id: string; name: string } | null;
  }>;
};

@Injectable()
export class DynamicReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modulesService: ModulesService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  async getMeta(userSub: string, role: string): Promise<DynamicReportMetaResult> {
    const { slugs, isSuperAdmin } = await this.resolveModuleAccess(userSub, role);
    const fields = filterFieldsForModules(DYNAMIC_REPORT_FIELDS, slugs, isSuperAdmin);
    return {
      populations: DYNAMIC_REPORT_POPULATIONS,
      presets: DYNAMIC_REPORT_PRESETS,
      fields,
      sortOptions: DYNAMIC_REPORT_SORT_OPTIONS,
      groupOptions: DYNAMIC_REPORT_GROUP_OPTIONS,
    };
  }

  async runReport(
    input: DynamicReportRunInput,
    userSub: string,
    role: string,
    allowedTenantIds: string[] | null,
  ): Promise<DynamicReportRunResult> {
    this.tenantAccess.assertCanAccessTenant(allowedTenantIds, input.tenantId);

    const preset = input.presetId ? getPresetDefinition(input.presetId) : undefined;
    const population = preset?.population ?? input.population;
    if (!population || !getPopulationDefinition(population)) {
      throw new BadRequestException('População inválida ou não informada.');
    }

    const { slugs, isSuperAdmin } = await this.resolveModuleAccess(userSub, role);

    const requestedFields =
      preset?.lockedFields && preset.defaultFields.length > 0
        ? preset.defaultFields
        : (input.fields ?? preset?.defaultFields ?? []);

    const { allowed: fieldKeys, stripped } = authorizeRequestedFields(
      requestedFields,
      population,
      slugs,
      isSuperAdmin,
    );

    if (fieldKeys.length === 0) {
      throw new BadRequestException('Nenhum campo autorizado selecionado para o relatório.');
    }

    const filters = input.filters ?? {};
    const sortBy = input.sortBy ?? preset?.sortBy ?? 'fullName';
    const sortDir = input.sortDir ?? preset?.sortDir ?? 'asc';
    const groupBy = input.groupBy ?? preset?.groupBy ?? 'none';

    const needsMinutes = fieldKeys.includes('officialMatchMinutes');
    let rows: DynamicReportRow[] = [];

    if (population === 'people.cafeteria') {
      rows = await this.buildCafeteriaRows(input.tenantId, filters, allowedTenantIds);
    } else if (population.startsWith('player.')) {
      const players = await this.loadPlayers(input.tenantId, population, filters, allowedTenantIds);
      const minutesMap = needsMinutes
        ? await this.loadOfficialMatchMinutesBatch(
            input.tenantId,
            players.map((p) => p.id),
            filters,
          )
        : new Map<string, number>();
      rows = players.map((p) =>
        this.playerToReportRow(p, population, minutesMap.get(p.id) ?? 0),
      );
    } else if (population.startsWith('employee.')) {
      const employees = await this.loadEmployees(input.tenantId, population, filters, allowedTenantIds);
      rows = employees.map((e) => this.employeeToReportRow(e, population));
    }

    const resolvedFields = this.resolveFieldKeysForRows(fieldKeys, rows);
    rows = this.applyFieldValues(rows, resolvedFields, fieldKeys);

    rows = this.sortRows(rows, sortBy, sortDir);
    const sections = this.buildSections(rows, groupBy, population);

    const columns = fieldKeys
      .map((key) => {
        const def = getFieldDefinition(key);
        return def ? { key, label: def.label } : null;
      })
      .filter((c): c is { key: string; label: string } => c != null);

    return {
      presetId: preset?.id ?? null,
      population,
      tenantId: input.tenantId,
      columns,
      sortBy,
      sortDir,
      groupBy,
      sections,
      strippedFields: stripped.length > 0 ? stripped : undefined,
      filtersSummary: this.buildFiltersSummary(filters, population),
    };
  }

  private async resolveModuleAccess(userSub: string, role: string) {
    const isSuperAdmin = role === 'super_admin';
    const slugs = isSuperAdmin
      ? DYNAMIC_REPORT_FIELDS.flatMap((f) => f.requiredModules)
      : await this.modulesService.getSlugsForActor(userSub, role);
    return { slugs, isSuperAdmin };
  }

  private async loadPlayers(
    tenantId: string,
    population: string,
    filters: DynamicReportRunFilters,
    allowedTenantIds: string[] | null,
  ): Promise<PlayerRow[]> {
    const where: Prisma.PlayerWhereInput = { tenantId };
    if (filters.category?.trim()) where.category = filters.category.trim();
    if (filters.position?.trim()) where.position = filters.position.trim();

    let players = await this.prisma.player.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        tenantId: true,
        name: true,
        birthDate: true,
        category: true,
        position: true,
        jerseyNumber: true,
        cbfRegistration: true,
        registrationProfile: true,
        rhEmployee: {
          select: {
            id: true,
            pixKey: true,
            employments: {
              include: { department: { select: { id: true, name: true } } },
              orderBy: { startDate: 'desc' },
            },
          },
        },
      },
    });

    if (allowedTenantIds !== null && !allowedTenantIds.includes(tenantId)) {
      return [];
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      players = players.filter((p) => p.name.toLowerCase().includes(term));
    }

    players = players.filter((p) => {
      if (population === 'player.current_bid') {
        return isCurrentBidPlayer(p.registrationProfile, p.cbfRegistration);
      }
      if (population === 'player.loaned') {
        return isLoanedPlayer(p.registrationProfile);
      }
      if (population === 'player.athletes') {
        if (isArchivedPlayer(p.registrationProfile)) return false;
        if (filters.situation?.trim()) {
          const profile = parseRegistrationProfile(p.registrationProfile);
          return normalizeSportsSituation(profile.sports?.situation) === filters.situation.trim();
        }
        return true;
      }
      return true;
    });

    return players;
  }

  private async loadEmployees(
    tenantId: string,
    population: string,
    filters: DynamicReportRunFilters,
    allowedTenantIds: string[] | null,
  ): Promise<EmployeeRow[]> {
    if (allowedTenantIds !== null && !allowedTenantIds.includes(tenantId)) {
      return [];
    }

    const where: Prisma.EmployeeWhereInput = {
      tenantId,
      ...employeeVisibleInRhListFilter,
    };
    if (filters.employeeType?.trim()) where.type = filters.employeeType.trim();

    let employees = await this.prisma.employee.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        tenantId: true,
        name: true,
        type: true,
        playerId: true,
        pixKey: true,
        employments: {
          include: { department: { select: { id: true, name: true } } },
          orderBy: { startDate: 'desc' },
        },
      },
    });

    employees = employees.filter((e) => pickActiveEmployment(e.employments) != null);

    if (filters.departmentId?.trim()) {
      employees = employees.filter((e) => {
        const active = pickActiveEmployment(e.employments);
        return active?.department?.id === filters.departmentId?.trim();
      });
    }

    if (population === 'employee.active_staff' || population === 'employee.by_department') {
      // já filtrado por vínculo ativo
    }

    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      employees = employees.filter((e) => e.name.toLowerCase().includes(term));
    }

    return employees;
  }

  private async buildCafeteriaRows(
    tenantId: string,
    filters: DynamicReportRunFilters,
    allowedTenantIds: string[] | null,
  ): Promise<DynamicReportRow[]> {
    const players = await this.loadPlayers(tenantId, 'player.athletes', filters, allowedTenantIds);
    const playerRows = players
      .filter((p) => !isArchivedPlayer(p.registrationProfile))
      .map((p) => this.playerToReportRow(p, 'people.cafeteria', 0));

    const employees = await this.loadEmployees(
      tenantId,
      'employee.active_staff',
      filters,
      allowedTenantIds,
    );
    const staffRows = employees
      .filter((e) => !e.playerId)
      .map((e) => this.employeeToReportRow(e, 'people.cafeteria'));

    return [...playerRows, ...staffRows];
  }

  private playerToReportRow(
    player: PlayerRow,
    population: string,
    officialMinutes: number,
  ): DynamicReportRow {
    const profile = parseRegistrationProfile(player.registrationProfile);
    const activeEmp = player.rhEmployee
      ? pickActiveEmployment(player.rhEmployee.employments)
      : null;
    const bank = resolveBankData(
      profile,
      activeEmp?.bankData,
      player.rhEmployee?.pixKey,
    );
    const nickname =
      profile.personal?.nickname?.trim() ||
      profile.sports?.jerseyName?.trim() ||
      null;
    const category = player.category?.trim() || 'Sem categoria';

    return {
      personType: 'player',
      personId: player.id,
      playerId: player.id,
      employeeId: player.rhEmployee?.id ?? null,
      groupType: 'category',
      groupName: category,
      sectionTitle: 'ATLETAS',
      values: {
        fullName: player.name,
        nickname,
        birthDate: player.birthDate,
        age: calcAgeFromBirthDate(player.birthDate),
        category,
        position: player.position,
        jerseyNumber: player.jerseyNumber,
        sportsSituation: sportsSituationLabel(player.registrationProfile),
        cpf: profile.personal?.cpf ?? null,
        rg: profile.personal?.rg ?? null,
        cbfRegistration: cbfFromPlayer(player.cbfRegistration, profile) || null,
        loanDestinationClub: profile.loan?.destinationClub ?? null,
        loanStartDate: profile.loan?.startDate ?? null,
        loanEndDate: profile.loan?.endDate ?? null,
        bankName: bank.bankName,
        bankAgency: bank.bankAgency,
        bankAccount: bank.bankAccount,
        bankAccountType: bank.bankAccountType,
        pixKey: bank.pixKey,
        pixKeyType: bank.pixKeyType,
        officialMatchMinutes: officialMinutes,
        signature: null,
      },
    };
  }

  private employeeToReportRow(employee: EmployeeRow, population: string): DynamicReportRow {
    const active = pickActiveEmployment(employee.employments);
    const department = active?.department?.name?.trim() || 'Sem departamento';

    return {
      personType: 'employee',
      personId: employee.id,
      playerId: employee.playerId,
      employeeId: employee.id,
      groupType: 'department',
      groupName: department,
      sectionTitle: 'FUNCIONÁRIOS',
      values: {
        fullName: employee.name,
        employeeFullName: employee.name,
        department,
        employeeType: employee.type,
        employmentContractType: active?.contractType ?? null,
        signature: null,
      },
    };
  }

  /** Cafeteria preset pede fullName; funcionários usam employeeFullName internamente */
  private resolveFieldKeysForRows(fieldKeys: string[], rows: DynamicReportRow[]): string[] {
    return fieldKeys;
  }

  private applyFieldValues(
    rows: DynamicReportRow[],
    _resolved: string[],
    fieldKeys: string[],
  ): DynamicReportRow[] {
    return rows.map((row) => {
      const values: Record<string, string | number | null> = {};
      for (const key of fieldKeys) {
        const def = getFieldDefinition(key);
        if (def?.fieldType === 'displayOnly') {
          values[key] = null;
          continue;
        }
        if (key === 'fullName' && row.personType === 'employee') {
          values[key] = (row.values.employeeFullName as string) ?? (row.values.fullName as string) ?? null;
          continue;
        }
        values[key] = row.values[key] ?? null;
      }
      return { ...row, values };
    });
  }

  private async loadOfficialMatchMinutesBatch(
    tenantId: string,
    playerIds: string[],
    filters: DynamicReportRunFilters,
  ): Promise<Map<string, number>> {
    if (playerIds.length === 0) return new Map();

    const matchWhere: Prisma.FmfMatchReportWhereInput = { tenantId };
    if (filters.season != null && Number.isFinite(filters.season)) {
      matchWhere.season = filters.season;
    }
    if (filters.competition?.trim()) {
      matchWhere.competition = { contains: filters.competition.trim(), mode: 'insensitive' };
    }

    const stats = await this.prisma.fmfPlayerMatchStat.findMany({
      where: {
        playerId: { in: playerIds },
        match: matchWhere,
      },
      select: { playerId: true, minutesPlayed: true },
    });

    const map = new Map<string, number>();
    for (const stat of stats) {
      map.set(stat.playerId, (map.get(stat.playerId) ?? 0) + stat.minutesPlayed);
    }
    return map;
  }

  private sortRows(rows: DynamicReportRow[], sortBy: string, sortDir: 'asc' | 'desc'): DynamicReportRow[] {
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = a.values[sortBy] ?? a.values.fullName ?? a.values.employeeFullName;
      const bv = b.values[sortBy] ?? b.values.fullName ?? b.values.employeeFullName;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv), 'pt-BR', { sensitivity: 'base' }) * dir;
    });
  }

  private buildSections(
    rows: DynamicReportRow[],
    groupBy: string,
    population: string,
  ): DynamicReportSection[] {
    if (groupBy === 'cafeteria' || population === 'people.cafeteria') {
      const athleteRows = rows.filter((r) => r.personType === 'player');
      const staffRows = rows.filter((r) => r.personType === 'employee');
      const sections: DynamicReportSection[] = [];

      if (athleteRows.length > 0) {
        sections.push({
          sectionTitle: 'ATLETAS',
          groups: this.groupRows(athleteRows, 'category'),
        });
      }
      if (staffRows.length > 0) {
        sections.push({
          sectionTitle: 'FUNCIONÁRIOS',
          groups: this.groupRows(staffRows, 'department'),
        });
      }
      return sections.length > 0 ? sections : [{ sectionTitle: 'Relatório', groups: [{ groupName: '—', rows: [] }] }];
    }

    if (groupBy === 'category') {
      return [{ sectionTitle: 'Relatório', groups: this.groupRows(rows, 'category') }];
    }
    if (groupBy === 'department') {
      return [{ sectionTitle: 'Relatório', groups: this.groupRows(rows, 'department') }];
    }

    return [
      {
        sectionTitle: 'Relatório',
        groups: [{ groupName: '—', rows }],
      },
    ];
  }

  private groupRows(rows: DynamicReportRow[], mode: 'category' | 'department'): Array<{ groupName: string; rows: DynamicReportRow[] }> {
    const map = new Map<string, DynamicReportRow[]>();
    for (const row of rows) {
      const name = mode === 'category' ? row.groupName : row.groupName;
      const list = map.get(name) ?? [];
      list.push(row);
      map.set(name, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
      .map(([groupName, groupRows]) => ({ groupName, rows: groupRows }));
  }

  private buildFiltersSummary(filters: DynamicReportRunFilters, population: string): string {
    const parts: string[] = [`População: ${getPopulationDefinition(population)?.label ?? population}`];
    if (filters.category) parts.push(`Categoria: ${filters.category}`);
    if (filters.situation) parts.push(`Situação: ${filters.situation}`);
    if (filters.position) parts.push(`Posição: ${filters.position}`);
    if (filters.departmentId) parts.push(`Departamento: ${filters.departmentId}`);
    if (filters.employeeType) parts.push(`Tipo: ${filters.employeeType}`);
    if (filters.season != null) parts.push(`Temporada: ${filters.season}`);
    if (filters.competition) parts.push(`Competição: ${filters.competition}`);
    if (filters.search) parts.push(`Busca: "${filters.search}"`);
    return parts.join(' · ');
  }
}
