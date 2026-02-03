"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Mail, KeyRound, Trash2, Eye, EyeOff, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LABEL_OVERRIDES: Record<string, string> = {
  bostoncitygroup: "Boston City Group",
  bostoncityfc: "Boston City FC",
  atriumproductions: "Atrium Productions",
  atriumplus: "Atrium Plus",
  americanofc: "Americano FC",
  bcg: "BCG",
  fc: "FC",
  usa: "USA",
  brasil: "Brasil",
};

function formatOrgLabel(name: string): string {
  if (!name?.trim()) return name ?? "";
  const normalized = name.trim().toLowerCase().replace(/\.(com|org|net|io)$/i, "");
  const override = LABEL_OVERRIDES[normalized];
  if (override) return override;
  const words = normalized.split(/[-_\s.]+/).filter(Boolean);
  const formatted = words.map(
    (w) => LABEL_OVERRIDES[w] ?? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
  );
  return formatted.join(" ");
}

/** Parte local do email: só antes do @, sem espaços, apenas [a-zA-Z0-9._-]. */
function sanitizeLocalPart(raw: string): string {
  let s = (raw ?? "").trim();
  if (s.includes("@")) s = s.split("@")[0].trim();
  s = s.replace(/\s/g, "");
  s = s.replace(/[^a-zA-Z0-9._-]/g, "");
  return s;
}

interface WorkmailAwsOrg {
  workmailOrganizationId: string;
  name: string;
  state?: string;
  domains?: string[];
}

interface WorkmailAccount {
  workmailUserId: string;
  name: string;
  displayName: string;
  email: string;
  state: string;
}

export default function EmailsPage() {
  const [orgs, setOrgs] = useState<WorkmailAwsOrg[]>([]);
  const [selectedWorkmailOrgId, setSelectedWorkmailOrgId] = useState<string>("");
  const [accounts, setAccounts] = useState<WorkmailAccount[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalNew, setModalNew] = useState(false);
  const [modalReset, setModalReset] = useState<WorkmailAccount | null>(null);
  const [modalDelete, setModalDelete] = useState<WorkmailAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [formNew, setFormNew] = useState({
    domain: "",
    localPart: "",
    displayName: "",
    initialPassword: "",
  });
  const [formResetPassword, setFormResetPassword] = useState({ newPassword: "" });
  const [orgDomains, setOrgDomains] = useState<{ domains: string[]; primaryDomain?: string } | null>(null);
  const [loadingDomains, setLoadingDomains] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [togglingAccountId, setTogglingAccountId] = useState<string | null>(null);

  const isOrgActive = (o: WorkmailAwsOrg) => {
    const s = (o.state ?? "ENABLED").toUpperCase();
    return s === "ENABLED" || s === "ACTIVE";
  };

  const fetchOrgs = useCallback(async () => {
    setLoadingOrgs(true);
    setError(null);
    try {
      const res = await fetch("/api/workmail/aws-orgs", { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao carregar organizações");
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setOrgs(list);
      const activeOrgs = list.filter(isOrgActive);
      if (!selectedWorkmailOrgId && activeOrgs.length > 0) {
        setSelectedWorkmailOrgId(activeOrgs[0].workmailOrganizationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar organizações");
      setOrgs([]);
    } finally {
      setLoadingOrgs(false);
    }
  }, [selectedWorkmailOrgId]);

  const fetchAccounts = useCallback(async () => {
    if (!selectedWorkmailOrgId) {
      setAccounts([]);
      return;
    }
    setLoadingAccounts(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workmail/accounts?workmailOrganizationId=${encodeURIComponent(selectedWorkmailOrgId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? data.message ?? "Erro ao carregar contas");
      }
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar contas");
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [selectedWorkmailOrgId]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const fetchDomains = useCallback(async () => {
    if (!selectedWorkmailOrgId) {
      setOrgDomains(null);
      setSelectedDomain("");
      return;
    }
    setLoadingDomains(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workmail/domains?workmailOrganizationId=${encodeURIComponent(selectedWorkmailOrgId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro ao carregar domínios");
      }
      const data = await res.json();
      const domains = Array.isArray(data.domains) ? data.domains : [];
      const primaryDomain = (data.primaryDomain ?? domains[0] ?? "").trim();
      setOrgDomains({ domains, primaryDomain });
      setSelectedDomain((primaryDomain || domains[0]) ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar domínios");
      setOrgDomains({ domains: [], primaryDomain: undefined });
      setSelectedDomain("");
    } finally {
      setLoadingDomains(false);
    }
  }, [selectedWorkmailOrgId]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const domainToUse = (formNew.domain?.trim() || selectedDomain).trim();
    if (!domainToUse) {
      setError("Domínio não configurado para esta organização.");
      return;
    }
    const localPartClean = sanitizeLocalPart(formNew.localPart);
    if (!localPartClean) {
      setError("Preencha a parte local do email (sem @), displayName e senha (mín. 8 caracteres).");
      return;
    }
    if (!formNew.displayName.trim() || formNew.initialPassword.length < 8) {
      setError("Preencha displayName e senha (mín. 8 caracteres).");
      return;
    }
    if (!selectedWorkmailOrgId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workmail/accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workmailOrganizationId: selectedWorkmailOrgId,
          domain: domainToUse,
          localPart: localPartClean,
          displayName: formNew.displayName.trim(),
          initialPassword: formNew.initialPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao criar conta");
      }
      setSuccessMessage(`Conta ${data.email ?? ""} criada com sucesso.`);
      setModalNew(false);
      setFormNew({ domain: "", localPart: "", displayName: "", initialPassword: "" });
      fetchAccounts();
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResetPassword.newPassword || formResetPassword.newPassword.length < 8) {
      setError("Nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (!modalReset || !selectedWorkmailOrgId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workmail/accounts/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workmailOrganizationId: selectedWorkmailOrgId,
          workmailUserId: modalReset.workmailUserId,
          newPassword: formResetPassword.newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao redefinir senha");
      }
      if (data.success === false) {
        throw new Error(data.message ?? "Falha ao redefinir senha");
      }
      setSuccessMessage("Senha alterada com sucesso.");
      setModalReset(null);
      setFormResetPassword({ newPassword: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir senha");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!modalDelete || !selectedWorkmailOrgId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/workmail/accounts", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workmailOrganizationId: selectedWorkmailOrgId,
          workmailUserId: modalDelete.workmailUserId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao excluir conta");
      }
      if (data.success === false) {
        throw new Error(data.message ?? "Falha ao excluir");
      }
      setSuccessMessage("Conta removida com sucesso.");
      setModalDelete(null);
      fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir conta");
    } finally {
      setSubmitting(false);
    }
  };

  const dismissSuccess = () => setSuccessMessage(null);
  const dismissError = () => setError(null);

  const availableDomainsForOrg = orgDomains?.domains ?? [];
  const primaryDomain = orgDomains?.primaryDomain ?? availableDomainsForOrg[0] ?? "";
  const hasDomainForCreate = availableDomainsForOrg.length > 0;

  const openNewEmailModal = () => {
    setFormNew({
      domain: selectedDomain || primaryDomain,
      localPart: "",
      displayName: "",
      initialPassword: "",
    });
    setModalNew(true);
  };

  const handleDisable = async (acc: WorkmailAccount) => {
    if (!selectedWorkmailOrgId) return;
    setTogglingAccountId(acc.workmailUserId);
    setError(null);
    try {
      const res = await fetch("/api/workmail/accounts/disable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workmailOrganizationId: selectedWorkmailOrgId,
          workmailUserId: acc.workmailUserId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao desabilitar email");
      }
      if (data.success === false) {
        throw new Error(data.message ?? "Falha ao desabilitar email");
      }
      setSuccessMessage("Email desabilitado com sucesso.");
      fetchAccounts();
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao desabilitar email");
    } finally {
      setTogglingAccountId(null);
    }
  };

  const handleEnable = async (acc: WorkmailAccount) => {
    if (!selectedWorkmailOrgId) return;
    const email = (acc.email ?? "").trim();
    if (!email || !email.includes("@")) {
      setError("Email da conta não disponível para habilitar.");
      return;
    }
    setTogglingAccountId(acc.workmailUserId);
    setError(null);
    try {
      const res = await fetch("/api/workmail/accounts/enable", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workmailOrganizationId: selectedWorkmailOrgId,
          workmailUserId: acc.workmailUserId,
          email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Erro ao habilitar email");
      }
      if (data.success === false) {
        throw new Error(data.message ?? "Falha ao habilitar email");
      }
      setSuccessMessage("Email habilitado com sucesso.");
      fetchAccounts();
      fetchDomains();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao habilitar email");
    } finally {
      setTogglingAccountId(null);
    }
  };

  // Modal fecha somente por X, Cancelar ou ESC (nunca por clique no overlay)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (submitting) return;
      if (modalNew) setModalNew(false);
      if (modalReset) setModalReset(null);
      if (modalDelete) setModalDelete(null);
    };
    if (modalNew || modalReset || modalDelete) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [modalNew, modalReset, modalDelete, submitting]);

  return (
    <div className="space-y-6">
      {successMessage && (
        <div
          className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 flex items-center justify-between text-green-500"
          role="alert"
        >
          <span>{successMessage}</span>
          <Button variant="ghost" size="sm" onClick={dismissSuccess} className="text-green-500">
            Fechar
          </Button>
        </div>
      )}
      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between text-destructive"
          role="alert"
        >
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={dismissError} className="text-destructive">
            Fechar
          </Button>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
        <p className="text-muted-foreground">Gerencie emails corporativos por organização WorkMail</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organização WorkMail</CardTitle>
          <CardDescription>
            Selecione a organização (AWS WorkMail) para listar e gerenciar contas de email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrgs ? (
            <p className="text-muted-foreground">Carregando organizações...</p>
          ) : (
            <Select
              value={selectedWorkmailOrgId || undefined}
              onValueChange={(v) => setSelectedWorkmailOrgId(v)}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Selecione uma organização" />
              </SelectTrigger>
              <SelectContent>
                {orgs.filter(isOrgActive).map((o) => (
                  <SelectItem
                    key={o.workmailOrganizationId}
                    value={o.workmailOrganizationId}
                    title={o.workmailOrganizationId}
                  >
                    {formatOrgLabel(o.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contas de email</h2>
        <Button
          onClick={openNewEmailModal}
          disabled={!selectedWorkmailOrgId || loadingDomains || !hasDomainForCreate}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Email
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de contas</CardTitle>
          <CardDescription>
            {!selectedWorkmailOrgId
              ? "Selecione uma organização para listar contas."
              : loadingAccounts
                ? "Carregando..."
                : `${accounts.length} conta(s).`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAccounts ? (
            <div className="py-8 text-center text-muted-foreground">Carregando contas...</div>
          ) : !selectedWorkmailOrgId ? (
            <div className="py-8 text-center text-muted-foreground">
              Selecione uma organização para listar contas.
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Mail className="mx-auto h-12 w-12 opacity-50 mb-4" />
              Nenhuma conta de email. Clique em &quot;Novo Email&quot; para criar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc) => (
                  <TableRow key={acc.workmailUserId}>
                    <TableCell className="font-medium">
                      {acc.email || `${acc.displayName || acc.name} (${acc.workmailUserId})`}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {acc.displayName || acc.name || "—"}
                    </TableCell>
                    <TableCell>{acc.state || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {(acc.state ?? "").toUpperCase() === "ENABLED" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDisable(acc);
                            }}
                            disabled={togglingAccountId !== null}
                            title="Desabilitar email"
                          >
                            <PowerOff className="h-4 w-4" />
                          </Button>
                        ) : (acc.state ?? "").toUpperCase() === "DISABLED" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEnable(acc);
                            }}
                            disabled={togglingAccountId !== null}
                            title="Habilitar email"
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setModalReset(acc);
                          }}
                          disabled={togglingAccountId !== null}
                          title="Redefinir senha"
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setModalDelete(acc);
                          }}
                          className="text-destructive"
                          disabled={togglingAccountId !== null}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal Novo Email — fecha só por X, Cancelar ou ESC */}
      {modalNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          aria-modal
          role="dialog"
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Novo Email</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => !submitting && setModalNew(false)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                {availableDomainsForOrg.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                    Não foi possível detectar domínio custom para esta organização.
                  </div>
                ) : availableDomainsForOrg.length === 1 ? (
                  <div>
                    <Label>Domínio</Label>
                    <p className="mt-1 text-sm text-muted-foreground">{formNew.domain || primaryDomain}</p>
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="domain-select">Domínio</Label>
                    <Select
                      value={formNew.domain || selectedDomain || primaryDomain}
                      onValueChange={(v) => {
                        setSelectedDomain(v);
                        setFormNew((p) => ({ ...p, domain: v }));
                      }}
                    >
                      <SelectTrigger id="domain-select" className="mt-1">
                        <SelectValue placeholder="Selecione o domínio" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDomainsForOrg.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label htmlFor="localPart">Parte local do email (sem @)</Label>
                  <Input
                    id="localPart"
                    value={formNew.localPart}
                    onChange={(e) => {
                      const sanitized = sanitizeLocalPart(e.target.value);
                      setFormNew((p) => ({ ...p, localPart: sanitized }));
                    }}
                    placeholder="admin"
                    required
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Email final:{' '}
                    {formNew.localPart || '…'}@{(formNew.domain || selectedDomain || primaryDomain) || '…'}
                  </p>
                </div>
                <div>
                  <Label htmlFor="displayName">Nome de exibição</Label>
                  <Input
                    id="displayName"
                    value={formNew.displayName}
                    onChange={(e) =>
                      setFormNew((p) => ({ ...p, displayName: e.target.value }))
                    }
                    placeholder="João Silva"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="initialPassword">Senha inicial (mín. 8 caracteres)</Label>
                  <div className="relative mt-1">
                    <Input
                      id="initialPassword"
                      type={showPassword ? "text" : "password"}
                      value={formNew.initialPassword}
                      onChange={(e) =>
                        setFormNew((p) => ({ ...p, initialPassword: e.target.value }))
                      }
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => !submitting && setModalNew(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !hasDomainForCreate || !sanitizeLocalPart(formNew.localPart)}
                  >
                    {submitting ? "Criando..." : "Criar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Reset Password — fecha só por X, Cancelar ou ESC */}
      {modalReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          aria-modal
          role="dialog"
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Redefinir senha</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => !submitting && setModalReset(null)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Conta: {modalReset.email || modalReset.displayName || modalReset.workmailUserId}
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword">Nova senha (mín. 8 caracteres)</Label>
                  <div className="relative mt-1">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={formResetPassword.newPassword}
                      onChange={(e) =>
                        setFormResetPassword({ newPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowNewPassword((v) => !v)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => !submitting && setModalReset(null)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Salvando..." : "Alterar senha"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Confirmar exclusão — fecha só por X, Cancelar ou ESC */}
      {modalDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          aria-modal
          role="dialog"
        >
          <Card
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Excluir conta</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => !submitting && setModalDelete(null)}
              >
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tem certeza que deseja excluir a conta{" "}
                <strong>
                  {modalDelete.email ||
                    modalDelete.displayName ||
                    modalDelete.workmailUserId}
                </strong>
                ? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => !submitting && setModalDelete(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting ? "Excluindo..." : "Excluir"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
