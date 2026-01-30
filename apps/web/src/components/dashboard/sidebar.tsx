"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Image,
  Settings,
  Newspaper,
  Tag,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Empresas",
    href: "/dashboard/empresas",
    icon: Building2,
  },
  {
    title: "Tipos",
    href: "/dashboard/tipos",
    icon: Tag,
  },
  {
    title: "Páginas",
    href: "/dashboard/paginas",
    icon: FileText,
  },
  {
    title: "Notícias",
    href: "/dashboard/noticias",
    icon: Newspaper,
  },
  {
    title: "Mídia",
    href: "/dashboard/midia",
    icon: Image,
  },
  {
    title: "Configurações",
    href: "/dashboard/configuracoes",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">BCG Platform</span>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Considera ativo se a rota atual corresponde ou é /dashboard/tenants (rota técnica)
          const isActive = pathname === item.href || 
            (item.href === "/dashboard/empresas" && pathname?.startsWith("/dashboard/tenants"));

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
