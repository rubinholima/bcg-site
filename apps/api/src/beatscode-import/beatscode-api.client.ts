import { decodeBeatscodeShortContent } from './beatscode-short-content.util';
import { toBeatscodeFormData } from './beatscode-form.util';

export type BeatscodeSession = {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  shortHash?: string;
};

export type BeatscodeCategory = {
  id: number;
  name: string;
  raw: Record<string, unknown>;
};

export type BeatscodeInitialData = {
  categories: BeatscodeCategory[];
  beatscore: Record<string, unknown>;
  raw: Record<string, unknown>;
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function publicFileUrl(baseUrl: string, path: string | null | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const p = path.trim().replace(/^\/+/, '');
  if (p.startsWith('http')) return p;
  const filePath = p.startsWith('files/') ? p : `files/${p.replace(/^files\//, '')}`;
  return `${normalizeBaseUrl(baseUrl)}/${filePath}`;
}

export class BeatscodeApiClient {
  private session: BeatscodeSession | null = null;
  private activeCategoryId: number | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly username: string,
    private readonly password: string,
  ) {}

  getBaseUrl(): string {
    return normalizeBaseUrl(this.baseUrl);
  }

  getSession(): BeatscodeSession | null {
    return this.session;
  }

  resolveFileUrl(path: string | null | undefined): string | undefined {
    return publicFileUrl(this.getBaseUrl(), path);
  }

  async login(categoryId?: number): Promise<BeatscodeSession> {
    const body = toBeatscodeFormData({
      username: this.username,
      password: this.password,
      isModal: true,
      ...(categoryId != null ? { categoryId } : {}),
    });

    const res = await fetch(`${this.getBaseUrl()}/login`, {
      method: 'POST',
      body,
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(String(json.message ?? json.error ?? `Login Beatscode HTTP ${res.status}`));
    }

    const token = String(json.token ?? '');
    if (!token) throw new Error('Login Beatscode não retornou token.');

    this.session = {
      token,
      refreshToken: json.refreshToken ? String(json.refreshToken) : undefined,
      expiresAt: json.expiresAt != null ? Number(json.expiresAt) : undefined,
      shortHash: json.shortHash ? String(json.shortHash) : undefined,
    };
    return this.session;
  }

  async fetchInitialData(route = '/person/athlete'): Promise<BeatscodeInitialData> {
    const raw = await this.request<Record<string, unknown>>('GET', '/web-initial-data', { route });
    const beatscore = (raw.beatscore ?? {}) as Record<string, unknown>;
    const categoriesRaw =
      beatscore.categories ?? beatscore.category ?? raw.categories ?? [];
    const categories: BeatscodeCategory[] = [];

    if (Array.isArray(categoriesRaw)) {
      for (const item of categoriesRaw) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const id = Number(row.id ?? row.categoryId);
        const name = String(row.name ?? row.categoryName ?? '').trim();
        if (!Number.isFinite(id) || !name) continue;
        categories.push({ id, name, raw: row });
      }
    } else if (categoriesRaw && typeof categoriesRaw === 'object') {
      for (const [key, item] of Object.entries(categoriesRaw as Record<string, unknown>)) {
        if (!item || typeof item !== 'object') continue;
        const row = item as Record<string, unknown>;
        const id = Number(row.id ?? key);
        const name = String(row.name ?? row.categoryName ?? key).trim();
        if (!Number.isFinite(id) || !name) continue;
        categories.push({ id, name, raw: row });
      }
    }

    return { categories, beatscore, raw };
  }

  async setCategory(categoryId: number, route = '/person/athlete'): Promise<void> {
    await this.request('POST', '/set-category', {
      route,
      body: { categoryId },
    });
    this.activeCategoryId = categoryId;
  }

  /** Lista atletas da categoria ativa. */
  async listAthletes(route = '/person/athlete'): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', '/athlete', { route });
    return this.normalizeList(data);
  }

  /** Lista funcionários (employeeId → personId). */
  async listEmployees(route = '/person/employee'): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', '/employee', { route });
    return this.normalizeList(data);
  }

  /** Lista pessoas (nome, nascimento, endereço) — usar com listEmployees. */
  async listPersons(route = '/person'): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', '/person', { route });
    return this.normalizeList(data);
  }

  /**
   * Mapas employeeId → pessoa e employeeId → employee (cadastro RH).
   */
  async loadEmployeeAndPersonMaps(): Promise<{
    personByEmployeeId: Map<number, Record<string, unknown>>;
    employeeByEmployeeId: Map<number, Record<string, unknown>>;
  }> {
    const [employees, persons] = await Promise.all([this.listEmployees(), this.listPersons()]);
    const personById = new Map<number, Record<string, unknown>>();
    for (const person of persons) {
      const id = Number(person.id);
      if (Number.isFinite(id)) personById.set(id, person);
    }
    const personByEmployeeId = new Map<number, Record<string, unknown>>();
    const employeeByEmployeeId = new Map<number, Record<string, unknown>>();
    for (const emp of employees) {
      const employeeId = Number(emp.id);
      const personId = Number(emp.personId);
      if (!Number.isFinite(employeeId)) continue;
      employeeByEmployeeId.set(employeeId, emp);
      const person = Number.isFinite(personId) ? personById.get(personId) : undefined;
      if (person) personByEmployeeId.set(employeeId, person);
    }
    return { personByEmployeeId, employeeByEmployeeId };
  }

  /** @deprecated use loadEmployeeAndPersonMaps */
  async loadPersonByEmployeeId(): Promise<Map<number, Record<string, unknown>>> {
    const { personByEmployeeId } = await this.loadEmployeeAndPersonMaps();
    return personByEmployeeId;
  }

  /** Lista posições cadastradas no Beatscode (route /settings/position). */
  async listPositions(): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', '/position', { route: '/settings/position' });
    return this.normalizeList(data);
  }

  /** Lista opções de pé dominante no Beatscode. */
  async listDominantFeet(): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', '/dominant-foot', { route: '/settings/position' });
    return this.normalizeList(data);
  }

  /** Lista genérica (GET) — retorna array completo, não só o primeiro item. */
  async listByPath(
    path: string,
    route = '/person/athlete',
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', path, { route, params });
    return this.normalizeList(data);
  }

  /**
   * Cadastro completo do atleta (CPF, RG, extras, contratos).
   * O parâmetro `id` da API é o **id do registro de atleta** (`row.id` na listagem),
   * não o `employeeId` — nas categorias base (sub14/sub13) esses IDs divergem.
   */
  async getAthleteFull(athleteRecordId: number | string): Promise<Record<string, unknown> | null> {
    const data = await this.request<unknown>('GET', '/athlete-full', {
      route: '/person/athlete',
      params: { id: athleteRecordId },
    });
    if (!data || typeof data !== 'object') return null;
    if (Array.isArray(data)) return null;
    const obj = data as Record<string, unknown>;
    if (!obj.data || typeof obj.data !== 'object') return null;
    return obj;
  }

  /** Detalhe do cadastro RH (pix, banco, escolaridade, anexos). */
  async getEmployeeDetail(employeeId: number | string): Promise<Record<string, unknown>> {
    const id = Number(employeeId);
    const data = await this.request<unknown>('GET', '/employee', {
      route: `/person/employee/id/${employeeId}`,
    });
    return this.pickRecordById(data, id);
  }

  /** Dados pessoais completos por personId. */
  async getPersonById(personId: number | string): Promise<Record<string, unknown>> {
    const id = Number(personId);
    const data = await this.request<unknown>('GET', '/person', {
      route: `/person/id/${personId}`,
    });
    return this.pickRecordById(data, id);
  }

  /** @deprecated use getPersonById(personId) */
  async getPersonDetail(employeeId: number | string): Promise<Record<string, unknown>> {
    const employee = await this.getEmployeeDetail(employeeId);
    const personId = Number(employee.personId);
    if (!Number.isFinite(personId)) return {};
    return this.getPersonById(personId);
  }

  /** Detalhe esportivo do atleta (categoria ativa). */
  async getAthleteDetail(employeeId: number | string): Promise<Record<string, unknown>> {
    const id = Number(employeeId);
    const data = await this.request<unknown>('GET', '/athlete', {
      route: `/person/athlete/id/${employeeId}`,
    });
    return this.pickRecordById(data, id);
  }

  private pickRecordById(data: unknown, id: number): Record<string, unknown> {
    if (Array.isArray(data)) {
      const row = data.find((item) => Number((item as Record<string, unknown>).id) === id);
      return (row as Record<string, unknown>) ?? {};
    }
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const byKey = obj[String(id)];
      if (byKey && typeof byKey === 'object' && !Array.isArray(byKey)) {
        return byKey as Record<string, unknown>;
      }
      if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
        return obj.data as Record<string, unknown>;
      }
      if (Number(obj.id) === id) return obj;
    }
    return {};
  }

  /** Busca genérica por route (descoberta de endpoints Beatscode). */
  async getByRoute(
    path: string,
    route: string,
  ): Promise<Record<string, unknown>> {
    return this.getByRouteWithParams(path, route);
  }

  async getByRouteWithParams(
    path: string,
    route: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<Record<string, unknown>> {
    const data = await this.request<unknown>('GET', path, { route, params });
    if (Array.isArray(data)) {
      const idMatch = route.match(/\/id\/(\d+)\s*$/);
      if (idMatch) {
        const id = Number(idMatch[1]);
        const row = data.find((item) => Number((item as Record<string, unknown>).id) === id);
        if (row && typeof row === 'object') return row as Record<string, unknown>;
      }
      return (data[0] as Record<string, unknown>) ?? {};
    }
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return {};
  }

  async downloadFile(pathOrUrl: string): Promise<Buffer | null> {
    let url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : this.resolveFileUrl(pathOrUrl);
    if (!url) return null;

    const shortHash = this.session?.shortHash;
    if (shortHash) {
      const parsed = new URL(url);
      if (!parsed.searchParams.has('token')) {
        parsed.searchParams.set('token', shortHash);
        url = parsed.toString();
      }
    }

    const res = await fetch(url, {
      headers: this.authHeaders(),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length ? buf : null;
  }

  private authHeaders(): Record<string, string> {
    if (!this.session?.token) throw new Error('Sessão Beatscode não iniciada.');
    return { Authorization: this.session.token };
  }

  private normalizeList(data: unknown): Record<string, unknown>[] {
    if (Array.isArray(data)) {
      return data.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
    }
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.data)) {
        return obj.data.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
      }
      if (Array.isArray(obj.rows)) {
        return obj.rows.filter((x) => x && typeof x === 'object') as Record<string, unknown>[];
      }
      return Object.values(obj).filter(
        (x) => x && typeof x === 'object' && !Array.isArray(x),
      ) as Record<string, unknown>[];
    }
    return [];
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: {
      route?: string;
      params?: Record<string, string | number | boolean | undefined>;
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    if (!this.session?.token) throw new Error('Sessão Beatscode não iniciada.');

    const url = new URL(`${this.getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`);
    const route = options.route ?? '/person/athlete';
    url.searchParams.set('route', route);
    if (options.params) {
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const init: RequestInit = {
      method,
      headers: { ...this.authHeaders() },
    };

    if (method === 'POST' || method === 'PUT') {
      init.body = toBeatscodeFormData(options.body ?? {});
    }

    const res = await fetch(url.toString(), init);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof json === 'object' && json && 'message' in json
          ? String((json as { message?: string }).message)
          : `Beatscode HTTP ${res.status} em ${path}`;
      throw new Error(msg);
    }

    if (json && typeof json === 'object' && !Array.isArray(json) && 'token' in json && json.token) {
      const row = json as { token: string; refreshToken?: string; expiresAt?: number };
      this.session = {
        ...this.session!,
        token: String(row.token),
        refreshToken: row.refreshToken ? String(row.refreshToken) : this.session?.refreshToken,
        expiresAt: row.expiresAt != null ? Number(row.expiresAt) : this.session?.expiresAt,
      };
    }

    return decodeBeatscodeShortContent<T>(json);
  }
}
