"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IdCard, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { AssessoriaCollapsible } from "@/components/dashboard/AssessoriaCollapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Journalist = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  outlet: string | null;
  document: string | null;
  eventLabel: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

type Filter = "all" | "pending" | "approved" | "rejected";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Credenciado",
  rejected: "Recusado",
};

export function ImprensaJornalistasCard({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<Journalist[]>([]);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingEmail, setSavingEmail] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    outlet: "",
    document: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [listRes, editorialRes] = await Promise.all([
        api.get<Journalist[]>(`/tenants/${tenantId}/press/credential-requests`),
        api.get<{ fields: Record<string, string> }>(`/tenants/${tenantId}/press/editorial`).catch(() => ({
          data: { fields: {} as Record<string, string> },
        })),
      ]);
      setRows(Array.isArray(listRes.data) ? listRes.data : []);
      setNotifyEmail(editorialRes.data.fields?.imprensaCredencialNotifyEmail ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar jornalistas.");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
    }),
    [rows],
  );

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/tenants/${tenantId}/press/credential-requests/${id}/status`, { status });
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const removeRow = async (id: string) => {
    await api.delete(`/tenants/${tenantId}/press/credential-requests/${id}`);
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<Journalist>(`/tenants/${tenantId}/press/journalists`, form);
      setRows((prev) => [data, ...prev]);
      setForm({ name: "", email: "", phone: "", outlet: "", document: "", notes: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const saveNotifyEmail = async () => {
    setSavingEmail(true);
    try {
      await api.patch(`/tenants/${tenantId}/press/editorial`, {
        fields: { imprensaCredencialNotifyEmail: notifyEmail.trim() || undefined },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar e-mail.");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <AssessoriaCollapsible
      title="Cadastro de jornalistas"
      description="Solicitações do site, cadastro manual, aprovação e e-mail de aviso."
      icon={IdCard}
      badge={`${counts.all}`}
      borderClassName="border-sky-500/25"
    >
      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <AssessoriaCollapsible title="E-mail de aviso" description="Recebe alerta quando alguém solicita credencial pelo site">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label>E-mail da assessoria</Label>
            <Input
              type="email"
              placeholder="imprensa@clube.com.br"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
          </div>
          <Button type="button" variant="secondary" disabled={savingEmail} onClick={() => void saveNotifyEmail()}>
            {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar e-mail"}
          </Button>
        </div>
      </AssessoriaCollapsible>

      <AssessoriaCollapsible title="Lista de jornalistas" badge={`${filtered.length} exibidos`}>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "Todos"],
              ["pending", "Pendentes"],
              ["approved", "Credenciados"],
              ["rejected", "Recusados"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
            >
              {label} ({counts[key]})
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" className="ml-auto gap-1" onClick={() => setShowForm((v) => !v)}>
            <UserPlus className="h-4 w-4" />
            Cadastrar jornalista
          </Button>
        </div>

        {showForm ? (
          <form onSubmit={(e) => void handleRegister(e)} className="space-y-3 rounded-lg border border-border p-4">
            <p className="text-sm font-medium">Novo jornalista (cadastro manual — já credenciado)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input required placeholder="Nome completo *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input required type="email" placeholder="E-mail *" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <Input placeholder="Veículo / outlet" value={form.outlet} onChange={(e) => setForm((f) => ({ ...f, outlet: e.target.value }))} />
              <Input placeholder="CPF / documento" value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
            </div>
            <textarea
              rows={2}
              placeholder="Observações"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Salvar cadastro
            </Button>
          </form>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {filter === "pending" ? "Nenhuma solicitação pendente." : "Nenhum jornalista nesta lista."}
          </p>
        ) : (
          <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
            {filtered.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-semibold text-foreground">{r.name}</p>
                    <p className="text-muted-foreground">{r.email}</p>
                    {r.phone ? <p>{r.phone}</p> : null}
                    {r.outlet ? <p className="text-muted-foreground">{r.outlet}</p> : null}
                    {r.document ? <p className="text-xs">Doc: {r.document}</p> : null}
                    {r.eventLabel ? <p className="text-xs text-muted-foreground">Jogo: {r.eventLabel}</p> : null}
                    {r.notes ? <p className="text-xs whitespace-pre-wrap text-muted-foreground">{r.notes}</p> : null}
                    <p className="text-[10px] text-muted-foreground">{new Date(r.createdAt).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1">
                      {r.status === "pending" ? (
                        <>
                          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => void updateStatus(r.id, "approved")}>
                            Aprovar
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => void updateStatus(r.id, "rejected")}>
                            Recusar
                          </Button>
                        </>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        title="Excluir registro"
                        onClick={() => void removeRow(r.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AssessoriaCollapsible>
    </AssessoriaCollapsible>
  );
}
