"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FeedbackModal } from "@/components/ui/feedback-modal";

type Row = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  category?: string | null;
  config?: Record<string, unknown>;
};

function TiposContent() {
  const sp = useSearchParams();
  const tenantId = sp.get("tenantId") ?? "";
  const [rows, setRows] = useState<Row[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configJson, setConfigJson] = useState('{"requiresSignature":true,"expirationAlertDays":[90,60,30]}');
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    try {
      const { data } = await api.get<Row[]>(`/tenants/${tenantId}/athlete-contract-types`);
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!tenantId || !code.trim() || !name.trim()) return;
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(configJson) as Record<string, unknown>;
    } catch {
      setFeedback({ title: "Config", message: "JSON de requisitos inválido." });
      return;
    }
    try {
      if (editId) {
        await api.patch(`/tenants/${tenantId}/athlete-contract-types/${editId}`, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          config,
        });
      } else {
        await api.post(`/tenants/${tenantId}/athlete-contract-types`, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || undefined,
          config,
        });
      }
      setCode("");
      setName("");
      setDescription("");
      setEditId(null);
      await load();
      setFeedback({ title: "Tipos", message: "Tipo salvo." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar.",
      });
    }
  }

  async function toggleActive(row: Row, active: boolean) {
    try {
      await api.post(`/tenants/${tenantId}/athlete-contract-types/${row.id}/active`, { active });
      await load();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao atualizar status.",
      });
    }
  }

  return (
    <div className="space-y-6">
      {!tenantId ? (
        <p className="text-sm text-muted-foreground">Informe tenantId na URL (?tenantId=…).</p>
      ) : null}

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código" disabled={!!editId} />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" />
        <Textarea
          className="sm:col-span-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrição"
          rows={2}
        />
        <Textarea
          className="sm:col-span-2 font-mono text-xs"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          rows={4}
          aria-label="Config JSON"
        />
        <div className="flex gap-2 sm:col-span-2">
          <Button type="button" size="sm" onClick={() => void save()} disabled={!tenantId}>
            {editId ? "Atualizar tipo" : "Criar tipo"}
          </Button>
          {editId ? (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditId(null)}>
              Cancelar edição
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.active ? "Sim" : "Não"}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditId(r.id);
                      setCode(r.code);
                      setName(r.name);
                      setDescription(r.description ?? "");
                      setConfigJson(JSON.stringify(r.config ?? {}, null, 2));
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void toggleActive(r, !r.active)}
                  >
                    {r.active ? "Desativar" : "Reativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Button type="button" size="sm" variant="link" asChild>
        <Link href={`/dashboard/relatorios/futebol/contratos-atletas?tenantId=${tenantId}`}>
          Voltar ao relatório
        </Link>
      </Button>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}

export default function TiposContratoPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Tipos de contrato (atletas)"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <TiposContent />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
