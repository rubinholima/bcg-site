"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BCH_CARD, BCH_TABLE_WRAP } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { cn } from "@/lib/utils";

type RoleRow = { id: string; code: string; name: string; active: boolean; sortOrder: number };

export function BostonCityHallOperationalRolesConfig() {
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(
    null,
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<RoleRow[]>("/boston-city-hall/operational-roles?all=true");
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível carregar funções operacionais.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const addRole = async () => {
    if (!code.trim() || !name.trim()) return;
    try {
      await api.post("/boston-city-hall/operational-roles", { code: code.trim(), name: name.trim() });
      setCode("");
      setName("");
      await reload();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível criar a função.",
        variant: "error",
      });
    }
  };

  const toggleActive = async (row: RoleRow) => {
    try {
      await api.patch(`/boston-city-hall/operational-roles/${encodeURIComponent(row.id)}`, { active: !row.active });
      await reload();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível atualizar.", variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className={cn(BCH_CARD, "grid gap-3 sm:grid-cols-3 sm:items-end")}>
        <div className="space-y-1 sm:col-span-1">
          <Label className="text-xs">Código</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="text-foreground" placeholder="ex.: hostess" />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <Label className="text-xs">Nome exibido</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="text-foreground" placeholder="Ex.: Hostess" />
        </div>
        <Button type="button" className="min-h-[44px]" onClick={() => void addRole()}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </section>

      <div className={BCH_TABLE_WRAP}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-xs text-slate-400">{r.code}</TableCell>
                <TableCell>{r.sortOrder}</TableCell>
                <TableCell>{r.active ? "Ativa" : "Inativa"}</TableCell>
                <TableCell>
                  <Button type="button" size="sm" variant="outline" onClick={() => void toggleActive(r)}>
                    {r.active ? "Desativar" : "Ativar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(o) => !o && setFeedback(null)}
        variant={feedback?.variant ?? "error"}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
