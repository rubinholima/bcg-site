import { cookies } from "next/headers";
import Link from "next/link";
import {
  Building2,
  Users,
  Tag,
  FileText,
  ArrowRight,
  Plus,
  Newspaper,
  Image,
  Settings,
  Mail,
  Bell,
  Clock,
} from "lucide-react";
import { Tenant } from "@/types/tenant";
import type { Group } from "@/types/group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildBackendUrl } from "@/lib/apiProxy";

interface LastActivity {
  name: string;
  createdAt: string;
}

interface DashboardStats {
  tenantsCount: number;
  tenantKindsCount: number;
  usersCount: number;
  workmailOrgsCount?: number;
  workmailAccountsCount?: number;
  pagesCount?: number;
  lastTenant?: LastActivity | null;
  lastUser?: LastActivity | null;
}

async function getGroup(): Promise<Group | null> {
  try {
    const res = await fetch(buildBackendUrl("/group"), {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as Group;
  } catch {
    return null;
  }
}

async function getStats(token: string | undefined): Promise<DashboardStats | null> {
  if (!token) return null;
  try {
    const res = await fetch(buildBackendUrl("/dashboard/stats"), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as DashboardStats;
  } catch {
    return null;
  }
}

async function getTenants(token: string | undefined): Promise<Tenant[]> {
  if (!token) return [];
  try {
    const res = await fetch(buildBackendUrl("/tenants"), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    return (await res.json()) as Tenant[];
  } catch {
    return [];
  }
}

const QUICK_LINKS = [
  { title: "Empresas", href: "/dashboard/empresas", icon: Building2 },
  { title: "Usuários", href: "/dashboard/usuarios", icon: Users },
  { title: "Emails", href: "/dashboard/emails", icon: Mail },
  { title: "Tipos", href: "/dashboard/tipos", icon: Tag },
  { title: "Páginas", href: "/dashboard/paginas", icon: FileText },
  { title: "Notícias", href: "/dashboard/noticias", icon: Newspaper },
  { title: "Mídia", href: "/dashboard/midia", icon: Image },
  { title: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
] as const;

const STAT_CARDS = [
  {
    key: "tenants" as const,
    label: "Empresas",
    icon: Building2,
    href: "/dashboard/empresas",
    accent: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    iconClass: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "users" as const,
    label: "Usuários",
    icon: Users,
    href: "/dashboard/usuarios",
    accent: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "emails" as const,
    label: "Contas de email",
    icon: Mail,
    href: "/dashboard/emails",
    accent: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/20",
    iconClass: "text-cyan-600 dark:text-cyan-400",
  },
  {
    key: "kinds" as const,
    label: "Tipos de empresa",
    icon: Tag,
    href: "/dashboard/tipos",
    accent: "from-violet-500/10 to-violet-600/5 border-violet-500/20",
    iconClass: "text-violet-600 dark:text-violet-400",
  },
  {
    key: "pages" as const,
    label: "Páginas publicadas",
    icon: FileText,
    href: "/dashboard/paginas",
    accent: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
] as const;

function getStatValue(
  stats: DashboardStats | null,
  tenantsCount: number,
  key: (typeof STAT_CARDS)[number]["key"]
): number | null {
  if (!stats) {
    if (key === "tenants") return tenantsCount;
    return null;
  }
  if (key === "tenants") return stats.tenantsCount;
  if (key === "users") return stats.usersCount;
  if (key === "emails") return stats.workmailAccountsCount ?? null;
  if (key === "kinds") return stats.tenantKindsCount;
  if (key === "pages") return stats.pagesCount ?? 0;
  return null;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("access_token")?.value ?? cookieStore.get("id_token")?.value;

  const [group, stats, tenants] = await Promise.all([
    getGroup(),
    getStats(token ?? undefined),
    getTenants(token ?? undefined),
  ]);

  const tenantsCount = stats?.tenantsCount ?? tenants.length;
  const recentTenants = tenants.slice(0, 5);
  const groupName = group?.name ?? "Boston City Group";

  // Resumo por tipo: agrupa empresas por kind.name
  const countsByKind = tenants.reduce<Record<string, number>>((acc, t) => {
    const name = t.kind?.name ?? "Sem tipo";
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  const kindEntries = Object.entries(countsByKind).sort((a, b) => b[1] - a[1]);

  const updatedAt = new Date();
  const updatedAtLabel = formatDateTime(updatedAt.toISOString());

  return (
    <div className="w-full min-w-0 max-w-full space-y-8">
      {/* Welcome */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border border-border p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Dashboard — {groupName}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Central de gestão: empresas, usuários, emails corporativos e configurações.
        </p>
      </div>

      {/* Stats */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Resumo</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {STAT_CARDS.map(({ key, label, icon: Icon, href, accent, iconClass }) => {
            const value = getStatValue(stats, tenantsCount, key);
            return (
              <Link key={key} href={href} className="block group min-w-0">
                <Card
                  className={`min-w-0 overflow-hidden border bg-gradient-to-br ${accent} transition-all hover:shadow-md hover:border-primary/30`}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {label}
                    </CardTitle>
                    <span className={`rounded-lg p-2 bg-background/70 ${iconClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {value !== null ? value : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-foreground transition-colors">
                      Ver detalhes <ArrowRight className="h-3 w-3" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Últimas empresas */}
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Últimas empresas</CardTitle>
              <CardDescription>
                Empresas cadastradas na plataforma
              </CardDescription>
            </div>
            <Link href="/dashboard/empresas">
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTenants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhuma empresa cadastrada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recentTenants.map((t) => (
                  <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/dashboard/empresas/${t.id}/edit`}
                      className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors"
                    >
                      {t.logoUrl ? (
                        <img
                          src={t.logoUrl}
                          alt=""
                          className="h-9 w-9 rounded-md object-contain bg-muted"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.kind.name}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/empresas/new"
              className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Plus className="h-4 w-4" /> Nova empresa
            </Link>
          </CardContent>
        </Card>

        {/* Atalhos */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Atalhos</CardTitle>
            <CardDescription>
              Acesso rápido às áreas do dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <nav className="flex flex-col gap-1">
              {QUICK_LINKS.map(({ title, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {title}
                  <ArrowRight className="h-3.5 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Última atividade + Resumo por tipo */}
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Última atividade
            </CardTitle>
            <CardDescription>
              Última empresa e último usuário cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.lastTenant ? (
              <p className="text-sm">
                <span className="font-medium">Última empresa:</span>{" "}
                {stats.lastTenant.name}{" "}
                <span className="text-muted-foreground">
                  em {formatDateTime(stats.lastTenant.createdAt)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa cadastrada ainda.
              </p>
            )}
            {stats?.lastUser ? (
              <p className="text-sm">
                <span className="font-medium">Último usuário:</span>{" "}
                {stats.lastUser.name}{" "}
                <span className="text-muted-foreground">
                  em {formatDateTime(stats.lastUser.createdAt)}
                </span>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário cadastrado ainda.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-muted-foreground" />
              Resumo por tipo
            </CardTitle>
            <CardDescription>
              Empresas agrupadas por tipo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kindEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma empresa cadastrada ainda.
              </p>
            ) : (
              <ul className="space-y-2">
                {kindEntries.map(([kindName, count]) => (
                  <li
                    key={kindName}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{kindName}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Avisos / Notificações */}
      <Card className="min-w-0 border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Avisos
          </CardTitle>
          <CardDescription>
            Alertas e notificações do sistema (em breve)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhum aviso no momento. Aqui poderão aparecer alertas como token
            WorkMail próximo do vencimento, entre outros.
          </p>
        </CardContent>
      </Card>

      {/* Data da última atualização */}
      <p className="text-xs text-muted-foreground text-right">
        Dados atualizados em {updatedAtLabel}
      </p>
    </div>
  );
}
