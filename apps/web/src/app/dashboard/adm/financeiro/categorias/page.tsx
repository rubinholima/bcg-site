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

type CategoryRow = {
  id: string;
  name: string;
  parentId: string | null;
  active: boolean;
  parent?: { id: string; name: string } | null;
};

export default function FinanceiroCategoriasPage() {
  const { tenantId } = useFinanceiroTenant();
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const { data } = await api.get<CategoryRow[]>(`/financeiro/categorias?tenantId=${tenantId}`);
    setRows(Array.isArray(data) ? data : []);
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const parents = rows.filter((r) => !r.parentId);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !name.trim()) return;
    try {
      await api.post("/financeiro/categorias", {
        tenantId,
        name,
        parentId: parentId || undefined,
      });
      setName("");
      setParentId("");
      await load();
      setFeedback({ title: "Categoria salva", message: "Categoria financeira criada." });
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível salvar a categoria." });
    }
  }

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createCategory} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="catName">Nome</Label>
              <Input id="catName" value={name} onChange={(e) => setName(e.target.value)} className="text-foreground" />
            </div>
            <div>
              <Label htmlFor="catParent">Categoria pai (subcategoria)</Label>
              <NativeSelect id="catParent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">— Categoria principal —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border border-border/50 px-3 py-2 text-sm">
              <span className="text-foreground">{r.name}</span>
              {r.parent ? (
                <span className="ml-2 text-muted-foreground text-xs">sub de {r.parent.name}</span>
              ) : null}
              {!r.active ? <span className="ml-2 text-xs text-amber-400">inativa</span> : null}
            </div>
          ))}
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
