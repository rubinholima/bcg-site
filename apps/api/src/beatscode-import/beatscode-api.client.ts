import { decodeBeatscodeShortContent } from './beatscode-short-content.util';
import { toBeatscodeFormData } from './beatscode-form.util';

export type BeatscodeSession = {
  token: string;
  refreshToken?: string;
  expiresAt?: number;
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
  async listByPath(path: string, route = '/person/athlete'): Promise<Record<string, unknown>[]> {
    const data = await this.request<unknown>('GET', path, { route });
    return this.normalizeList(data);
  }

  /** Detalhe do atleta (quando a listagem não traz todos os campos). */
  async getAthleteDetail(athleteId: number | string): Promise<Record<string, unknown>> {
    const data = await this.request<unknown>('GET', '/athlete', {
      route: `/person/athlete/id/${athleteId}`,
    });
    if (Array.isArray(data)) return (data[0] as Record<string, unknown>) ?? {};
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (obj.data && typeof obj.data === 'object') return obj.data as Record<string, unknown>;
      return obj;
    }
    return {};
  }

  /** Dados pessoais (nome, nascimento, endereço) — complementa a listagem. */
  async getPersonDetail(athleteId: number | string): Promise<Record<string, unknown>> {
    return this.getByRoute('/person', `/person/athlete/id/${athleteId}`);
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
    if (Array.isArray(data)) return (data[0] as Record<string, unknown>) ?? {};
    if (data && typeof data === 'object') return data as Record<string, unknown>;
    return {};
  }

  async downloadFile(pathOrUrl: string): Promise<Buffer | null> {
    const url = pathOrUrl.startsWith('http')
      ? pathOrUrl
      : this.resolveFileUrl(pathOrUrl);
    if (!url) return null;

    const res = await fetch(url, {
      headers: this.authHeaders(),
    });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
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
