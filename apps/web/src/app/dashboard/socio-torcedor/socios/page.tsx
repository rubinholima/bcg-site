"use client";

import { formatDateDayMonYear } from "@/lib/format-date";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Ticket,
  Users,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Star,
  Mail,
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
import { ClickableTableRow, TableRowActions } from "@/components/ui/clickable-table-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatPhoneForDisplay } from "@/lib/format-phone";

interface SocioPlan {
  id: string;
  name: string;
  slug: string;
}

interface SocioMember {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  joinedAt: string;
  points: number;
  loyaltyTier: number;
  plan: SocioPlan;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  cancelled: "Cancelado",
};

export default function SocioSociosPage() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") ?? "";
  const { canAccessModule, loading: authLoading } = useAuth();
  const [members, setMembers] = useState<SocioMember[]>([]);
  const [plans, setPlans] = useState<SocioPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!canAccessModule("socio_torcedor") && !authLoading) return;
    if (!tenantId) {
      setMembers([]);
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.get<SocioMember[]>(`/socio/members?tenantId=${encodeURIComponent(tenantId)}`),
      api.get<SocioPlan[]>(`/socio/plans?tenantId=${encodeURIComponent(tenantId)}`),
    ])
      .then(([{ data: membersData }, { data: plansData }]) => {
        setMembers(Array.isArray(membersData) ? membersData : []);
        setPlans(Array.isArray(plansData) ? plansData : []);
      })
      .catch(() => {
        setMembers([]);
        setPlans([]);
      })
      .finally(() => setLoading(false));
  }, [canAccessModule, authLoading, tenantId]);

  const filteredMembers = members.filter((m) => {
    if (planFilter && m.plan.id !== planFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.phone ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/socio/members/${deleteId}`);
      setMembers((prev) => prev.filter((m) => m.id !== deleteId));
      setDeleteId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      const date = new Date(d);
      return formatDateDayMonYear(date);
    } catch {
      return "—";
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
      </div>

      <SocioFilters basePath="/dashboard/socio-torcedor/socios" tenantId={tenantId} />

      {!tenantId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Selecione um clube para gerenciar sócios.</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Lista de sócios</CardTitle>
                  <CardDescription>
                    {members.length} sócio(s) • Filtre por plano, status ou busca por nome/email
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select value={planFilter || "all"} onValueChange={(v) => setPlanFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os planos</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    type="search"
                    placeholder="Buscar nome, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p>{members.length === 0 ? "Nenhum sócio cadastrado." : "Nenhum resultado para os filtros."}</p>
                  {members.length === 0 && (
                    <Link href={`/dashboard/socio-torcedor/socios/novo?tenantId=${encodeURIComponent(tenantId)}`}>
                      <Button variant="link" className="mt-2">Cadastrar primeiro sócio</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fidelidade</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.map((m) => (
                      <ClickableTableRow
                        key={m.id}
                        href={`/dashboard/socio-torcedor/socios/${m.id}/editar?tenantId=${tenantId}`}
                      >
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {m.email}
                          </span>
                        </TableCell>
                        <TableCell>{formatPhoneForDisplay(m.phone) ?? "—"}</TableCell>
                        <TableCell>{m.plan?.name ?? "—"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                              m.status === "active"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : m.status === "suspended"
                                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {STATUS_LABEL[m.status] ?? m.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, m.loyaltyTier || 1) }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3 fill-amber-400 text-amber-400" />
                            ))}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{formatDate(m.joinedAt)}</TableCell>
                        <TableRowActions align="left">
                          <div className="flex gap-1">
                            <Link href={`/dashboard/socio-torcedor/socios/${m.id}/editar?tenantId=${tenantId}`}>
                              <Button variant="ghost" size="icon" aria-label="Editar">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} aria-label="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableRowActions>
                      </ClickableTableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {tenantId && plans.length > 0 && (
            <div className="flex justify-end">
              <Link href={`/dashboard/socio-torcedor/socios/novo?tenantId=${encodeURIComponent(tenantId)}`}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo sócio
                </Button>
              </Link>
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sócio?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O sócio será removido do cadastro.
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
