"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ClipboardList, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Tenant } from "@/types/tenant";
import { AssistenciaSocialCasesPanel } from "@/components/dashboard/assistencia-social/AssistenciaSocialCasesPanel";
import { AssistenciaSocialRosterPanel } from "@/components/dashboard/assistencia-social/AssistenciaSocialRosterPanel";

type TabId = "casos" | "elenco" | "documentos";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "casos", label: "Casos", icon: ClipboardList },
  { id: "elenco", label: "Validação elenco", icon: Users },
  { id: "documentos", label: "Documentos", icon: FileText },
];

interface PlayerOption {
  id: string;
  name: string;
  jerseyNumber: number | null;
  category?: string | null;
}

export default function AssistenciaSocialPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("casos");
  const [tenantId, setTenantId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);

  const loadTenants = useCallback(async () => {
    try {
      const { data } = await api.get<Tenant[]>("/tenants");
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      setTenants([]);
    }
  }, []);

  const loadPlayers = useCallback(async () => {
    if (!tenantId) {
      setPlayers([]);
      return;
    }
    try {
      const { data } = await api.get<PlayerOption[]>(`/players?tenantId=${encodeURIComponent(tenantId)}`);
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!canAccessModule("futebol_assistencia_social") && !authLoading) return;
    loadTenants();
  }, [canAccessModule, authLoading, loadTenants]);

  useEffect(() => {
    loadPlayers();
  }, [tenantId, loadPlayers]);

  if (!canAccessModule("futebol_assistencia_social") && !authLoading) {
    router.replace("/403");
    return null;
  }

  const effectiveTenantId = tenantId || (tenants[0]?.id ?? "");
  const tenantName = tenants.find((t) => t.id === effectiveTenantId)?.name;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-muted-foreground" />
            <CardTitle>Assistência Social / Pedagogia</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 min-w-[200px] max-w-xs">
            <label className="text-sm font-medium text-muted-foreground">Clube/Empresa</label>
            <Select value={tenantId || "__all__"} onValueChange={(v) => setTenantId(v === "__all__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 border-b flex-wrap">
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon className="h-4 w-4 mr-1" />
                {tab.label}
              </Button>
            ))}
          </div>

          {activeTab === "casos" && (
            <AssistenciaSocialCasesPanel tenantId={effectiveTenantId} players={players} />
          )}
          {activeTab === "elenco" && (
            <AssistenciaSocialRosterPanel tenantId={effectiveTenantId} tenantName={tenantName} />
          )}
          {activeTab === "documentos" && (
            <p className="text-sm text-muted-foreground py-4">
              Documentos escolares ficam na ficha de cada atleta (aba Assistência Social) e vinculados aos casos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
