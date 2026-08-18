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
import { reportLogoUrlForPrint } from "@/lib/futebol-relatorios-print";
import { Tenant } from "@/types/tenant";
import { AssistenciaSocialCasesPanel } from "@/components/dashboard/assistencia-social/AssistenciaSocialCasesPanel";
import { AssistenciaSocialRosterPanel } from "@/components/dashboard/assistencia-social/AssistenciaSocialRosterPanel";
import { AssistenciaSocialDocumentsPanel } from "@/components/dashboard/assistencia-social/AssistenciaSocialDocumentsPanel";
import { AssistenciaSocialAptoNotifications } from "@/components/dashboard/assistencia-social/AssistenciaSocialAptoNotifications";

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

  useEffect(() => {
    if (tenants.length === 1 && !tenantId) {
      setTenantId(tenants[0].id);
    }
  }, [tenants, tenantId]);

  if (!canAccessModule("futebol_assistencia_social") && !authLoading) {
    router.replace("/403");
    return null;
  }

  const selectedTenant = tenants.find((t) => t.id === tenantId);
  const tenantName = selectedTenant?.name;
  const tenantCategories = selectedTenant?.categories ?? null;
  const tenantLogoUrl = reportLogoUrlForPrint(selectedTenant?.logoUrl, !tenantId);

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
            <Select value={tenantId || undefined} onValueChange={setTenantId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o clube…" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tenantId ? <AssistenciaSocialAptoNotifications tenantId={tenantId} /> : null}

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
            <AssistenciaSocialCasesPanel
              tenantId={tenantId}
              tenantCategories={tenantCategories}
              players={players}
            />
          )}
          {activeTab === "elenco" && (
            <AssistenciaSocialRosterPanel
              tenantId={tenantId}
              tenantName={tenantName}
              tenantLogoUrl={tenantLogoUrl}
              tenantCategories={tenantCategories}
            />
          )}
          {activeTab === "documentos" && (
            <AssistenciaSocialDocumentsPanel
              tenantId={tenantId}
              tenantCategories={tenantCategories}
              players={players}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
