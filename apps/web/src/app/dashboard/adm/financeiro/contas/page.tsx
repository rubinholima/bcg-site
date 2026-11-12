"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

type AccountRow = {
  id: string;
  name: string;
  accountType: string;
  institution: string | null;
  currency: string;
  active: boolean;
  accountRefMasked?: string | null;
};

export default function FinanceiroContasPage() {
  const { tenantId } = useFinanceiroTenant();
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("BANK");
  const [institution, setInstitution] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await api.get<AccountRow[]>(`/financeiro/contas?tenantId=${tenantId}`);
    setRows(Array.isArray(data) ? data : []);
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !name.trim()) return;
    try {
      await api.post("/financeiro/contas", {
        tenantId,
        name,
        accountType,
        institution: institution.trim() || undefined,
      });
      setName("");
      setInstitution("");
      await load();
      setFeedback({ title: "Conta criada", message: "Conta financeira cadastrada." });
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível criar a conta." });
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova conta financeira</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createAccount} className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="accName">Nome</Label>
              <Input id="accName" value={name} onChange={(e) => setName(e.target.value)} className="text-foreground" />
            </div>
            <div>
              <Label htmlFor="accType">Tipo</Label>
              <NativeSelect id="accType" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                <option value="BANK">Banco</option>
                <option value="CASH">Caixa</option>
                <option value="CREDIT_CARD">Cartão</option>
                <option value="OMIE_OPERATIONAL">Omie operacional</option>
                <option value="OTHER">Outro</option>
              </NativeSelect>
            </div>
            <div>
              <Label htmlFor="inst">Instituição</Label>
              <Input
                id="inst"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="text-foreground"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-1 rounded-md border border-border/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium text-foreground">{r.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{r.accountType}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {r.institution ?? "—"} · {r.currency}
                  {r.accountRefMasked ? ` · ref ${r.accountRefMasked}` : ""}
                  {!r.active ? " · inativa" : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {feedback ? (
        <FeedbackModal
          open
          onOpenChange={() => setFeedback(null)}
          title={feedback.title}
          message={feedback.message}
        />
      ) : null}
    </div>
  );
}
