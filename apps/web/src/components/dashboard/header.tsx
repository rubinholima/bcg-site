"use client";

import Link from "next/link";
import { getHostedUiLogoutUrl } from "@/lib/cognito-hosted-ui";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="text-sm font-medium text-muted-foreground">
        Boston City Group
      </div>
      <div className="flex items-center gap-2">
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
