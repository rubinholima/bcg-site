"use client";

import { useMemo, useState } from "react";
import { Ban, Check, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { authFetch } from "@/lib/authFetch";
import { getPasswordRequirementChecks, validateCognitoPassword } from "@/lib/passwordPolicy";
import { cn } from "@/lib/utils";

function parseApiError(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Erro na operação.";
  try {
    const data = JSON.parse(trimmed) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join("; ");
    if (typeof data.message === "string") return data.message;
  } catch {
    /* texto puro */
  }
  return trimmed.length > 200 ? "Erro na operação." : trimmed;
}

function PasswordRequirementsList({ password }: { password: string }) {
  const checks = useMemo(() => getPasswordRequirementChecks(password), [password]);

  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">Requisitos da senha</p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-3">
        {checks.map((c) => (
          <li
            key={c.id}
            className={cn(
              "flex min-w-0 items-start gap-1.5 text-[11px] leading-snug sm:text-xs",
              c.met ? "text-emerald-500" : "text-muted-foreground",
            )}
          >
            <Check className={cn("mt-0.5 h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5", !c.met && "opacity-30")} />
            <span className="min-w-0 break-words">{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type UserAdminActionsProps = {
  username: string;
  blocked: boolean;
  isSelf?: boolean;
  compact?: boolean;
  onUpdated?: (patch: { blocked?: boolean }) => void;
};

export function UserAdminActions({
  username,
  blocked,
  isSelf = false,
  compact = false,
  onUpdated,
}: UserAdminActionsProps) {
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant: "success" | "error";
  }>({ open: false, title: "", message: "", variant: "success" });

  const nextBlocked = !blocked;

  const handleBlockToggle = async () => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/users/${encodeURIComponent(username)}/block`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: nextBlocked }),
      });
      if (!res.ok) {
        throw new Error(parseApiError(await res.text()));
      }
      onUpdated?.({ blocked: nextBlocked });
      setFeedback({
        open: true,
        title: nextBlocked ? "Usuário bloqueado" : "Usuário desbloqueado",
        message: nextBlocked
          ? `${username} não poderá fazer login até ser desbloqueado.`
          : `${username} pode acessar a plataforma novamente.`,
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao alterar bloqueio.",
        variant: "error",
      });
    } finally {
      setBusy(false);
      setBlockDialogOpen(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação deve ser igual à nova senha.");
      return;
    }
    const validation = validateCognitoPassword(newPassword);
    if (!validation.valid) {
      const missing = validation.unmet?.length
        ? validation.unmet.join(" · ")
        : "Verifique os requisitos abaixo.";
      setPasswordError(`Senha inválida: ${missing}`);
      return;
    }
    setBusy(true);
    try {
      const res = await authFetch(`/api/users/${encodeURIComponent(username)}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword, mustChangePassword }),
      });
      if (!res.ok) {
        throw new Error(parseApiError(await res.text()));
      }
      setNewPassword("");
      setConfirmPassword("");
      setMustChangePassword(false);
      setPasswordError(null);
      setPasswordDialogOpen(false);
      setFeedback({
        open: true,
        title: "Senha alterada",
        message: mustChangePassword
          ? `${username} precisará trocar a senha no próximo login.`
          : `A senha de ${username} foi atualizada.`,
        variant: "success",
      });
    } catch (err) {
      setFeedback({
        open: true,
        title: "Erro",
        message: err instanceof Error ? err.message : "Erro ao alterar senha.",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={compact ? "flex items-center gap-1" : "flex flex-wrap gap-2"}>
        {!isSelf ? (
          <Button
            type="button"
            variant={blocked ? "outline" : "destructive"}
            size={compact ? "icon" : "default"}
            className={compact ? "h-9 w-9 shrink-0" : "min-h-[44px]"}
            onClick={() => setBlockDialogOpen(true)}
            disabled={busy}
            title={blocked ? "Desbloquear usuário" : "Bloquear usuário"}
          >
            {blocked ? (
              <>
                <ShieldCheck className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!compact ? "Desbloquear" : null}
              </>
            ) : (
              <>
                <Ban className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                {!compact ? "Bloquear" : null}
              </>
            )}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon" : "default"}
          className={compact ? "h-9 w-9 shrink-0" : "min-h-[44px]"}
          onClick={() => setPasswordDialogOpen(true)}
          disabled={busy}
          title="Alterar senha"
        >
          <KeyRound className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} />
          {!compact ? "Alterar senha" : null}
        </Button>
      </div>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {nextBlocked ? "Bloquear usuário?" : "Desbloquear usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {nextBlocked
                ? `${username} perderá acesso imediato à plataforma e não conseguirá fazer login.`
                : `${username} voltará a poder acessar a plataforma normalmente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleBlockToggle()} disabled={busy}>
              {busy ? "Salvando…" : nextBlocked ? "Bloquear" : "Desbloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setPasswordError(null);
            setNewPassword("");
            setConfirmPassword("");
            setMustChangePassword(false);
          }
        }}
      >
        <DialogContent fitContent className="w-[min(26rem,calc(100vw-1.25rem))]">
          <DialogHeader className="space-y-0 pr-8 text-left">
            <DialogTitle className="break-all text-base leading-snug">
              Nova senha — {username}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor={`new-password-${username}`} className="text-sm">
                Nova senha
              </Label>
              <Input
                id={`new-password-${username}`}
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(null);
                }}
                disabled={busy}
                className="h-9 text-foreground"
              />
            </div>
            <div className="space-y-1 sm:col-span-1">
              <Label htmlFor={`confirm-password-${username}`} className="text-sm">
                Confirmar senha
              </Label>
              <Input
                id={`confirm-password-${username}`}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError(null);
                }}
                disabled={busy}
                className="h-9 text-foreground"
              />
            </div>
          </div>

          <PasswordRequirementsList password={newPassword} />

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={mustChangePassword}
              onCheckedChange={(v) => setMustChangePassword(v === true)}
              disabled={busy}
            />
            <span>Exigir troca no próximo login</span>
          </label>

          {passwordError ? (
            <p className="break-words rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {passwordError}
            </p>
          ) : null}

          <DialogFooter className="mt-1 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setPasswordDialogOpen(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-[44px]"
              onClick={() => void handlePasswordSubmit()}
              disabled={busy}
            >
              {busy ? "Salvando…" : "Salvar senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(open) => setFeedback((prev) => ({ ...prev, open }))}
        title={feedback.title}
        message={feedback.message}
        variant={feedback.variant}
      />
    </>
  );
}
