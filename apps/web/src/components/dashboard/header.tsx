"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Group } from "@/types/group";

export function Header() {
  const [group, setGroup] = useState<Group | null>(null);

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

  return (
    <header className="flex h-16 min-w-0 items-center justify-between gap-4 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
        <img
          src="/bcg-logo.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain rounded"
        />
        <span className="truncate text-sm font-medium">
          <span className="text-muted-foreground">Dashboard</span> · {name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="hidden truncate text-sm text-muted-foreground sm:inline">
          Dashboard · {name}
        </span>
        <Button variant="ghost" size="sm" asChild>
          <a href="/api/auth/logout">Sair</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </header>
  );
}
