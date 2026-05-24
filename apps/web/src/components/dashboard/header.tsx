"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CircleHelp, Home, Menu, PanelLeftClose } from "lucide-react";
import type { Group } from "@/types/group";
import { useAuth } from "@/context/AuthContext";
import { useDashboardShell } from "@/context/DashboardShellContext";

export function Header() {
  const [group, setGroup] = useState<Group | null>(null);
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar } = useDashboardShell();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/group", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Group | null) => {
        if (!cancelled && data) setGroup(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const name = group?.name ?? "Grupo Master";
  const displayUser = user?.name?.trim() || user?.email || "Usuário";

  return (
    <header className="flex h-14 min-w-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-3 backdrop-blur-sm shadow-sm sm:h-16 sm:gap-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 lg:hidden"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20 sm:h-9 sm:w-9">
          <img
            src="/bcg-logo.png"
            alt=""
            width={28}
            height={28}
            className="h-6 w-6 object-contain sm:h-7 sm:w-7"
          />
        </div>
        <span className="min-w-0 truncate text-xs font-semibold tracking-tight sm:text-sm">
          <span className="font-medium text-muted-foreground">Dashboard</span>
          <span className="mx-1 text-foreground">·</span>
          <span className="text-foreground">{name}</span>
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          title="Manual da plataforma"
        >
          <Link href="/dashboard/manual" aria-label="Abrir manual da plataforma">
            <CircleHelp className="h-5 w-5" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="icon"
          asChild
          className="h-9 w-9 shrink-0 sm:h-9 sm:w-auto sm:px-3"
        >
          <a href="/" target="_blank" rel="noopener noreferrer" title="Abrir home do grupo em nova aba">
            <Home className="h-4 w-4" />
            <span className="hidden sm:ml-1.5 sm:inline">Ver site</span>
          </a>
        </Button>
        <span
          className="hidden max-w-[140px] truncate text-sm text-muted-foreground md:inline"
          title={displayUser}
        >
          {displayUser}
        </span>
        <Button variant="ghost" size="sm" asChild className="px-2 text-xs sm:text-sm">
          <a href="/api/auth/logout">Sair</a>
        </Button>
        <Button variant="outline" size="sm" asChild className="hidden px-2 sm:inline-flex">
          <Link href="/dashboard">Início</Link>
        </Button>
      </div>
    </header>
  );
}
