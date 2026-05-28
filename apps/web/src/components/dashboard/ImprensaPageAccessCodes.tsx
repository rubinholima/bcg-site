"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AccessCode = {
  id: string;
  code: string;
  label: string | null;
  expiresAt: string;
  createdAt: string;
};

export function ImprensaPageAccessCodes({ tenantId }: { tenantId: string }) {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expiresHours, setExpiresHours] = useState("72");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<AccessCode[]>(`/tenants/${tenantId}/press/page-access-codes`);
      setCodes(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setCodes([]);
      setError(e instanceof Error ? e.message : "Erro ao carregar códigos.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      await api.post<AccessCode>(`/tenants/${tenantId}/press/page-access-codes`, {
        expiresInHours: parseInt(expiresHours, 10) || 72,
        label: label.trim() || undefined,
      });
      setLabel("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar código.");
    } finally {
      setCreating(false);
    }
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatExpiry = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-amber-500" />
        <Label className="text-sm font-semibold">Códigos de acesso temporários</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Gere um código e repasse à imprensa. Sem código válido, a página <strong>No menu</strong> fica bloqueada.
      </p>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          placeholder="Observação (opcional) — ex: Jornalista X"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Select value={expiresHours} onValueChange={setExpiresHours}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">24 horas</SelectItem>
            <SelectItem value="72">3 dias</SelectItem>
            <SelectItem value="168">7 dias</SelectItem>
            <SelectItem value="720">30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" onClick={handleCreate} disabled={creating} className="min-h-10">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar código"}
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando códigos…</p>
      ) : codes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum código ativo. Gere um acima.</p>
      ) : (
        <ul className="space-y-2">
          {codes.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/80 px-3 py-2"
            >
              <div className="min-w-0">
                <span className="font-mono text-lg font-bold tracking-widest text-foreground">{c.code}</span>
                {c.label ? <span className="ml-2 text-xs text-muted-foreground">— {c.label}</span> : null}
                <p className="text-[11px] text-muted-foreground">Expira: {formatExpiry(c.expiresAt)}</p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="outline" size="sm" onClick={() => copyCode(c.code, c.id)}>
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  {copiedId === c.id ? "Copiado" : "Copiar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={async () => {
                    try {
                      await api.delete(`/tenants/${tenantId}/press/page-access-codes/${c.id}`);
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Erro ao revogar.");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
