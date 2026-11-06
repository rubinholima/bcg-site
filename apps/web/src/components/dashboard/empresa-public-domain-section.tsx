"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";

type PublicPageOption = { id: string; slug: string; title: string | null };

export type PublicDomainRow = {
  id: string;
  tenantId: string;
  hostnameNormalized: string;
  isCanonical: boolean;
  status: string;
  verificationStatus: string;
  sslStatus: string;
  provisioningStatus: string;
  provider: string;
  verifiedAt: string | null;
  activatedAt: string | null;
  disabledAt: string | null;
  lastCheckedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  verificationTxtName?: string;
  verificationTxtValue?: string;
};

const STATUS_LABEL: Record<string, string> = {
  DISABLED: "Despublicado",
  PENDING: "Pendente",
  ACTIVE: "Publicado",
};

const VER_LABEL: Record<string, string> = {
  PENDING_VERIFICATION: "Pendente",
  VERIFIED: "Verificado",
  FAILED: "Falhou",
  EXPIRED: "Expirado",
};

const PROV_LABEL: Record<string, string> = {
  NOT_CONFIGURED: "Não configurado",
  PENDING_VERIFICATION: "Verificação pendente",
  DNS_PENDING: "DNS pendente",
  CERTIFICATE_PENDING: "Certificado pendente",
  PROVISIONING: "Provisionando",
  ACTIVE: "Ativo",
  DISABLED: "Desativado",
  ERROR: "Erro",
};

export function EmpresaPublicDomainSection({
  tenantId,
  canManageDomains,
  canSetMainPage,
  mainPublicPageId,
  pages,
  onMainPageSaved,
}: {
  tenantId: string;
  canManageDomains: boolean;
  canSetMainPage: boolean;
  mainPublicPageId: string | null;
  pages: PublicPageOption[];
  onMainPageSaved: () => void;
}) {
  const [domains, setDomains] = useState<PublicDomainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newHost, setNewHost] = useState("");
  const [mainPageId, setMainPageId] = useState(mainPublicPageId ?? "");
  const [verifyInputs, setVerifyInputs] = useState<Record<string, string>>({});
  const [pendingInstruction, setPendingInstruction] = useState<{
    txtName: string;
    txtValue: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!canManageDomains) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PublicDomainRow[]>(`/tenants/${tenantId}/public-domains`);
      setDomains(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar domínios");
    } finally {
      setLoading(false);
    }
  }, [tenantId, canManageDomains]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setMainPageId(mainPublicPageId ?? "");
  }, [mainPublicPageId]);

  async function saveMainPage() {
    if (!canSetMainPage) return;
    setError(null);
    try {
      await api.patch(`/tenants/${tenantId}/pages/public-main`, {
        pageId: mainPageId.trim() ? mainPageId.trim() : "",
      });
      onMainPageSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar página principal");
    }
  }

  async function addDomain() {
    const h = newHost.trim();
    if (!h) return;
    setError(null);
    try {
      const { data } = await api.post<PublicDomainRow>(`/tenants/${tenantId}/public-domains`, {
        hostname: h,
        isCanonical: true,
      });
      setNewHost("");
      if (data?.verificationTxtName && data?.verificationTxtValue) {
        setPendingInstruction({ txtName: data.verificationTxtName, txtValue: data.verificationTxtValue });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao registrar domínio");
    }
  }

  async function refreshChallenge(id: string) {
    setError(null);
    try {
      const { data } = await api.post<PublicDomainRow>(
        `/tenants/${tenantId}/public-domains/${id}/verification/refresh`,
        {},
      );
      if (data?.verificationTxtName && data?.verificationTxtValue) {
        setPendingInstruction({ txtName: data.verificationTxtName, txtValue: data.verificationTxtValue });
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao renovar verificação");
    }
  }

  async function verifyDomain(id: string) {
    const token = (verifyInputs[id] ?? "").trim();
    if (!token) {
      setError("Cole o token mostrado ao criar ou renovar o desafio.");
      return;
    }
    setError(null);
    try {
      await api.post(`/tenants/${tenantId}/public-domains/${id}/verify`, { token });
      setVerifyInputs((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro na verificação");
    }
  }

  async function setCanonical(id: string) {
    setError(null);
    try {
      await api.patch(`/tenants/${tenantId}/public-domains/${id}/canonical`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao definir canônico");
    }
  }

  async function publish(id: string) {
    setError(null);
    try {
      await api.post(`/tenants/${tenantId}/public-domains/${id}/publish`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao publicar");
    }
  }

  async function retry(id: string) {
    await publish(id);
  }

  async function disable(id: string) {
    setError(null);
    try {
      await api.post(`/tenants/${tenantId}/public-domains/${id}/disable`, {});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao despublicar");
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.delete(`/tenants/${tenantId}/public-domains/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  if (!canManageDomains && !canSetMainPage) {
    return null;
  }

  return (
    <Card id="pagina-publica-dominio">
      <CardHeader>
        <CardTitle>Página pública — domínio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {canSetMainPage ? (
          <div className="space-y-2">
            <Label>Página principal pública</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select
                value={mainPageId || "__none__"}
                onValueChange={(v) => setMainPageId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="w-full sm:max-w-md">
                  <SelectValue placeholder="Selecione a página" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Automático (slug main)</SelectItem>
                  {pages.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.slug}
                      {p.title ? ` — ${p.title}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="secondary" onClick={() => void saveMainPage()}>
                Salvar página principal
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              <Link
                href={`/dashboard/paginas/tenant/${tenantId}/editar`}
                className="underline-offset-2 hover:underline"
              >
                Editar páginas
              </Link>
            </p>
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {!canManageDomains ? (
          <p className="text-sm text-muted-foreground">Sem permissão para gerenciar domínio público.</p>
        ) : null}

        {canManageDomains && pendingInstruction ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">Registro TXT (DNS)</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground break-all">Nome: {pendingInstruction.txtName}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground break-all">Valor: {pendingInstruction.txtValue}</p>
          </div>
        ) : null}

        {canManageDomains ? (
        <div className="space-y-2">
          <Label htmlFor="new-public-host">Novo domínio</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="new-public-host"
              value={newHost}
              onChange={(e) => setNewHost(e.target.value)}
              placeholder="ex.: www.seudominio.com"
              className="sm:max-w-md"
            />
            <Button type="button" onClick={() => void addDomain()} disabled={loading || !newHost.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
        ) : null}

        {canManageDomains ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Domínios</p>
          {loading && domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : domains.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum domínio cadastrado.</p>
          ) : (
            <ul className="space-y-4">
              {domains.map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-border/60 bg-card/30 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-mono font-medium">{d.hostnameNormalized}</span>
                    {d.isCanonical ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400">Canônico</span>
                    ) : null}
                  </div>
                  <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="inline text-foreground/80">Publicação: </dt>
                      <dd className="inline">{STATUS_LABEL[d.status] ?? d.status}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/80">Propriedade: </dt>
                      <dd className="inline">{VER_LABEL[d.verificationStatus] ?? d.verificationStatus}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/80">SSL: </dt>
                      <dd className="inline">{d.sslStatus}</dd>
                    </div>
                    <div>
                      <dt className="inline text-foreground/80">Provisionamento: </dt>
                      <dd className="inline">{PROV_LABEL[d.provisioningStatus] ?? d.provisioningStatus}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="inline text-foreground/80">Última verificação: </dt>
                      <dd className="inline">{d.lastCheckedAt ? new Date(d.lastCheckedAt).toLocaleString("pt-BR") : "—"}</dd>
                    </div>
                    {d.lastErrorCode || d.lastErrorMessage ? (
                      <div className="sm:col-span-2 text-destructive">
                        {d.lastErrorCode ? `${d.lastErrorCode}: ` : ""}
                        {d.lastErrorMessage ?? ""}
                      </div>
                    ) : null}
                  </dl>

                  {d.verificationStatus !== "VERIFIED" ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Input
                        className="sm:max-w-xs"
                        placeholder="Token cup360-verify=…"
                        value={verifyInputs[d.id] ?? ""}
                        onChange={(e) => setVerifyInputs((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      />
                      <Button type="button" size="sm" variant="secondary" onClick={() => void verifyDomain(d.id)}>
                        Verificar
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => void refreshChallenge(d.id)}>
                        Novo TXT
                      </Button>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => void setCanonical(d.id)}>
                      Definir como principal
                    </Button>
                    <Button type="button" size="sm" onClick={() => void publish(d.id)} disabled={d.verificationStatus !== "VERIFIED"}>
                      Publicar
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void retry(d.id)}>
                      Tentar novamente
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => void disable(d.id)}>
                      Despublicar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void remove(d.id)}
                      disabled={d.status === "ACTIVE"}
                    >
                      Remover
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
