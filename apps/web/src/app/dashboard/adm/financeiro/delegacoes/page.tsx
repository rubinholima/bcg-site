"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";
import { extractFinanceError } from "../finance-api-helpers";

type Delegation = {
  id: string;
  grantedToUserId: string;
  capability: string;
  validFrom: string;
  validUntil: string | null;
  reason: string | null;
  revokedAt: string | null;
};

type UserOpt = { id: string; username: string; name?: string | null };

export default function FinanceiroDelegacoesPage() {
  const { tenantId } = useFinanceiroTenant();
  const [rows, setRows] = useState<Delegation[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [grantedToUserId, setGrantedToUserId] = useState("");
  const [capability, setCapability] = useState("finance_pay");
  const [validFrom, setValidFrom] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [del, us] = await Promise.all([
      api.get<Delegation[]>(`/financeiro/delegacoes/todas?tenantId=${tenantId}`),
      api.get<UserOpt[]>("/users"),
    ]);
    setRows(Array.isArray(del.data) ? del.data : []);
    setUsers(Array.isArray(us.data) ? us.data : []);
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function grant(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.post("/financeiro/delegacoes", {
        tenantId,
        grantedToUserId,
        capability,
        validFrom: validFrom ? `${validFrom}T00:00:00.000Z` : undefined,
        validUntil: validUntil ? `${validUntil}T23:59:59.999Z` : undefined,
        reason: reason.trim() || undefined,
      });
      await load();
    } catch (err) {
      setFeedback({ title: "Erro", message: extractFinanceError(err) });
    }
  }

  async function revoke(id: string) {
    try {
      await api.patch(`/financeiro/delegacoes/${id}/revogar?tenantId=${tenantId}`);
      await load();
    } catch (err) {
      setFeedback({ title: "Erro", message: extractFinanceError(err) });
    }
  }

  function statusOf(d: Delegation): string {
    if (d.revokedAt) return "Revogada";
    if (d.validUntil && new Date(d.validUntil) < new Date()) return "Expirada";
    return "Ativa";
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conceder delegação</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={grant} className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            <div>
              <Label>Usuário</Label>
              <NativeSelect value={grantedToUserId} onChange={(e) => setGrantedToUserId(e.target.value)}>
                <option value="">Selecione…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.username}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div>
              <Label>Escopo</Label>
              <NativeSelect value={capability} onChange={(e) => setCapability(e.target.value)}>
                <option value="finance_pay">Pagamento (finance_pay)</option>
                <option value="finance_manual_settlement">Baixa manual</option>
                <option value="finance_payment_account_override">Override de conta</option>
              </NativeSelect>
            </div>
            <div>
              <Label>Válido de</Label>
              <Input type="date" className="text-foreground [&::-webkit-datetime-edit]:text-foreground" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div>
              <Label>Válido até</Label>
              <Input type="date" className="text-foreground [&::-webkit-datetime-edit]:text-foreground" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Motivo</Label>
              <Textarea className="text-foreground" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Conceder</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delegações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {rows.map((d) => (
            <div key={d.id} className="flex flex-col gap-1 rounded border border-border/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-foreground">{d.capability}</p>
                <p className="text-xs text-muted-foreground">
                  {statusOf(d)} · até {d.validUntil ? new Date(d.validUntil).toLocaleDateString("pt-BR") : "sem limite"}
                </p>
              </div>
              {!d.revokedAt ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void revoke(d.id)}>
                  Revogar
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {feedback ? (
        <FeedbackModal open onOpenChange={() => setFeedback(null)} title={feedback.title} message={feedback.message} />
      ) : null}
    </div>
  );
}
