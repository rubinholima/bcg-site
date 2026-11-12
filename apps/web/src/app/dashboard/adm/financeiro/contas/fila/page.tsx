"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useFinanceiroTenant } from "../../financeiro-tenant-shell";

type QueueRow = {
  id: string;
  descricao: string;
  valor: number;
  dueDate: string;
  status: string;
  contraparte?: string | null;
  remainingBalance?: number;
  financeAccountId?: string | null;
};

type Account = { id: string; name: string };

export default function FinanceiroFilaContaPage() {
  const searchParams = useSearchParams();
  const { tenantId } = useFinanceiroTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [accountId, setAccountId] = useState(searchParams.get("accountId") ?? "");
  const [tipo, setTipo] = useState<"pagar" | "receber">("pagar");
  const [vencDe, setVencDe] = useState("");
  const [vencAte, setVencAte] = useState("");
  const [busca, setBusca] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<QueueRow[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    void api.get<Account[]>(`/financeiro/contas?tenantId=${tenantId}&activeOnly=true`).then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setAccounts(list);
      if (!accountId && list[0]) setAccountId(list[0].id);
    });
    void api
      .get<Array<{ id: string; name: string }>>(`/compras/suppliers?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setSuppliers(Array.isArray(data) ? data : []));
  }, [tenantId, accountId]);

  const loadQueue = useCallback(async () => {
    if (!tenantId || !accountId) return;
    const p = new URLSearchParams({
      tenantId,
      financeAccountId: accountId,
      tipo,
    });
    if (vencDe) p.set("vencimentoDe", vencDe);
    if (vencAte) p.set("vencimentoAte", vencAte);
    if (busca.trim()) p.set("busca", busca.trim());
    if (supplierId) p.set("supplierId", supplierId);
    if (status) p.set("status", status);
    const { data } = await api.get<QueueRow[]>(`/financeiro/filas/conta?${p.toString()}`);
    setRows(Array.isArray(data) ? data : []);
  }, [tenantId, accountId, tipo, vencDe, vencAte, busca, supplierId, status]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const plannedAccountName = accounts.find((a) => a.id === accountId)?.name;

  if (!tenantId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila por conta planejada</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label>Conta planejada</Label>
            <NativeSelect value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Selecione…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div>
            <Label>Tipo</Label>
            <NativeSelect value={tipo} onChange={(e) => setTipo(e.target.value as "pagar" | "receber")}>
              <option value="pagar">A pagar</option>
              <option value="receber">A receber</option>
            </NativeSelect>
          </div>
          <div>
            <Label>Status</Label>
            <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos abertos</option>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
            </NativeSelect>
          </div>
          {tipo === "pagar" ? (
            <div className="sm:col-span-2">
              <Label>Fornecedor</Label>
              <NativeSelectField
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                placeholder="Todos"
                options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              />
            </div>
          ) : null}
          <div>
            <Label>Vencimento de</Label>
            <Input type="date" className="text-foreground [&::-webkit-datetime-edit]:text-foreground" value={vencDe} onChange={(e) => setVencDe(e.target.value)} />
          </div>
          <div>
            <Label>Vencimento até</Label>
            <Input type="date" className="text-foreground [&::-webkit-datetime-edit]:text-foreground" value={vencAte} onChange={(e) => setVencAte(e.target.value)} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Busca</Label>
            <Input className="text-foreground" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Descrição ou contraparte" />
          </div>
        </CardContent>
      </Card>

      {plannedAccountName ? (
        <p className="text-sm text-muted-foreground">
          Conta planejada: <span className="text-foreground font-medium">{plannedAccountName}</span>
        </p>
      ) : null}

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
                <Link href={`/dashboard/adm/financeiro/lancamentos/${r.id}`} className="text-sm font-medium text-primary hover:underline">
                  {r.descricao}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {r.contraparte ?? "—"} · {new Date(r.dueDate).toLocaleDateString("pt-BR")} · {r.status}
                </p>
              </div>
              <div className="text-sm tabular-nums text-foreground">
                {(r.remainingBalance ?? r.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Após baixa com conta efetiva diferente, o título sai desta fila e o movimento fica na conta efetiva.
      </p>
    </div>
  );
}
