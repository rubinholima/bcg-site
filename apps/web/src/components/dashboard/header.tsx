"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getHostedUiLogoutUrl } from "@/lib/cognito-hosted-ui";
import { Button } from "@/components/ui/button";
import type { Group } from "@/types/group";

export function Header() {
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
  const logoUrl = logoError ? undefined : group?.logoUrl ?? undefined;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-8 w-8 object-contain rounded flex-shrink-0"
            onError={() => setLogoError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground flex-shrink-0 text-xs font-bold">
            {name.charAt(0)}
          </div>
        )}
        <span className="text-sm font-medium">
          <span className="text-muted-foreground">Dashboard</span> · {name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          Dashboard · {name}
        </span>
        <Button variant="ghost" size="sm" asChild>
          <a href={getHostedUiLogoutUrl()}>Sair</a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </header>
  );
}
