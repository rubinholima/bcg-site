import Link from "next/link";
import {
  ArrowRight,
  Building2,
  FileText,
  Mail,
  Newspaper,
  Plus,
  Settings,
  Tag,
  Users,
  Image,
} from "lucide-react";
import { Tenant } from "@/types/tenant";
import { Button } from "@/components/ui/button";
import { getPublicImageUrl } from "@/lib/media-url";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import { cup360 } from "@/lib/cup360-design-tokens";
import { cn } from "@/lib/utils";

interface DashboardStats {
  tenantsCount: number;
  tenantKindsCount: number;
  usersCount: number;
  workmailAccountsCount?: number;
  pagesCount?: number;
  lastTenant?: { name: string; createdAt: string } | null;
  lastUser?: { name: string; createdAt: string } | null;
}

const QUICK_LINKS = [
  { title: "Empresas", href: "/dashboard/empresas", icon: Building2 },
  { title: "Usuários", href: "/dashboard/usuarios", icon: Users },
  { title: "Emails", href: "/dashboard/emails", icon: Mail },
  { title: "Tipos", href: "/dashboard/cadastros/tipos", icon: Tag },
  { title: "Páginas", href: "/dashboard/paginas", icon: FileText },
  { title: "Notícias", href: "/dashboard/noticias", icon: Newspaper },
  { title: "Mídia", href: "/dashboard/midia", icon: Image },
  { title: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
] as const;

const ADMIN_METRICS = [
  { key: "tenants", label: "Empresas", href: "/dashboard/empresas" },
  { key: "users", label: "Usuários", href: "/dashboard/usuarios" },
  { key: "emails", label: "Contas email", href: "/dashboard/emails" },
  { key: "kinds", label: "Tipos", href: "/dashboard/cadastros/tipos" },
  { key: "pages", label: "Páginas", href: "/dashboard/paginas" },
] as const;

function metricValue(stats: DashboardStats | null, tenantsCount: number, key: string): number | null {
  if (!stats) return key === "tenants" ? tenantsCount : null;
  if (key === "tenants") return stats.tenantsCount;
  if (key === "users") return stats.usersCount;
  if (key === "emails") return stats.workmailAccountsCount ?? null;
  if (key === "kinds") return stats.tenantKindsCount;
  if (key === "pages") return stats.pagesCount ?? 0;
  return null;
}

export function MasterSecondarySection({
  stats,
  tenants,
  kindEntries,
}: {
  stats: DashboardStats | null;
  tenants: Tenant[];
  kindEntries: Array<[string, number]>;
}) {
  const tenantsCount = stats?.tenantsCount ?? tenants.length;
  const recentTenants = tenants.slice(0, 5);

  return (
    <section className="space-y-4">
      <div>
        <p className={cup360.type.sectionLabel}>Administração</p>
        <h2 className={cn(cup360.type.pageTitle, "mt-1 text-lg")}>Cadastros e totais</h2>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
        {ADMIN_METRICS.map(({ key, label, href }) => {
          const value = metricValue(stats, tenantsCount, key);
          return (
            <Link
              key={key}
              href={href}
              className={cn(
                cup360.surface1,
                "group flex flex-col gap-1 px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4",
              )}
            >
              <span className={cup360.type.caption}>{label}</span>
              <span className="text-xl font-semibold tabular-nums tracking-tight">
                {value !== null ? value : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                Abrir
              </span>
            </Link>
          );
        })}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-12">
        <div className={cn(cup360.surface1, "min-w-0 xl:col-span-7")}>
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-5">
            <div>
              <h3 className={cup360.type.sectionTitle}>Últimas empresas</h3>
              <p className={cup360.type.caption}>Cadastros recentes no grupo</p>
            </div>
            <Link href="/dashboard/empresas">
              <Button variant="outline" size="sm" className="h-8">
                Ver todas
              </Button>
            </Link>
          </div>
          <div className="p-4 sm:p-5">
            {recentTenants.length === 0 ? (
              <p className={cup360.type.caption}>Nenhuma empresa cadastrada.</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentTenants.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/dashboard/empresas/${t.id}/edit`}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/20 rounded-md px-1 -mx-1"
                    >
                      {t.logoUrl ? (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={getPublicImageUrl(t.logoUrl)}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.kind.name}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/empresas/new"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Nova empresa
            </Link>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
          <div className={cn(cup360.surface1, "min-w-0")}>
            <div className="border-b border-border/60 px-4 py-3 sm:px-5">
              <h3 className={cup360.type.sectionTitle}>Atalhos</h3>
            </div>
            <nav className="grid grid-cols-2 gap-1 p-3 sm:p-4">
              {QUICK_LINKS.map(({ title, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-foreground hover:bg-muted/30"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{title}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className={cn(cup360.surface1, "min-w-0")}>
            <div className="border-b border-border/60 px-4 py-3 sm:px-5">
              <h3 className={cup360.type.sectionTitle}>Última atividade</h3>
            </div>
            <div className="space-y-2 p-4 sm:p-5 text-sm">
              {stats?.lastTenant ? (
                <p>
                  <span className="text-muted-foreground">Empresa:</span>{" "}
                  <span className="font-medium">{stats.lastTenant.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {formatDateTimeDayMonYear(stats.lastTenant.createdAt)}
                  </span>
                </p>
              ) : (
                <p className={cup360.type.caption}>Nenhuma empresa recente.</p>
              )}
              {stats?.lastUser ? (
                <p>
                  <span className="text-muted-foreground">Usuário:</span>{" "}
                  <span className="font-medium">{stats.lastUser.name}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {formatDateTimeDayMonYear(stats.lastUser.createdAt)}
                  </span>
                </p>
              ) : null}
            </div>
          </div>

          {kindEntries.length > 0 ? (
            <div className={cn(cup360.surface1, "min-w-0 sm:col-span-2 xl:col-span-1")}>
              <div className="border-b border-border/60 px-4 py-3 sm:px-5">
                <h3 className={cup360.type.sectionTitle}>Empresas por tipo</h3>
              </div>
              <ul className="space-y-1 p-4 sm:p-5">
                {kindEntries.slice(0, 6).map(([kindName, count]) => (
                  <li
                    key={kindName}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="truncate text-muted-foreground">{kindName}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
