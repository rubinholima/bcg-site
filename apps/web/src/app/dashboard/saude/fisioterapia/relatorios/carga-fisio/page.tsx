"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PhysioReportPrintToolbar } from "@/components/dashboard/fisioterapia/PhysioReportPrintToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PhysioReportFilters } from "@/components/dashboard/fisioterapia/PhysioReportFilters";
import type { PhysioReportsDashboard } from "@/types/fisioterapia";

export default function FisioterapiaCargaFisioReportPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<PhysioReportsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data: res } = await api.get<PhysioReportsDashboard>(`/fisioterapia/reports/dashboard?${params}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, from, to]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
      return;
    }
    void load();
  }, [authLoading, canAccessModule, load, router]);

  const chartStaff = useMemo(
    () =>
      (data?.byStaff ?? []).map((s) => ({
        name: s.staffName,
        Individual: s.individual,
        Recovery: s.group,
        Total: s.individual + s.group,
      })),
    [data?.byStaff],
  );

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
        <div>
          <Link href="/dashboard/saude/fisioterapia" className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground">
            ← Atendimentos
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <Users className="h-8 w-8" />
            Carga por fisioterapeuta
          </h1>
        </div>
        <PhysioReportPrintToolbar
          kind="carga"
          tenantId={tenantId}
          category={category}
          from={from}
          to={to}
          data={data}
          previewTitle="Pré-visualização — Carga por fisio"
        />
      </div>

      <div className="print:hidden">
        <PhysioReportFilters
          tenantId={tenantId}
          category={category}
          from={from}
          to={to}
          onTenantChange={setTenantId}
          onCategoryChange={setCategory}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => void load()}
          loading={loading}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="py-12 text-center text-muted-foreground">Não foi possível carregar.</p>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gráfico</CardTitle>
              <CardDescription>Atendimentos registrados com fisio selecionado</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartStaff.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Sem registros com fisioterapeuta no período. Cadastre em Saúde → Cadastros → Fisioterapeutas.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartStaff} margin={{ top: 8, right: 8, left: -16, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Legend />
                    <Bar dataKey="Individual" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recovery" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalhamento</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fisioterapeuta</TableHead>
                    <TableHead className="text-right">Individual</TableHead>
                    <TableHead className="text-right">Recovery</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados</TableCell>
                    </TableRow>
                  ) : (
                    data.byStaff.map((s) => (
                      <TableRow key={s.staffId ?? s.staffName}>
                        <TableCell className="font-medium">{s.staffName}</TableCell>
                        <TableCell className="text-right">{s.individual}</TableCell>
                        <TableCell className="text-right">{s.group}</TableCell>
                        <TableCell className="text-right font-semibold">{s.individual + s.group}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
