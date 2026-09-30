"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";
import { buildModuleCatalog } from "@/lib/dashboard-menu.config";
import { AccessPermissionEditor } from "@/components/dashboard/access/AccessPermissionEditor";
import {
  FunctionAdminPanel,
  type PlatformFunctionRow,
} from "@/components/dashboard/access/FunctionAdminPanel";
type TabId = "usuarios" | "funcoes" | "acessos" | "auditoria";

interface ModuleRow {
  slug: string;
  name: string;
  functionalArea: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
}

interface AccessBreakdown {
  userId: string;
  role: string;
  platformFunctionId: string | null;
  platformFunctionName: string | null;
  inheritedSlugs: string[];
  allowSlugs: string[];
  denySlugs: string[];
  effectiveSlugs: string[];
}

const TABS: { id: TabId; label: string }[] = [
  { id: "usuarios", label: "Usuários" },
  { id: "funcoes", label: "Funções" },
  { id: "acessos", label: "Acessos" },
  { id: "auditoria", label: "Auditoria" },
];

function moduleLabel(slug: string): string {
  return MODULE_DISPLAY_NAMES[slug] ?? slug;
}

export default function PessoasAcessosPage() {
  const searchParams = useSearchParams();
  const { isSuperAdmin, isCompanyAdmin, loading: authLoading } = useAuth();
  const canManageAccess = isSuperAdmin || isCompanyAdmin;
  const initialTab = (searchParams.get("tab") as TabId | null) ?? "usuarios";
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "usuarios",
  );
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const [functions, setFunctions] = useState<PlatformFunctionRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [userBreakdown, setUserBreakdown] = useState<AccessBreakdown | null>(null);
  const [userFunctionId, setUserFunctionId] = useState("");
  const [userAllow, setUserAllow] = useState<Set<string>>(new Set());
  const [userDeny, setUserDeny] = useState<Set<string>>(new Set());

  const [audit, setAudit] = useState<{
    cup360: Array<{ id: string; createdAt: string; actorEmail: string | null; changeType: string; targetLabel: string | null }>;
    matrix: Array<{ id: string; createdAt: string; actorEmail: string | null; changeCount: number }>;
  }>({ cup360: [], matrix: [] });

  const showFeedback = (title: string, message: string) => setFeedback({ title, message });

  const loadBase = useCallback(async () => {
    await fetch("/api/settings/modules/sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalog: buildModuleCatalog() }),
    });
    const [fnRes, modRes, usersRes] = await Promise.all([
      fetch("/api/settings/access/functions", { credentials: "include" }),
      fetch("/api/settings/access/modules", { credentials: "include" }),
      fetch("/api/users?limit=500", { credentials: "include" }),
    ]);
    if (fnRes.ok) setFunctions(await fnRes.json());
    if (modRes.ok) setModules(await modRes.json());
    if (usersRes.ok) {
      const data = await usersRes.json();
      setUsers(Array.isArray(data) ? data : data.users ?? []);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !canManageAccess) return;
    loadBase().catch(() =>
      showFeedback("Erro", "Não foi possível carregar pessoas e acessos."),
    );
  }, [authLoading, canManageAccess, loadBase]);

  useEffect(() => {
    if (!selectedUserId) {
      setUserBreakdown(null);
      return;
    }
    fetch(`/api/settings/access/users/${encodeURIComponent(selectedUserId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AccessBreakdown | null) => {
        if (!data) return;
        setUserBreakdown(data);
        setUserFunctionId(data.platformFunctionId ?? "");
        setUserAllow(new Set(data.allowSlugs));
        setUserDeny(new Set(data.denySlugs));
      });
  }, [selectedUserId]);

  useEffect(() => {
    if (tab !== "auditoria") return;
    fetch("/api/settings/access/audit", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { cup360: [], matrix: [] }))
      .then(setAudit);
  }, [tab]);

  const activeFunctions = functions.filter((f) => f.isActive);

  const restoreUserDefaults = async () => {
    if (!selectedUserId) return;
    const res = await fetch(
      `/api/settings/access/users/${encodeURIComponent(selectedUserId)}/restore-function-defaults`,
      { method: "POST", credentials: "include" },
    );
    if (!res.ok) {
      showFeedback("Erro", "Não foi possível restaurar os padrões da função.");
      return;
    }
    const data = await res.json();
    setUserBreakdown(data);
    setUserAllow(new Set());
    setUserDeny(new Set());
    showFeedback("Restaurado", "Exceções removidas — só permanece o padrão da função.");
  };

  const saveUser = async () => {
    if (!selectedUserId) return;
    const res = await fetch(`/api/settings/access/users/${encodeURIComponent(selectedUserId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platformFunctionId: userFunctionId || null,
        allowSlugs: [...userAllow],
        denySlugs: [...userDeny],
      }),
    });
    if (!res.ok) {
      showFeedback("Erro", "Não foi possível salvar o usuário.");
      return;
    }
    const data = await res.json();
    setUserBreakdown(data);
    showFeedback("Salvo", "Acesso do usuário atualizado.");
  };

  if (!authLoading && !canManageAccess) {
    return (
      <Cup360PageShell>
        <p className="text-muted-foreground">Acesso restrito.</p>
      </Cup360PageShell>
    );
  }

  return (
    <Cup360PageShell className="mx-auto w-full max-w-[1600px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button variant="ghost" size="sm" className="w-fit shrink-0" asChild>
          <Link href="/dashboard/configuracoes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              className="min-h-[44px] shrink-0 sm:min-h-9"
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      </div>

      {tab === "funcoes" && (
        <Card>
          <CardHeader>
            <CardTitle>Funções</CardTitle>
          </CardHeader>
          <CardContent>
            <FunctionAdminPanel
              functions={functions}
              modules={modules}
              onReload={loadBase}
              onFeedback={showFeedback}
              showTechnicalDetails={isSuperAdmin}
            />
          </CardContent>
        </Card>
      )}

      {tab === "usuarios" && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm">Usuário</Label>
              <NativeSelectField
                className="mt-1 w-full max-w-none lg:max-w-xl"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                placeholder="Selecione…"
                options={users.map((u) => ({
                  value: u.id,
                  label: u.name ? `${u.name} (${u.email})` : u.email,
                }))}
              />
            </div>
            {userBreakdown && (
              <>
                <div>
                  <Label className="text-sm">Função</Label>
                  <NativeSelectField
                    className="mt-1 w-full max-w-none lg:max-w-xl"
                    value={userFunctionId}
                    onChange={(e) => setUserFunctionId(e.target.value)}
                    placeholder="Selecione…"
                    options={activeFunctions.map((f) => ({ value: f.id, label: f.name }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <div className="rounded-md border border-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Herdado</p>
                    <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">
                      {userBreakdown.inheritedSlugs.map((s) => (
                        <li key={s}>{moduleLabel(s)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-border p-3">
                    <p className="mb-2 text-xs font-semibold uppercase text-emerald-500">Adições</p>
                    <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">
                      {[...userAllow].map((s) => (
                        <li key={s}>{moduleLabel(s)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-md border border-border p-3 sm:col-span-2 xl:col-span-1">
                    <p className="mb-2 text-xs font-semibold uppercase text-red-400">Remoções</p>
                    <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">
                      {[...userDeny].map((s) => (
                        <li key={s}>{moduleLabel(s)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Efetivo: {userBreakdown.effectiveSlugs.length} área(s)
                </p>
                <AccessPermissionEditor
                  variant="user"
                  modules={modules}
                  inherited={new Set(userBreakdown.inheritedSlugs)}
                  allow={userAllow}
                  deny={userDeny}
                  onToggleAllow={(slug, on) => {
                    setUserAllow((p) => {
                      const n = new Set(p);
                      if (on) n.add(slug);
                      else n.delete(slug);
                      return n;
                    });
                    if (on) {
                      setUserDeny((p) => {
                        const n = new Set(p);
                        n.delete(slug);
                        return n;
                      });
                    }
                  }}
                  onToggleDeny={(slug, on) => {
                    setUserDeny((p) => {
                      const n = new Set(p);
                      if (on) n.add(slug);
                      else n.delete(slug);
                      return n;
                    });
                    if (on) {
                      setUserAllow((p) => {
                        const n = new Set(p);
                        n.delete(slug);
                        return n;
                      });
                    }
                  }}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button variant="outline" className="min-h-[44px]" onClick={restoreUserDefaults}>
                    Restaurar padrões da função
                  </Button>
                  <Button className="min-h-[44px]" onClick={saveUser}>
                    Salvar usuário
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "acessos" && (
        <Card>
          <CardHeader>
            <CardTitle>Acessos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Catálogo da plataforma ({modules.length} áreas). Novos módulos entram negados até marcar na função.
            </p>
            <ul className="mt-3 max-h-[60vh] columns-1 gap-x-8 text-sm md:columns-2 xl:columns-3">
              {modules.map((m) => (
                <li key={m.slug} className="break-inside-avoid py-0.5">
                  {moduleLabel(m.slug)}{" "}
                  <span className="text-xs text-muted-foreground">· {m.functionalArea}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {tab === "auditoria" && (
        <Card>
          <CardHeader>
            <CardTitle>Auditoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {audit.cup360.map((e) => (
                <li key={e.id} className="rounded-md border border-border px-3 py-2">
                  {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.actorEmail ?? "—"} · {e.changeType}{" "}
                  {e.targetLabel ? `· ${e.targetLabel}` : ""}
                </li>
              ))}
              {audit.matrix.map((e) => (
                <li key={e.id} className="rounded-md border border-border px-3 py-2 opacity-80">
                  Legado matriz · {new Date(e.createdAt).toLocaleString("pt-BR")} · {e.actorEmail ?? "—"} ·{" "}
                  {e.changeCount} célula(s)
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </Cup360PageShell>
  );
}
