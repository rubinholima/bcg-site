"use client";

import Link from "next/link";
import { ArrowLeft, Server } from "lucide-react";
import { InfrastructureSubnav } from "@/components/dashboard/infraestrutura/InfrastructureSubnav";
import { useInfraAccess } from "@/components/dashboard/infraestrutura/InfrastructureShared";

export default function InfraestruturaLayout({ children }: { children: React.ReactNode }) {
  const { allowed, loading } = useInfraAccess();
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Carregando...
      </div>
    );
  }
  if (!allowed) return null;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard/requisicoes/ti"
            className="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Atendimento
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-semibold truncate">
            <Server className="h-5 w-5 text-sky-400 shrink-0" />
            Infraestrutura TI
          </h1>
        </div>
      </div>
      <InfrastructureSubnav />
      {children}
    </div>
  );
}
