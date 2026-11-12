"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../../financeiro-tenant-shell";

type QueueRow = {
  id: string;
  descricao: string;
  valor: number;
  dueDate: string;
  status: string;
  remainingBalance?: number;
};

type Account = { id: string; name: string };

export default function FinanceiroFilaContaPage() {
  const { tenantId } = useFinanceiroTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [tipo, setTipo] = useState<"pagar" | "receber">("pagar");
  const [rows, setRows] = useState<QueueRow[]>([]);

  const loadAccounts = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await api.get<Account[]>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`);
    const list = Array.isArray(data) ? data : [];
    setAccounts(list);
    if (!accountId && list[0]) setAccountId(list[0].id);
  }, [tenantId, accountId]);

  const loadQueue = useCallback(async () => {
    if (!tenantId || !accountId) return;
    const { data } = await api.get<QueueRow[]>(
      `/financeiro/filas/conta?tenantId=${tenantId}&financeAccountId=${accountId}&tipo=${tipo}`,
    );
    setRows(Array.isArray(data) ? data : []);
  }, [tenantId, accountId, tipo]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila por conta planejada</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground">Conta</label>
            <NativeSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Selecione…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="w-full sm:w-48">
            <label className="text-sm text-muted-foreground">Tipo</label>
            <NativeSelect value={tipo} onChange={(e) => setTipo(e.target.value as "pagar" | "receber")}>
              <option value="pagar">A pagar</option>
              <option value="receber">A receber</option>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum título pendente nesta fila.</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-1 rounded-md border border-border/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{r.descricao}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.dueDate).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="text-sm tabular-nums text-foreground">
                {(r.remainingBalance ?? r.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Após baixa com conta efetiva diferente, o título sai desta fila (conta planejada) e o movimento fica na conta
        efetiva.{" "}
        <Link href="/dashboard/adm/financeiro/pagar" className="text-primary underline underline-offset-2">
          Ir para contas a pagar
        </Link>
      </p>
    </div>
  );
}
