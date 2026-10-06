"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

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

import {

  buildAuthorizationSlugLabelMap,

  humanLabelForAuthorizationSlug,

} from "@/lib/access-menu-permission.util";

import { MenuBasedPermissionEditor } from "@/components/dashboard/access/MenuBasedPermissionEditor";

import {

  FunctionAdminPanel,

  type PlatformFunctionRow,

} from "@/components/dashboard/access/FunctionAdminPanel";

import {
  AccessNewUserForm,
  type AccessNewUserSuccess,
} from "@/components/dashboard/access/AccessNewUserForm";



type TabId = "usuarios" | "funcoes" | "auditoria";



interface AccessAdminUserRow {

  id: string;

  email: string;

  name: string | null;

  role: string | null;

  platformFunctionId: string | null;

  platformFunctionName: string | null;

  tenantNames: string[];

  blocked: boolean;

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

  { id: "auditoria", label: "Auditoria" },

];



function ResourceError({ message, onRetry }: { message: string; onRetry: () => void }) {

  return (

    <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">

      <p className="text-destructive">{message}</p>

      <Button type="button" variant="outline" size="sm" className="mt-2 min-h-[44px]" onClick={onRetry}>

        Tentar novamente

      </Button>

    </div>

  );

}



function SlugSummaryList({

  slugs,

  labelMap,

  emptyHint,

}: {

  slugs: string[];

  labelMap: Map<string, string>;

  emptyHint: string;

}) {

  if (slugs.length === 0) {

    return <p className="text-sm text-muted-foreground">{emptyHint}</p>;

  }

  return (

    <ul className="max-h-36 space-y-1 overflow-y-auto text-sm">

      {slugs.map((s) => (

        <li key={s}>{humanLabelForAuthorizationSlug(s, labelMap)}</li>

      ))}

    </ul>

  );

}



export default function PessoasAcessosPage() {

  const searchParams = useSearchParams();

  const { isSuperAdmin, isCompanyAdmin, loading: authLoading } = useAuth();

  const canManageAccess = isSuperAdmin || isCompanyAdmin;

  const initialTab = (searchParams.get("tab") as TabId | null) ?? "usuarios";

  const [tab, setTab] = useState<TabId>(

    TABS.some((t) => t.id === initialTab) ? initialTab : "usuarios",

  );

  useEffect(() => {
    const q = searchParams.get("tab") as TabId | null;
    if (q && TABS.some((t) => t.id === q)) setTab(q);
  }, [searchParams]);

  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);



  const slugLabelMap = useMemo(() => buildAuthorizationSlugLabelMap(), []);



  const [functions, setFunctions] = useState<PlatformFunctionRow[]>([]);

  const [users, setUsers] = useState<AccessAdminUserRow[]>([]);



  const [usersLoading, setUsersLoading] = useState(false);

  const [functionsLoading, setFunctionsLoading] = useState(false);

  const [usersError, setUsersError] = useState<string | null>(null);

  const [functionsError, setFunctionsError] = useState<string | null>(null);



  const [selectedUserId, setSelectedUserId] = useState("");

  const [userBreakdown, setUserBreakdown] = useState<AccessBreakdown | null>(null);

  const [userBreakdownError, setUserBreakdownError] = useState<string | null>(null);
  const [userDetailTick, setUserDetailTick] = useState(0);

  const [userFunctionId, setUserFunctionId] = useState("");

  const [userAllow, setUserAllow] = useState<Set<string>>(new Set());

  const [userDeny, setUserDeny] = useState<Set<string>>(new Set());



  const [audit, setAudit] = useState<{

    cup360: Array<{ id: string; createdAt: string; actorEmail: string | null; changeType: string; targetLabel: string | null }>;

    matrix: Array<{ id: string; createdAt: string; actorEmail: string | null; changeCount: number }>;

  }>({ cup360: [], matrix: [] });



  const showFeedback = (title: string, message: string) => setFeedback({ title, message });



  const loadUsers = useCallback(async () => {

    setUsersLoading(true);

    setUsersError(null);

    try {

      const res = await fetch("/api/settings/access/users", { credentials: "include" });

      if (!res.ok) {

        setUsersError("Não foi possível carregar a lista de usuários.");

        return;

      }

      const data = await res.json();

      if (!Array.isArray(data)) {

        setUsersError("Resposta inválida ao carregar usuários.");

        return;

      }

      setUsers(data);

    } catch {

      setUsersError("Não foi possível carregar a lista de usuários.");

    } finally {

      setUsersLoading(false);

    }

  }, []);



  const loadFunctions = useCallback(async () => {

    setFunctionsLoading(true);

    setFunctionsError(null);

    try {

      const res = await fetch("/api/settings/access/functions", { credentials: "include" });

      if (!res.ok) {

        setFunctionsError("Não foi possível carregar as funções.");

        return;

      }

      const data = await res.json();

      if (!Array.isArray(data)) {

        setFunctionsError("Resposta inválida ao carregar funções.");

        return;

      }

      setFunctions(data);

    } catch {

      setFunctionsError("Não foi possível carregar as funções.");

    } finally {

      setFunctionsLoading(false);

    }

  }, []);



  const reloadFunctions = useCallback(async () => {

    await loadFunctions();

  }, [loadFunctions]);



  useEffect(() => {

    if (authLoading || !canManageAccess) return;

    void loadUsers();

    void loadFunctions();

  }, [authLoading, canManageAccess, loadUsers, loadFunctions]);



  useEffect(() => {

    if (!selectedUserId) {

      setUserBreakdown(null);

      setUserBreakdownError(null);

      return;

    }

    setUserBreakdownError(null);

    fetch(`/api/settings/access/users/${encodeURIComponent(selectedUserId)}`, { credentials: "include" })

      .then(async (r) => {

        if (!r.ok) {

          setUserBreakdownError("Não foi possível carregar o acesso deste usuário.");

          setUserBreakdown(null);

          return null;

        }

        return r.json() as Promise<AccessBreakdown>;

      })

      .then((data) => {

        if (!data) return;

        setUserBreakdown(data);

        setUserFunctionId(data.platformFunctionId ?? "");

        setUserAllow(new Set(data.allowSlugs));

        setUserDeny(new Set(data.denySlugs));

      })

      .catch(() => {

        setUserBreakdownError("Não foi possível carregar o acesso deste usuário.");

      });

  }, [selectedUserId, userDetailTick]);



  useEffect(() => {

    if (tab !== "auditoria") return;

    fetch("/api/settings/access/audit", { credentials: "include" })

      .then((r) => (r.ok ? r.json() : { cup360: [], matrix: [] }))

      .then(setAudit);

  }, [tab]);



  const activeFunctions = functions.filter((f) => f.isActive);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;



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

    showFeedback("Restaurado", "Exceções removidas — permanecem função e perfil herdado.");

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

    setUserAllow(new Set(data.allowSlugs));

    setUserDeny(new Set(data.denySlugs));

    showFeedback("Salvo", "Acesso do usuário atualizado.");

  };



  const toggleAllow = useCallback((slug: string, on: boolean) => {

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

  }, []);



  const toggleDeny = useCallback((slug: string, on: boolean) => {

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

  }, []);



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

          <CardContent className="space-y-4">

            {functionsError ? (

              <ResourceError message={functionsError} onRetry={() => void loadFunctions()} />

            ) : null}

            {functionsLoading && functions.length === 0 ? (

              <p className="text-sm text-muted-foreground">Carregando funções…</p>

            ) : (

              <FunctionAdminPanel

                functions={functions}

                onReload={reloadFunctions}

                onFeedback={showFeedback}

                showTechnicalDetails={isSuperAdmin}

                readOnly={!isSuperAdmin}

              />

            )}

          </CardContent>

        </Card>

      )}



      {tab === "usuarios" && (

        <Card>

          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

            <CardTitle>Usuários</CardTitle>

            <AccessNewUserForm
              isSuperAdmin={isSuperAdmin}
              onFeedback={showFeedback}
              onCreated={(user: AccessNewUserSuccess) => {
                void loadUsers();
                setSelectedUserId(user.id);
                setUserDetailTick((t) => t + 1);
              }}
            />

          </CardHeader>

          <CardContent className="space-y-4">

            {usersError ? (

              <ResourceError message={usersError} onRetry={() => void loadUsers()} />

            ) : null}

            <div>

              <Label className="text-sm">Usuário</Label>

              <NativeSelectField

                className="mt-1 w-full max-w-none lg:max-w-xl"

                value={selectedUserId}

                onChange={(e) => setSelectedUserId(e.target.value)}

                placeholder={usersLoading ? "Carregando…" : "Selecione…"}

                options={users.map((u) => ({

                  value: u.id,

                  label: u.name ? `${u.name} (${u.email})` : u.email,

                }))}

                disabled={usersLoading && users.length === 0}

              />

            </div>

            {selectedUser ? (

              <div className="rounded-md border border-border px-3 py-2 text-sm">

                <p className="font-medium text-foreground">{selectedUser.name ?? selectedUser.email}</p>

                <p className="text-muted-foreground">{selectedUser.email}</p>

                {selectedUser.tenantNames.length > 0 ? (

                  <p className="mt-1 text-xs text-muted-foreground">

                    Empresas: {selectedUser.tenantNames.join(", ")}

                  </p>

                ) : null}

              </div>

            ) : null}

            {userBreakdownError ? (

              <ResourceError

                message={userBreakdownError}

                onRetry={() => setUserDetailTick((t) => t + 1)}

              />

            ) : null}

            {userBreakdown ? (

              <>

                <p className="text-sm text-muted-foreground">

                  Os acessos efetivos combinam o perfil existente, a função e as exceções individuais.

                </p>

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

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <div className="rounded-md border border-border p-3">

                    <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Herdado</p>

                    <SlugSummaryList

                      slugs={userBreakdown.inheritedSlugs}

                      labelMap={slugLabelMap}

                      emptyHint="Nenhum acesso herdado."

                    />

                  </div>

                  <div className="rounded-md border border-border p-3">

                    <p className="mb-2 text-xs font-semibold uppercase text-emerald-500">Permitido</p>

                    <SlugSummaryList

                      slugs={[...userAllow]}

                      labelMap={slugLabelMap}

                      emptyHint="Sem exceções de permissão."

                    />

                  </div>

                  <div className="rounded-md border border-border p-3">

                    <p className="mb-2 text-xs font-semibold uppercase text-red-400">Negado</p>

                    <SlugSummaryList

                      slugs={[...userDeny]}

                      labelMap={slugLabelMap}

                      emptyHint="Sem exceções de negação."

                    />

                  </div>

                  <div className="rounded-md border border-border p-3">

                    <p className="mb-2 text-xs font-semibold uppercase text-primary">Efetivo</p>

                    <p className="mb-2 text-sm font-medium">{userBreakdown.effectiveSlugs.length} acesso(s)</p>

                    <SlugSummaryList

                      slugs={userBreakdown.effectiveSlugs}

                      labelMap={slugLabelMap}

                      emptyHint="Nenhum acesso efetivo."

                    />

                  </div>

                </div>

                <MenuBasedPermissionEditor

                  variant="user"

                  inheritedSlugs={userBreakdown.inheritedSlugs}

                  allow={userAllow}

                  deny={userDeny}

                  onToggleAllow={toggleAllow}

                  onToggleDeny={toggleDeny}

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

            ) : null}

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

