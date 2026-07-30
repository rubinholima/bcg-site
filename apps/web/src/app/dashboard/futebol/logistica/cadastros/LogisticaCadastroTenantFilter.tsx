"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
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
  kind?: { name: string };
}

function isClubForLogistica(kindName: string | null | undefined): boolean {
  if (!kindName) return false;
  const k = kindName.toLowerCase();
  if (!isFootballKind(kindName)) return false;
  if (k.includes("construtora") || k.includes("real estate") || k.includes("construção")) return false;
  return true;
}

export function LogisticaCadastroTenantFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setTenants(list.filter((t) => isClubForLogistica(t.kind?.name)));
    });
  }, []);

  const tenantId = searchParams.get("tenantId") ?? "";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") params.set("tenantId", value);
    else params.delete("tenantId");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-2 max-w-xs">
          <Label className="text-sm text-muted-foreground">Clube</Label>
          <Select value={tenantId || "all"} onValueChange={handleChange}>
            <SelectTrigger className="min-h-[44px]">
              <SelectValue placeholder="Selecione o clube…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Selecione um clube…</SelectItem>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

export function useLogisticaTenantId(): string {
  const searchParams = useSearchParams();
  return searchParams.get("tenantId") ?? "";
}
