"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import {
  type AthleteContractHubDto,
  DOCUMENT_CATEGORIES,
  athleteContractDocumentFileUrl,
  uploadAthleteContractDocument,
} from "@/lib/athlete-contract-hub";
import type { PlayerRegistrationProfile } from "@/lib/player-registration-profile";
import { PlayerContractsSection } from "./PlayerContractsSection";
import { PlayerAthleteContractFinanceSection } from "./PlayerAthleteContractFinanceSection";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type { AthleteFinanceLinkRow, AthleteFinancialSummary } from "@/lib/athlete-contract-finance";

type Props = {
  playerId: string;
  tenantId: string;
  tenantName?: string | null;
  profile: PlayerRegistrationProfile;
  onProfileChange: (next: PlayerRegistrationProfile) => void;
  canAccessJuridico: boolean;
  canAccessRh: boolean;
};

const EVAL_OPTIONS = [
  { value: "EM_AVALIACAO", label: "Em avaliação" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "REPROVADO", label: "Reprovado" },
];

const FED_OPTIONS = [
  { value: "PENDENTE", label: "Pendente" },
  { value: "DOCUMENTOS_PENDENTES", label: "Documentos pendentes" },
  { value: "DOCUMENTOS_OK", label: "Documentos OK" },
  { value: "EM_REGISTRO", label: "Em registro" },
  { value: "AGUARDANDO_ASSINATURA", label: "Aguardando assinatura" },
  { value: "AGUARDANDO_TAXAS", label: "Aguardando taxas" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "REJEITADO", label: "Rejeitado" },
  { value: "CANCELADO", label: "Cancelado" },
];

type ContractTypeRow = { id: string; name: string; code: string; active: boolean };

export function PlayerAthleteContractHub({
  playerId,
  tenantId,
  tenantName,
  profile,
  onProfileChange,
  canAccessJuridico,
  canAccessRh,
}: Props) {
  const [hub, setHub] = useState<AthleteContractHubDto | null>(null);
  const [types, setTypes] = useState<ContractTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [evalStatus, setEvalStatus] = useState("EM_AVALIACAO");
  const [fedStatus, setFedStatus] = useState("PENDENTE");
  const [legacyNotes, setLegacyNotes] = useState("");
  const [legacyTypeId, setLegacyTypeId] = useState("");
  const [legacyStart, setLegacyStart] = useState("");
  const [legacyEnd, setLegacyEnd] = useState("");
  const [legacySource, setLegacySource] = useState("arquivo_escaneado");
  const [legacyPartyName, setLegacyPartyName] = useState("");
  const [docOpen, setDocOpen] = useState(false);
  const [docCategory, setDocCategory] = useState("CONTRACTUAL");
  const [docType, setDocType] = useState("");
  const [docDesc, setDocDesc] = useState("");
  const [docIssue, setDocIssue] = useState("");
  const [docExpiry, setDocExpiry] = useState("");
  const [docContractId, setDocContractId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const legacyFileRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<AthleteContractHubDto>(`/players/${playerId}/athlete-contract-hub`);
      setHub(data);
      if (data.evaluation?.status) setEvalStatus(String(data.evaluation.status));
      if (data.federative?.status) setFedStatus(String(data.federative.status));
    } catch {
      setHub(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!tenantId) return;
    void api
      .get<ContractTypeRow[]>(`/tenants/${tenantId}/athlete-contract-types`)
      .then((r) => setTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => setTypes([]));
  }, [tenantId]);

  async function saveEvaluation() {
    try {
      await api.post(`/players/${playerId}/athlete-evaluation`, { status: evalStatus });
      await load();
      setFeedback({ title: "Avaliação", message: "Situação registrada." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar a avaliação.",
      });
    }
  }

  async function saveFederative() {
    try {
      await api.post(`/players/${playerId}/athlete-federative`, { status: fedStatus });
      await load();
      setFeedback({ title: "Federação", message: "Status atualizado." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar o processo federativo.",
      });
    }
  }

  async function startProfessionalization() {
    try {
      await api.post(`/players/${playerId}/athlete-professionalization`, { status: "PENDENTE" });
      await load();
      setFeedback({ title: "Profissionalização", message: "Caso aberto." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível abrir profissionalização.",
      });
    }
  }

  async function addLegacyContract() {
    try {
      let attachmentId: string | undefined;
      const file = legacyFileRef.current?.files?.[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("category", "CONTRACTUAL");
        fd.append("documentType", "contrato_historico");
        fd.append("description", legacyNotes.trim() || "Contrato legado");
        const res = await fetch(`/api/players/${playerId}/athlete-contract-documents`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        if (!res.ok) throw new Error("Falha ao enviar PDF do contrato.");
        const uploaded = (await res.json()) as { id?: string };
        attachmentId = uploaded.id;
      }

      await api.post(`/players/${playerId}/athlete-contracts/legacy`, {
        contractTypeId: legacyTypeId || undefined,
        startDate: legacyStart || undefined,
        endDate: legacyEnd || undefined,
        notes: legacyNotes.trim() || undefined,
        legacySourceLabel: legacySource,
        status: "ARCHIVED",
        parties: legacyPartyName.trim()
          ? [{ partyType: "club", partyName: legacyPartyName.trim() }]
          : undefined,
        attachmentId,
      });
      setLegacyNotes("");
      await load();
      setFeedback({ title: "Contrato legado", message: "Registro histórico salvo." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível adicionar o contrato.",
      });
    }
  }

  async function submitDocument() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setFeedback({ title: "Documento", message: "Selecione um arquivo." });
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", docCategory);
      if (docType.trim()) fd.append("documentType", docType.trim());
      if (docDesc.trim()) fd.append("description", docDesc.trim());
      if (docIssue) fd.append("issueDate", docIssue);
      if (docExpiry) fd.append("expirationDate", docExpiry);
      if (docContractId) fd.append("contractId", docContractId);
      if (hub?.federative && docCategory === "FEDERATIVE") {
        fd.append("federativeProcessId", String((hub.federative as { id: string }).id));
      }
      await uploadAthleteContractDocument(playerId, fd);
      setDocOpen(false);
      if (fileRef.current) fileRef.current.value = "";
      await load();
      setFeedback({ title: "Documento", message: "Anexo registrado." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha no upload.",
      });
    }
  }

  function openDossierPdf() {
    window.open(`/api/players/${playerId}/contractual-dossier/pdf`, "_blank", "noopener,noreferrer");
  }

  const s = hub?.summary;
  const canManage = Boolean(hub?.access?.canManage);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo executivo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Avaliação: </span>
            <span className="font-medium">{s?.athleteSituation ?? (loading ? "…" : "—")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Federação: </span>
            <span className="font-medium">{s?.federativeSituation ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Profissionalização: </span>
            <span className="font-medium">{s?.professionalSituation ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Contrato principal: </span>
            <span className="font-medium">{s?.primaryContractType ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Vigência: </span>
            <span className="font-medium">
              {s?.startDate ?? "—"} → {s?.endDate ?? "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Dias p/ vencimento: </span>
            <span className="font-medium">{s?.daysUntilExpiry ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Assinatura: </span>
            <span className="font-medium">{s?.signatureStatus ?? "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Pend. financeiras: </span>
            <span className="font-medium">
              {s?.financialPendingCount != null ? s.financialPendingCount : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Pend. documentos: </span>
            <span className="font-medium">{s?.documentPendingCount ?? "—"}</span>
          </div>
          {s?.pendingItems?.length ? (
            <p className="sm:col-span-2 lg:col-span-3 text-amber-600 dark:text-amber-400">
              Alertas: {s.pendingItems.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={() => {
              void api
                .post(`/players/${playerId}/athlete-contracts`, {
                  status: "DRAFT",
                  clubName: tenantName ?? undefined,
                })
                .then(() => load())
                .then(() =>
                  setFeedback({ title: "Contrato", message: "Rascunho criado na gestão nativa." }),
                )
                .catch((e) =>
                  setFeedback({
                    title: "Erro",
                    message: e instanceof Error ? e.message : "Não foi possível criar contrato.",
                  }),
                );
            }}
          >
            Adicionar contrato
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setDocOpen(true)}>
            Adicionar documento
          </Button>
        ) : null}
        {canManage ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void startProfessionalization()}>
            Solicitar profissionalização
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="secondary" onClick={openDossierPdf}>
          Gerar dossiê contratual (PDF)
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={`/dashboard/relatorios/futebol/contratos-atletas?tenantId=${tenantId}`}>
            Abrir relatório
          </Link>
        </Button>
        {canAccessJuridico ? (
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href={`/dashboard/juridico/${playerId}`}>Jurídico</Link>
          </Button>
        ) : null}
        {canAccessRh ? (
          <Button type="button" size="sm" variant="ghost" asChild>
            <Link href="/dashboard/adm/rh">RH</Link>
          </Button>
        ) : null}
      </div>

      <PlayerAthleteContractFinanceSection
        playerId={playerId}
        tenantId={tenantId}
        canViewFinancial={Boolean(hub?.access?.canViewFinancial)}
        canManage={canManage}
        financeLinks={(hub?.financeLinks ?? []) as AthleteFinanceLinkRow[]}
        financialSummary={
          hub?.financialSummary && !("restricted" in hub.financialSummary)
            ? (hub.financialSummary as AthleteFinancialSummary)
            : null
        }
        contracts={(hub?.contracts ?? []).map((c) => {
          const row = c as { id: string; contractType?: { name?: string } };
          return {
            id: row.id,
            label: row.contractType?.name ?? `Contrato ${row.id.slice(0, 8)}`,
          };
        })}
        federativeId={
          hub?.federative && typeof (hub.federative as { id?: string }).id === "string"
            ? String((hub.federative as { id: string }).id)
            : null
        }
        onReload={load}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Documentos do hub</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hub?.attachments?.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    {loading ? "Carregando…" : "Nenhum documento."}
                  </TableCell>
                </TableRow>
              ) : (
                hub.attachments.map((a) => {
                  const row = a as {
                    id: string;
                    category?: string;
                    documentType?: string;
                    description?: string;
                    issueDate?: string;
                    expirationDate?: string;
                    uploadedByEmail?: string;
                    uploadedAt?: string;
                    contractLabel?: string;
                  };
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.documentType ?? "—"}</TableCell>
                      <TableCell>
                        {row.description ?? "—"}
                        {row.contractLabel ? (
                          <span className="block text-xs text-muted-foreground">{row.contractLabel}</span>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.issueDate?.slice(0, 10) ?? "—"}</TableCell>
                      <TableCell>{row.expirationDate?.slice(0, 10) ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="link" asChild>
                          <a
                            href={athleteContractDocumentFileUrl(playerId, row.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <NativeSelect value={evalStatus} onChange={(e) => setEvalStatus(e.target.value)} className="sm:max-w-xs">
            {EVAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="button" size="sm" onClick={() => void saveEvaluation()} disabled={!canManage}>
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Federação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <NativeSelect value={fedStatus} onChange={(e) => setFedStatus(e.target.value)} className="sm:max-w-xs">
            {FED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="button" size="sm" onClick={() => void saveFederative()} disabled={!canManage}>
            Salvar
          </Button>
          {evalStatus === "APROVADO" && canManage ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFedStatus("PENDENTE");
                void saveFederative();
              }}
            >
              Iniciar/atualizar federação
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Adicionar contrato existente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <NativeSelect value={legacyTypeId} onChange={(e) => setLegacyTypeId(e.target.value)}>
            <option value="">Tipo de contrato…</option>
            {types.filter((t) => t.active).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
          <Input
            type="date"
            className="text-foreground"
            value={legacyStart}
            onChange={(e) => setLegacyStart(e.target.value)}
            aria-label="Início"
          />
          <Input
            type="date"
            className="text-foreground"
            value={legacyEnd}
            onChange={(e) => setLegacyEnd(e.target.value)}
            aria-label="Fim"
          />
          <Input
            value={legacyPartyName}
            onChange={(e) => setLegacyPartyName(e.target.value)}
            placeholder="Clube / parte"
          />
          <NativeSelect value={legacySource} onChange={(e) => setLegacySource(e.target.value)} className="sm:col-span-2">
            <option value="arquivo_escaneado">Fonte: PDF escaneado</option>
            <option value="arquivo_digital">Fonte: arquivo digital</option>
            <option value="planilha_historica">Fonte: planilha histórica</option>
          </NativeSelect>
          <Textarea
            className="sm:col-span-2"
            value={legacyNotes}
            onChange={(e) => setLegacyNotes(e.target.value)}
            placeholder="Observações"
            rows={2}
          />
          <Input ref={legacyFileRef} type="file" accept=".pdf,image/*" className="sm:col-span-2 text-foreground" />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="sm:col-span-2 w-fit"
            disabled={!canManage}
            onClick={() => void addLegacyContract()}
          >
            Salvar contrato histórico
          </Button>
        </CardContent>
      </Card>

      <PlayerContractsSection
        playerId={playerId}
        tenantName={tenantName}
        profile={profile}
        onProfileChange={onProfileChange}
        canAccessJuridico={canAccessJuridico}
        canAccessRh={canAccessRh}
      />

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <NativeSelect value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
            <Input value={docType} onChange={(e) => setDocType(e.target.value)} placeholder="Tipo do documento" />
            <Textarea value={docDesc} onChange={(e) => setDocDesc(e.target.value)} placeholder="Descrição" rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                className="text-foreground"
                value={docIssue}
                onChange={(e) => setDocIssue(e.target.value)}
                aria-label="Emissão"
              />
              <Input
                type="date"
                className="text-foreground"
                value={docExpiry}
                onChange={(e) => setDocExpiry(e.target.value)}
                aria-label="Validade"
              />
            </div>
            <NativeSelect value={docContractId} onChange={(e) => setDocContractId(e.target.value)}>
              <option value="">Vínculo contrato (opcional)</option>
              {(hub?.contracts ?? []).map((c) => (
                <option key={String((c as { id: string }).id)} value={String((c as { id: string }).id)}>
                  {(c as { contractType?: { name?: string } }).contractType?.name ?? String((c as { id: string }).id)}
                </option>
              ))}
            </NativeSelect>
            <Input ref={fileRef} type="file" accept=".pdf,image/*" className="text-foreground" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDocOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submitDocument()}>
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
