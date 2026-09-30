"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectField } from "@/components/ui/native-select";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { useAuth } from "@/context/AuthContext";
import { MODULE_DISPLAY_NAMES } from "@/lib/dashboard-labels";
import { buildModuleCatalog } from "@/lib/dashboard-menu.config";
import { AccessPermissionEditor } from "@/components/dashboard/access/AccessPermissionEditor";

type TabId = "usuarios" | "funcoes" | "acessos" | "auditoria";

interface PlatformFunction {
  id: string;
  name: string;
  platformLegacyRole: string | null;
  moduleDefaults: Array<{ module: { slug: string; name: string; functionalArea: string } }>;
  _count: { platformUsers: number };
}

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
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<TabId>("usuarios");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const [functions, setFunctions] = useState<PlatformFunction[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedFunctionId, setSelectedFunctionId] = useState("");
  const [functionModuleSlugs, setFunctionModuleSlugs] = useState<Set<string>>(new Set());
  const [moduleSearch, setModuleSearch] = useState("");

  const [selectedUserId, setSelectedUserId] = useState("");
  const [userBreakdown, setUserBreakdown] = useState<AccessBreakdown | null>(null);
  const [userFunctionId, setUserFunctionId] = useState("");
  const [userAllow, setUserAllow] = useState<Set<string>>(new Set());
  const [userDeny, setUserDeny] = useState<Set<string>>(new Set());

  const [audit, setAudit] = useState<{
    cup360: Array<{ id: string; createdAt: string; actorEmail: string | null; changeType: string; targetLabel: string | null }>;
    matrix: Array<{ id: string; createdAt: string; actorEmail: string | null; changeCount: number }>;
  }>({ cup360: [], matrix: [] });

  const groupedModules = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    const filtered = modules.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q) ||
        m.functionalArea.toLowerCase().includes(q),
    );
    const map = new Map<string, ModuleRow[]>();
    for (const m of filtered) {
      const area = m.functionalArea || "outros";
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(m);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [modules, moduleSearch]);

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
    if (authLoading || !isSuperAdmin) return;
    loadBase().catch(() =>
      setFeedback({ title: "Erro", message: "Não foi possível carregar pessoas e acessos." }),
    );
  }, [authLoading, isSuperAdmin, loadBase]);

  useEffect(() => {
    if (!selectedFunctionId) return;
    const fn = functions.find((f) => f.id === selectedFunctionId);
    if (!fn) return;
    setFunctionModuleSlugs(new Set(fn.moduleDefaults.map((d) => d.module.slug)));
  }, [selectedFunctionId, functions]);

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
      .then((r) => (r.ok ? r.json() : []))
      .then(setAudit);
  }, [tab]);

  const saveFunction = async () => {
    if (!selectedFunctionId) return;
    const res = await fetch(`/api/settings/access/functions/${encodeURIComponent(selectedFunctionId)}/defaults`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleSlugs: [...functionModuleSlugs] }),
    });
    if (!res.ok) {
      setFeedback({ title: "Erro", message: "Não foi possível salvar a função." });
      return;
    }
    await loadBase();
    setFeedback({ title: "Salvo", message: "Defaults da função atualizados." });
  };

  const restoreUserDefaults = async () => {
    if (!selectedUserId) return;
    const res = await fetch(
      `/api/settings/access/users/${encodeURIComponent(selectedUserId)}/restore-function-defaults`,
      { method: "POST", credentials: "include" },
    );
    if (!res.ok) {
      setFeedback({ title: "Erro", message: "Não foi possível restaurar os padrões da função." });
      return;
    }
    const data = await res.json();
    setUserBreakdown(data);
    setUserAllow(new Set());
    setUserDeny(new Set());
    setFeedback({ title: "Restaurado", message: "Exceções removidas — só permanece o padrão da função." });
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
      setFeedback({ title: "Erro", message: "Não foi possível salvar o usuário." });
      return;
    }
    const data = await res.json();
    setUserBreakdown(data);
    setFeedback({ title: "Salvo", message: "Acesso do usuário atualizado." });
  };

  const toggleFunctionModule = (slug: string) => {
    setFunctionModuleSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  if (!authLoading && !isSuperAdmin) {
    return (
      <Cup360PageShell>
        <p className="text-muted-foreground">Acesso restrito.</p>
      </Cup360PageShell>
    );
  }

  return (
    <Cup360PageShell>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/configuracoes">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        {TABS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tab === t.id ? "default" : "outline"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {tab === "funcoes" && (
        <Card>
          <CardHeader>
            <CardTitle>Funções</CardTitle>
          </CardHeader>
          <CardContent>
          <Label className="text-sm">Função</Label>
          <NativeSelectField
            className="mt-1 max-w-lg"
            value={selectedFunctionId}
            onChange={(e) => setSelectedFunctionId(e.target.value)}
            placeholder="Selecione…"
            options={functions.map((f) => ({
              value: f.id,
              label: `${f.name} (${f._count.platformUsers} usuários)`,
            }))}
          />
          <div className="mt-4">
            <AccessPermissionEditor
              modules={modules}
              inherited={new Set()}
              allow={functionModuleSlugs}
              deny={new Set()}
              onToggleAllow={(slug, on) => {
                setFunctionModuleSlugs((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(slug);
                  else next.delete(slug);
                  return next;
                });
              }}
              onToggleDeny={() => {}}
            />
          </div>
          <Button className="mt-4" disabled={!selectedFunctionId} onClick={saveFunction}>
            Salvar função
          </Button>
          </CardContent>
        </Card>
      )}

      {tab === "usuarios" && (
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent>
          <Label className="text-sm">Usuário</Label>
          <NativeSelectField
            className="mt-1 max-w-lg"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            placeholder="Selecione…"
            options={users.map((u) => ({
              value: u.id,
              label: u.name ? `${u.name} (${u.email})` : u.email,
            }))}
          />
          {userBreakdown && (
            <>
              <Label className="mt-3 block text-sm">Função</Label>
              <NativeSelectField
                className="mt-1 max-w-lg"
                value={userFunctionId}
                onChange={(e) => setUserFunctionId(e.target.value)}
                placeholder="Selecione…"
                options={functions.map((f) => ({ value: f.id, label: f.name }))}
              />
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Herdado</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                    {userBreakdown.inheritedSlugs.map((s) => (
                      <li key={s}>{moduleLabel(s)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-emerald-500">Adições</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                    {[...userAllow].map((s) => (
                      <li key={s}>{moduleLabel(s)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-red-400">Remoções</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                    {[...userDeny].map((s) => (
                      <li key={s}>{moduleLabel(s)}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Efetivo: {userBreakdown.effectiveSlugs.length} área(s)
              </p>
              <AccessPermissionEditor
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
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={restoreUserDefaults}>
                  Restaurar padrões da função
                </Button>
                <Button onClick={saveUser}>Salvar usuário</Button>
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
            Catálogo sincronizado com os módulos da plataforma ({modules.length} áreas). Novos módulos entram
            negados até configurar na aba Funções.
          </p>
          <ul className="mt-3 max-h-[60vh] space-y-1 overflow-y-auto text-sm">
            {modules.map((m) => (
              <li key={m.slug}>
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
