"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Globe,
  FileText,
  Image,
  Settings,
  Newspaper,
  Tag,
  Users,
  Mail,
  KeyRound,
} from "lucide-react";
import type { Group } from "@/types/group";

const menuItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, moduleSlug: "dashboard" },
  { title: "Grupo Master", href: "/dashboard/grupo", icon: Globe, moduleSlug: "grupo_master" },
  { title: "Usuários", href: "/dashboard/usuarios", icon: Users, moduleSlug: "usuarios" },
  { title: "Empresas", href: "/dashboard/empresas", icon: Building2, moduleSlug: "empresas" },
  { title: "Emails", href: "/dashboard/emails", icon: Mail, moduleSlug: "emails" },
  { title: "Tipos", href: "/dashboard/tipos", icon: Tag, moduleSlug: "tipos" },
  { title: "Páginas", href: "/dashboard/paginas", icon: FileText, moduleSlug: "paginas" },
  { title: "Notícias", href: "/dashboard/noticias", icon: Newspaper, moduleSlug: "noticias" },
  { title: "Mídia", href: "/dashboard/midia", icon: Image, moduleSlug: "midia" },
  { title: "Senhas", href: "/dashboard/senhas", icon: KeyRound, moduleSlug: "vault" },
  { title: "Configurações", href: "/dashboard/configuracoes", icon: Settings, moduleSlug: "configuracoes" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { canAccessModule, canAccessDashboard } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(`${baseUrl}/group`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Group | null) => {
        if (!cancelled && data) {
          setGroup(data);
          setLogoError(false);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const name = group?.name ?? "Grupo Master";
  const showLogo = group?.logoUrl && !logoError;

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      {/* Logo + nome do grupo + Platform */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          {showLogo && group?.logoUrl ? (
            <img
              src={group.logoUrl}
              alt=""
              className="h-8 w-8 object-contain rounded flex-shrink-0"
              onError={() => setLogoError(true)}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0 text-xs font-bold">
              <Building2 className="h-4 w-4" />
            </div>
          )}
          <span className="text-lg font-semibold truncate">
            <span className="text-muted-foreground">Dashboard</span> {name}
          </span>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems
          .filter(
            (item) =>
              canAccessModule(item.moduleSlug) ||
              (item.moduleSlug === "emails" && canAccessDashboard),
          )
          .map((item) => {
          const Icon = item.icon;
          // Considera ativo se a rota atual corresponde ou é /dashboard/tenants (rota técnica)
          const isActive =
            pathname === item.href ||
            (item.href === "/dashboard/grupo" &&
              pathname?.startsWith("/dashboard/grupo")) ||
            (item.href === "/dashboard/empresas" &&
              pathname?.startsWith("/dashboard/tenants")) ||
            (item.href === "/dashboard/usuarios" &&
              pathname?.startsWith("/dashboard/usuarios")) ||
            (item.href === "/dashboard/emails" &&
              pathname?.startsWith("/dashboard/emails")) ||
            (item.href === "/dashboard/midia" &&
              pathname?.startsWith("/dashboard/midia")) ||
            (item.href === "/dashboard/senhas" &&
              pathname?.startsWith("/dashboard/senhas"));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
