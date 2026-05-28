"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Pencil,
  Trash2,
  Filter,
} from "lucide-react";
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
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/context/AuthContext";
import { VAULT_CATEGORIES } from "./categories";

const AUTO_HIDE_SECONDS = 30;

type VaultItemMeta = {
  id: string;
  tenantId: string | null;
  title: string;
  category: string;
  username: string | null;
  url: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

type Tenant = { id: string; name: string; slug?: string };

export default function SenhasPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [items, setItems] = useState<VaultItemMeta[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTenantId, setFilterTenantId] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [revealed, setRevealed] = useState<Record<string, { secret: string; expiresAt: number }>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const canView = canAccessModule("vault");
  const canManage = canAccessModule("vault_manage");
  const canReveal = canAccessModule("vault_reveal");

  useEffect(() => {
    if (!authLoading && !canView) {
      router.replace("/403");
      return;
    }
  }, [authLoading, canView, router]);

  const clearRevealed = useCallback(() => {
    setRevealed((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
      timersRef.current = {};
      return {};
    });
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") clearRevealed();
    };
    const onBlur = () => clearRevealed();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      Object.values(timersRef.current).forEach((t) => clearTimeout(t));
    };
  }, [clearRevealed]);

  const fetchItems = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterTenantId && filterTenantId !== "all") {
        params.set("tenantId", filterTenantId === "group" ? "__group__" : filterTenantId);
      }
      if (filterCategory) params.set("category", filterCategory);
      if (filterSearch.trim()) params.set("search", filterSearch.trim());
      if (filterStatus) params.set("status", filterStatus);
      const res = await authFetch(`/api/vault/items?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Você não tem permissão para ver o Vault.");
          router.replace("/403");
          return;
        }
        setError("Erro ao carregar itens.");
        setItems([]);
        return;
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Erro ao carregar itens.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [canView, filterTenantId, filterCategory, filterSearch, filterStatus, router]);

  const fetchTenants = useCallback(async () => {
    try {
      const res = await authFetch("/api/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : []);
      }
    } catch {
      setTenants([]);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      fetchItems();
      fetchTenants();
    }
  }, [canView, fetchItems, fetchTenants]);

  const handleReveal = useCallback(
    async (id: string) => {
      if (!canReveal) return;
      const existing = revealed[id];
      if (existing) {
        setRevealed((prev) => {
          const next = { ...prev };
          delete next[id];
          if (timersRef.current[id]) {
            clearTimeout(timersRef.current[id]);
            delete timersRef.current[id];
          }
          return next;
        });
        return;
      }
      try {
        const res = await authFetch(`/api/vault/items/${id}/reveal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const { secret } = await res.json();
        const expiresAt = Date.now() + AUTO_HIDE_SECONDS * 1000;
        setRevealed((prev) => ({ ...prev, [id]: { secret, expiresAt } }));
        const t = setTimeout(() => {
          setRevealed((prev) => {
            const next = { ...prev };
            delete next[id];
            delete timersRef.current[id];
            return next;
          });
        }, AUTO_HIDE_SECONDS * 1000);
        timersRef.current[id] = t;
      } catch {
        // ignore
      }
    },
    [canReveal, revealed],
  );

  const handleCopy = useCallback(
    async (id: string) => {
      if (!canReveal) return;
      const existing = revealed[id];
      let secret: string;
      if (existing) {
        secret = existing.secret;
      } else {
        try {
          const res = await authFetch(`/api/vault/items/${id}/copy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          if (!res.ok) return;
          const data = await res.json();
          secret = data.secret;
        } catch {
          return;
        }
      }
      try {
        await navigator.clipboard.writeText(secret);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {
        // ignore
      }
    },
    [canReveal, revealed],
  );

  const handleDeleteClick = useCallback(
    async (id: string) => {
      if (!canManage) return;
      if (!window.confirm("Excluir este item do Vault? Esta ação não pode ser desfeita.")) return;
      setDeleting(true);
      try {
        const res = await authFetch(`/api/vault/items/${id}`, { method: "DELETE" });
        if (res.ok) {
          setItems((prev) => prev.filter((i) => i.id !== id));
          setRevealed((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      } finally {
        setDeleting(false);
      }
    },
    [canManage],
  );

  const tenantName = (tenantId: string | null) => {
    if (!tenantId) return "Grupo";
    const t = tenants.find((x) => x.id === tenantId);
    return t?.name ?? tenantId;
  };

  if (authLoading || (!canView && items.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-muted/30 p-4">
        <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros
        </span>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Tenant</Label>
            <Select
              value={filterTenantId || "all"}
              onValueChange={(v) => setFilterTenantId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="group">Grupo</SelectItem>
                {tenants.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Categoria</Label>
            <Select
              value={filterCategory || "all"}
              onValueChange={(v) => setFilterCategory(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {VAULT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Busca</Label>
            <Input
              placeholder="Título ou username"
              className="w-[180px]"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" onClick={fetchItems}>
            Aplicar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Vault</CardTitle>
          <CardDescription>
            {loading
              ? "Carregando..."
              : items.length === 0
                ? "Nenhum item. Crie um com permissão de gerenciar."
                : `${items.length} item(ns)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <KeyRound className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p>Nenhum item no Vault.</p>
              {canManage && (
                <Link href="/dashboard/senhas/new">
                  <Button variant="outline" className="mt-4">
                    Criar primeiro item
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Senha</TableHead>
                    {canManage && <TableHead className="w-[100px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const isRevealed = !!revealed[item.id];
                    const secret = revealed[item.id]?.secret;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{tenantName(item.tenantId)}</TableCell>
                        <TableCell className="max-w-[140px] truncate" title={item.username ?? ""}>
                          {item.username ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate" title={item.url ?? ""}>
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {item.url}
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>
                          {canReveal ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm min-w-[80px]">
                                {isRevealed ? secret : "••••••••"}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleReveal(item.id)}
                                title={isRevealed ? "Ocultar" : "Revelar"}
                              >
                                {isRevealed ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopy(item.id)}
                                title="Copiar"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              {copiedId === item.id && (
                                <span className="text-xs text-green-600">Copiado!</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">••••••••</span>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Link href={`/dashboard/senhas/${item.id}/edit`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title="Excluir"
                                onClick={() => handleDeleteClick(item.id)}
                                disabled={deleting}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
