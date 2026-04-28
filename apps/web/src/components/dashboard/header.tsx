"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import type { Group } from "@/types/group";
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const [group, setGroup] = useState<Group | null>(null);
  const { user } = useAuth();

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
    <header className="flex h-16 min-w-0 items-center justify-between gap-4 border-b border-border bg-card/95 backdrop-blur-sm px-4 sm:px-6 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <img
            src="/bcg-logo.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
        <span className="truncate text-sm font-semibold tracking-tight">
          <span className="text-muted-foreground font-medium">Dashboard</span>
          <span className="text-foreground mx-1.5">·</span>
          {name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="transition-all duration-200 hover:shadow-md active:scale-[0.98] gap-1.5"
        >
          <a href="/" target="_blank" rel="noopener noreferrer" title="Abrir home do grupo em nova aba">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Ver site</span>
          </a>
        </Button>
        <span className="hidden max-w-[220px] truncate text-sm text-muted-foreground sm:inline" title={displayUser}>
          {displayUser}
        </span>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="transition-all duration-200 hover:bg-accent/80"
        >
          <a href="/api/auth/logout">Sair</a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        >
          <Link href="/dashboard">Início</Link>
        </Button>
      </div>
    </header>
  );
}
