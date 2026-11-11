"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { AthleteContractHubDto } from "@/lib/athlete-contract-hub";
import type { PlayerRegistrationProfile } from "@/lib/player-registration-profile";
import { PlayerContractsSection } from "./PlayerContractsSection";
import { FeedbackModal } from "@/components/ui/feedback-modal";

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
  const [loading, setLoading] = useState(true);
  const [evalStatus, setEvalStatus] = useState("EM_AVALIACAO");
  const [fedStatus, setFedStatus] = useState("PENDENTE");
  const [legacyNotes, setLegacyNotes] = useState("");
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

  async function addLegacyContract() {
    try {
      await api.post(`/players/${playerId}/athlete-contracts/legacy`, {
        notes: legacyNotes.trim() || undefined,
        legacySourceLabel: "upload_manual",
        status: "ARCHIVED",
      });
      setLegacyNotes("");
      await load();
      setFeedback({ title: "Contrato legado", message: "Registro histórico adicionado." });
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível adicionar o contrato.",
      });
    }
  }

  async function openDossier() {
    try {
      const { data } = await api.get(`/players/${playerId}/contractual-dossier`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setFeedback({ title: "Dossiê", message: "Não foi possível gerar o dossiê agora." });
    }
  }

  const s = hub?.summary;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumo contratual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Situação do atleta: </span>
            <span className="font-medium">{s?.athleteSituation ?? (loading ? "…" : "—")}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Situação federativa: </span>
            <span className="font-medium">{s?.federativeSituation ?? "—"}</span>
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
            <span className="text-muted-foreground">Assinaturas: </span>
            <span className="font-medium">{s?.signatureStatus ?? "—"}</span>
          </div>
          {s?.pendingItems?.length ? (
            <p className="sm:col-span-2 lg:col-span-3 text-amber-600 dark:text-amber-400">
              Pendências: {s.pendingItems.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => void openDossier()}>
          Dossiê contratual
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href={`/dashboard/relatorios/futebol/contratos-atletas?tenantId=${tenantId}`}>
            Relatório dinâmico
          </Link>
        </Button>
      </div>

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
          <Button type="button" size="sm" onClick={() => void saveEvaluation()}>
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Federação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <NativeSelect value={fedStatus} onChange={(e) => setFedStatus(e.target.value)} className="sm:max-w-xs">
            {FED_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
          <Button type="button" size="sm" onClick={() => void saveFederative()}>
            Salvar
          </Button>
          {evalStatus === "APROVADO" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setFedStatus("PENDENTE");
                void saveFederative();
              }}
            >
              Iniciar registro federativo
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Adicionar contrato existente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={legacyNotes}
            onChange={(e) => setLegacyNotes(e.target.value)}
            placeholder="Origem, observações, referência do arquivo"
            rows={2}
          />
          <Button type="button" size="sm" variant="secondary" onClick={() => void addLegacyContract()}>
            Arquivar contrato histórico
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

      <FeedbackModal
        open={!!feedback}
        onOpenChange={() => setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
      />
    </div>
  );
}
