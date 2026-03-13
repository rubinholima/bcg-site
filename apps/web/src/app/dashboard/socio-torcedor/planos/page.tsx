"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Ticket,
  Heart,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Percent,
  Clock,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { SocioFilters } from "../SocioFilters";

interface SocioPlan {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  priceMonthly: string | number;
  perks?: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { members: number };
}

const PERK_LABELS: Record<string, string> = {
  ticketDiscountPercent: "Desconto ingressos (%)",
  merchandiseDiscountPercent: "Desconto loja (%)",
  foodDiscountPercent: "Desconto alimentação (%)",
  earlyTicketHours: "Prioridade ingressos (h)",
  stadiumTour: "Tour no estádio",
  exclusiveContent: "Conteúdo exclusivo",
  welcomePack: "Kit boas-vindas",
  meetGreet: "Meet & greet",
};

function formatPerks(perks: Record<string, unknown> | null | undefined): string[] {
  if (!perks || typeof perks !== "object") return [];
  const lines: string[] = [];
  Object.entries(perks).forEach(([key, val]) => {
    if (val === true) lines.push(PERK_LABELS[key] ?? key);
    else if (typeof val === "number") lines.push(`${PERK_LABELS[key] ?? key}: ${val}`);
    else if (Array.isArray(val) && val.length) lines.push(`${PERK_LABELS[key] ?? key}: ${val.length} itens`);
  });
  return lines;
}

export default function SocioPlanosPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<SocioPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canAccessModule("socio_torcedor") && !authLoading) return;
    if (!tenantId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<SocioPlan[]>(`/socio/plans?tenantId=${encodeURIComponent(tenantId)}`)
      .then(({ data }) => setPlans(Array.isArray(data) ? data : []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading, tenantId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/socio/plans/${deleteId}`);
      setPlans((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  if (!canAccessModule("socio_torcedor") && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>Você não tem acesso ao módulo Sócio Torcedor.</p>
        <Link href="/dashboard">
          <Button variant="link" className="mt-2">Voltar ao dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/socio-torcedor">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="h-8 w-8 text-primary" />
              Planos
            </h1>
            <p className="text-muted-foreground">
              Planos e perks por clube — descontos, prioridade de ingressos, experiências exclusivas
            </p>
          </div>
        </div>
      </div>

      <SocioFilters basePath="/dashboard/socio-torcedor/planos" tenantId={tenantId} />

      {!tenantId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gift className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Selecione um clube para gerenciar planos e benefícios.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planos do clube</CardTitle>
                <CardDescription>
                  Crie planos com benefícios exclusivos: ingressos, desconto na loja, tour no estádio, conteúdo exclusivo
                </CardDescription>
              </div>
              <Link href={`/dashboard/socio-torcedor/planos/novo?tenantId=${encodeURIComponent(tenantId)}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo plano
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {plans.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>Nenhum plano cadastrado.</p>
                <Link href={`/dashboard/socio-torcedor/planos/novo?tenantId=${encodeURIComponent(tenantId)}`}>
                  <Button variant="link" className="mt-2">Criar primeiro plano</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plano</TableHead>
                    <TableHead>Mensalidade</TableHead>
                    <TableHead>Sócios</TableHead>
                    <TableHead>Perks</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((p) => {
                    const price = typeof p.priceMonthly === "string" ? parseFloat(p.priceMonthly) : p.priceMonthly;
                    const perks = formatPerks(p.perks ?? null);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          R$ {Number.isNaN(price) ? "—" : price.toFixed(2).replace(".", ",")}
                        </TableCell>
                        <TableCell>{p._count?.members ?? 0}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {perks.slice(0, 3).map((s) => (
                              <span key={s} className="text-xs rounded bg-muted px-2 py-0.5 truncate">
                                {s}
                              </span>
                            ))}
                            {perks.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{perks.length - 3}</span>
                            )}
                            {perks.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Link href={`/dashboard/socio-torcedor/planos/${p.id}/editar?tenantId=${tenantId}`}>
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(p.id)}
                              disabled={(p._count?.members ?? 0) > 0}
                              title={(p._count?.members ?? 0) > 0 ? "Exclua os sócios antes" : "Excluir"}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Só é possível excluir planos sem sócios vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
