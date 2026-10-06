"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelectField } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isValidUsername, suggestUsernameFromName } from "@/lib/username";

type TenantOption = { id: string; name: string };
type FunctionOption = { id: string; name: string };

export type AccessNewUserSuccess = {
  id: string;
  username: string;
  email: string;
  name: string | null;
  temporaryPassword: string;
};

type Props = {
  isSuperAdmin: boolean;
  onCreated: (user: AccessNewUserSuccess) => void;
  onFeedback: (title: string, message: string) => void;
};

export function AccessNewUserForm({ isSuperAdmin, onCreated, onFeedback }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [functions, setFunctions] = useState<FunctionOption[]>([]);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [successModal, setSuccessModal] = useState<AccessNewUserSuccess | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    tenantIds: [] as string[],
    platformFunctionId: "",
  });

  const loadTenants = useCallback(async () => {
    try {
      const res = await fetch("/api/tenants", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as TenantOption[];
      setTenants(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadFunctions = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/access/functions", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{ id: string; name: string; isActive: boolean }>;
      setFunctions(
        Array.isArray(data) ? data.filter((f) => f.isActive).map((f) => ({ id: f.id, name: f.name })) : [],
      );
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadTenants();
    void loadFunctions();
  }, [open, loadTenants, loadFunctions]);

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      username: "",
      tenantIds: [],
      platformFunctionId: "",
    });
    setUsernameTouched(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!isValidUsername(username)) {
      onFeedback("Dados inválidos", "Username inválido. Use 3–32 caracteres minúsculos.");
      return;
    }
    if (form.tenantIds.length === 0) {
      onFeedback("Empresa obrigatória", "Selecione ao menos uma empresa para o usuário.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/settings/access/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          username,
          name: form.name.trim() || undefined,
          tenantIds: form.tenantIds,
          platformFunctionId: form.platformFunctionId || null,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let msg = "Não foi possível criar o usuário.";
        try {
          const j = JSON.parse(text) as { message?: string | string[] };
          if (Array.isArray(j.message)) msg = j.message.join("; ");
          else if (j.message) msg = j.message;
        } catch {
          if (text.trim()) msg = text.trim().slice(0, 200);
        }
        onFeedback("Erro", msg);
        return;
      }
      const data = (await res.json()) as AccessNewUserSuccess & { temporaryPassword: string };
      setOpen(false);
      resetForm();
      setSuccessModal({
        id: data.id,
        username: data.username,
        email: data.email,
        name: data.name ?? null,
        temporaryPassword: data.temporaryPassword,
      });
      onCreated(data);
    } catch {
      onFeedback("Erro", "Falha de rede ao criar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = async () => {
    if (!successModal) return;
    const text = `Login: ${successModal.username}\nE-mail: ${successModal.email}\nSenha temporária: ${successModal.temporaryPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      onFeedback("Copiado", "Dados copiados para a área de transferência.");
    } catch {
      onFeedback("Aviso", "Não foi possível copiar automaticamente.");
    }
  };

  return (
    <>
      {!open ? (
        <Button type="button" className="min-h-[44px]" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-border/80 bg-muted/10 p-4"
        >
          <p className="text-sm font-semibold text-foreground">Novo usuário</p>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="access-new-name">Nome</Label>
              <Input
                id="access-new-name"
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    name,
                    username: usernameTouched ? prev.username : suggestUsernameFromName(name, prev.email),
                  }));
                }}
                disabled={loading}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-new-email">E-mail *</Label>
              <Input
                id="access-new-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={loading}
                className="text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-new-username">Usuário (login) *</Label>
              <Input
                id="access-new-username"
                required
                value={form.username}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setForm((prev) => ({ ...prev, username: e.target.value.toLowerCase() }));
                }}
                disabled={loading}
                className="font-mono text-foreground"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Empresa *</Label>
            {tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma empresa disponível no seu escopo.</p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                {tenants.map((t) => {
                  const checked = form.tenantIds.includes(t.id);
                  return (
                    <label key={t.id} className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const on = v === true;
                          setForm((prev) => ({
                            ...prev,
                            tenantIds: on
                              ? [...prev.tenantIds, t.id]
                              : prev.tenantIds.filter((id) => id !== t.id),
                          }));
                        }}
                        disabled={loading}
                      />
                      <span>{t.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Função</Label>
            <NativeSelectField
              value={form.platformFunctionId}
              onChange={(e) => setForm((prev) => ({ ...prev, platformFunctionId: e.target.value }))}
              placeholder="Selecione a função (opcional)…"
              disabled={loading || functions.length === 0}
              options={functions.map((f) => ({ value: f.id, label: f.name }))}
            />
          </div>

          {isSuperAdmin ? (
            <p className="text-xs text-muted-foreground">
              Super admin: perfil legado e matriz avançada continuam em Grupo Master → Usuários, se
              necessário.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading} className="min-h-[44px]">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Cadastrar usuário"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <Dialog open={Boolean(successModal)} onOpenChange={(o) => !o && setSuccessModal(null)}>
        <DialogContent showCloseButton className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usuário criado</DialogTitle>
            {successModal ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {successModal.name ? (
                  <p>
                    <span className="text-foreground font-medium">Nome: </span>
                    {successModal.name}
                  </p>
                ) : null}
                <p>
                  <span className="text-foreground font-medium">E-mail: </span>
                  {successModal.email}
                </p>
                <p>
                  <span className="text-foreground font-medium">Login: </span>
                  <span className="font-mono">{successModal.username}</span>
                </p>
                <p>
                  <span className="text-foreground font-medium">Senha temporária: </span>
                  <span className="font-mono text-foreground">{successModal.temporaryPassword}</span>
                </p>
                <p className="text-xs pt-1">
                  Anote agora — ela não será mostrada de novo. Troca obrigatória no primeiro login.
                </p>
              </div>
            ) : null}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => void copyCredentials()}>
              Copiar dados
            </Button>
            <Button type="button" onClick={() => setSuccessModal(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
