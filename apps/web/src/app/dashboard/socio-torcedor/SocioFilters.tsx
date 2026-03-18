"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { isFootballKind } from "@/lib/home-data";

interface Tenant {
  id: string;
  name: string;
  slug?: string;
  kind?: { id: string; name: string };
}

/** Sócio Torcedor é só para clubes de futebol. Exclui construtoras, real estate, etc. */
function isClubForSocio(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (!isFootballKind(kindName)) return false;
  // Exclui tipos que não são clubes de futebol
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

const SOCIO_BASE = "/dashboard/socio-torcedor";

export function SocioFilters({
  tenantId,
  onTenantChange,
  basePath = SOCIO_BASE,
}: {
  tenantId: string;
  onTenantChange?: (id: string) => void;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list.filter((t) => isClubForSocio(t.kind?.name)));
    });
  }, []);

  useEffect(() => {
    const t = searchParams.get("tenantId") ?? "";
    onTenantChange?.(t);
  }, [searchParams, onTenantChange]);

  const handleTenantChange = (value: string) => {
    const next = value === "all" ? "" : value;
    const params = new URLSearchParams();
    if (next) params.set("tenantId", next);
    router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
    onTenantChange?.(next);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Clube</h3>
        <Select
          value={tenantId || "all"}
          onValueChange={handleTenantChange}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Selecione o clube" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clubes</SelectItem>
            {tenants.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
