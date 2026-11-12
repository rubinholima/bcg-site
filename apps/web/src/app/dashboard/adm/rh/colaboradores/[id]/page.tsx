"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { EmployeeTimeAndEpiSection } from "../../components/EmployeeTimeAndEpiSection";
import { api as rhApi } from "@/lib/api";

type UnifiedProfile = {
  employee: {
    id: string;
    name: string;
    code?: string | null;
    cpf?: string | null;
    email?: string | null;
    type: string;
    tenantId?: string;
    tenant?: { name?: string };
    player?: { name?: string; category?: string | null } | null;
    employments?: Array<{
      id: string;
      status: string;
      contractType: string;
      startDate: string;
      tenant?: { name?: string };
      jobRole?: { name?: string };
    }>;
  };
  documents: Array<{ id: string; documentType: string; createdAt: string }>;
  hiringRequests: Array<{ id: string; status: string; contractType: string }>;
  athleteContracts?: Array<{
    id: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    clubName?: string | null;
    employmentContractId?: string | null;
  }>;
  workRegime?: { workRegime?: { name?: string }; effectiveFrom?: string } | null;
  timeBank?: { balanceHours?: number; movements?: Array<{ movementType: string; hours: number | string; movementDate: string }> };
  occurrences?: Array<{ occurrenceType: string; occurrenceDate: string; hours?: number | string | null }>;
  payrollSnapshots?: Array<{ payrollClosing?: { referenceMonth?: string; status?: string } }>;
  payslips?: Array<{ referenceMonth: string; status: string }>;
  epiDeliveries?: Array<{ catalogItem?: { name?: string }; deliveryDate: string; status: string }>;
  athletePayrollImpacts?: Array<{ impactType: string; status: string; ourPayrollAmount?: number | string | null }>;
  athletePendingActions?: Array<{ title: string; status: string }>;
};

export default function RhColaboradorUnifiedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const [data, setData] = useState<UnifiedProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [epiCatalog, setEpiCatalog] = useState<Array<{ id: string; name: string }>>([]);

  const loadProfile = useCallback(() => {
    if (!canAccessModule("adm_rh") || !id) return;
    setLoading(true);
    api
      .get<UnifiedProfile>(`/rh/employees/${id}/unified-profile`)
      .then((res) => {
        setData(res.data);
        const tenantKey = res.data?.employee.tenantId;
        if (tenantKey) {
          rhApi
            .get<Array<{ id: string; name: string }>>(`/rh/epi/catalog?tenantId=${encodeURIComponent(tenantKey)}`)
            .then((cat) => setEpiCatalog(Array.isArray(cat.data) ? cat.data : []));
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [canAccessModule, id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (authLoading) {
    return <p className="text-muted-foreground py-8 text-center">Carregando…</p>;
  }

  if (!canAccessModule("adm_rh")) {
    router.replace("/403");
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" asChild className="min-h-[44px]">
        <Link href="/dashboard/adm/rh">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao RH
        </Link>
      </Button>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="text-muted-foreground">Colaborador não encontrado.</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{data.employee.name}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Matrícula:</span> {data.employee.code ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">CPF:</span> {data.employee.cpf ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">E-mail:</span> {data.employee.email ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Empresa:</span> {data.employee.tenant?.name ?? "—"}
              </p>
              {data.employee.player && (
                <p className="sm:col-span-2">
                  <span className="text-muted-foreground">Atleta vinculado:</span>{" "}
                  {data.employee.player.name}
                  {data.employee.player.category ? ` (${data.employee.player.category})` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vínculos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(data.employee.employments ?? []).length === 0 ? (
                <p className="text-muted-foreground">Nenhum vínculo.</p>
              ) : (
                data.employee.employments!.map((e) => (
                  <div key={e.id} className="border border-border rounded-md p-3">
                    <p className="font-medium">{e.jobRole?.name ?? "Cargo"} · {e.contractType}</p>
                    <p className="text-muted-foreground">
                      {e.tenant?.name} — desde {formatDateDayMonYear(e.startDate)} — {e.status}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documentos</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {data.documents.length === 0 ? (
                <p className="text-muted-foreground">Sem documentos cadastrados.</p>
              ) : (
                data.documents.map((d) => (
                  <p key={d.id}>
                    {d.documentType} — {formatDateDayMonYear(d.createdAt)}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          {(data.athleteContracts?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contrato de atleta (leitura)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {data.athleteContracts!.map((c) => (
                  <AthleteContractReadOnly key={c.id} contract={c} />
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jornada e ponto</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <EmployeeTimeAndEpiSection
                employeeId={data.employee.id}
                employmentId={data.employee.employments?.[0]?.id}
                employments={(data.employee.employments ?? []).map((e) => ({
                  value: e.id,
                  label: `${e.jobRole?.name ?? "Vínculo"} · ${e.contractType}`,
                }))}
                catalog={epiCatalog}
                onRefresh={loadProfile}
              />
              <p>
                Jornada atual:{" "}
                {data.workRegime?.workRegime?.name
                  ? `${data.workRegime.workRegime.name} (desde ${formatDateDayMonYear(data.workRegime.effectiveFrom ?? "")})`
                  : "—"}
              </p>
              <p>Banco de horas: {data.timeBank?.balanceHours != null ? `${data.timeBank.balanceHours} h` : "—"}</p>
              {(data.occurrences ?? []).slice(0, 5).map((o, i) => (
                <p key={i} className="text-muted-foreground">
                  {o.occurrenceType} — {formatDateDayMonYear(o.occurrenceDate)}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Folha e holerites</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {(data.payrollSnapshots ?? []).length === 0 && (data.payslips ?? []).length === 0 ? (
                <p className="text-muted-foreground">Sem competências recentes.</p>
              ) : (
                <>
                  {(data.payrollSnapshots ?? []).map((p, i) => (
                    <p key={`snap-${i}`}>
                      Folha {p.payrollClosing?.referenceMonth ? formatDateDayMonYear(p.payrollClosing.referenceMonth) : "—"} —{" "}
                      {p.payrollClosing?.status ?? ""}
                    </p>
                  ))}
                  {(data.payslips ?? []).map((p, i) => (
                    <p key={`pay-${i}`}>
                      Holerite {formatDateDayMonYear(p.referenceMonth)} — {p.status.replace(/_/g, " ")}
                    </p>
                  ))}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">EPI</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {(data.epiDeliveries ?? []).length === 0 ? (
                <p className="text-muted-foreground">Sem entregas registradas.</p>
              ) : (
                data.epiDeliveries!.map((d, i) => (
                  <p key={i}>
                    {d.catalogItem?.name ?? "Item"} — {formatDateDayMonYear(d.deliveryDate)} — {d.status}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          {(data.athletePayrollImpacts?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Impacto folha (atleta)</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {data.athletePayrollImpacts!.map((imp, i) => (
                  <p key={i}>
                    {imp.impactType} — {imp.status}
                    {imp.ourPayrollAmount != null ? ` · Nossa parte: ${imp.ourPayrollAmount}` : ""}
                  </p>
                ))}
                {(data.athletePendingActions ?? []).map((a, i) => (
                  <p key={`act-${i}`} className="text-amber-400">
                    Pendência: {a.title}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contratações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {data.hiringRequests.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma solicitação ligada.</p>
              ) : (
                data.hiringRequests.map((h) => (
                  <p key={h.id}>
                    {h.contractType} — {h.status}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function AthleteContractReadOnly({
  contract: c,
}: {
  contract: {
    id: string;
    status: string;
    startDate?: string | null;
    endDate?: string | null;
    clubName?: string | null;
    employmentContractId?: string | null;
  };
}) {
  return (
    <div className="border border-border rounded-md p-3">
      <p className="font-medium">
        {c.clubName ?? "Contrato"} — {c.status}
      </p>
      <p className="text-muted-foreground text-xs">
        {c.startDate ? formatDateDayMonYear(c.startDate) : "—"} até{" "}
        {c.endDate ? formatDateDayMonYear(c.endDate) : "—"}
        {c.employmentContractId ? " · Vínculo RH ligado" : ""}
      </p>
    </div>
  );
}

