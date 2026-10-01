"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelectField } from "@/components/ui/native-select";
import { PageSection } from "@/components/dashboard/cup360/Cup360PageShell";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import {
  formatNegotiationMoney,
  INSTALLMENT_STATUS_LABELS,
  NEGOTIATION_STATUS_LABELS,
  NEGOTIATION_STATUSES,
  NEGOTIATION_TYPE_LABELS,
  NEGOTIATION_TYPES,
} from "@/lib/player-negotiation-labels";
import {
  buildNegotiationPayload,
  emptyNegotiationForm,
  negotiationToForm,
  NEGOTIATION_AUDIT_ACTION_LABELS,
  type NegotiationFormState,
  type PlayerNegotiationFull,
} from "@/lib/player-negotiation-types";
import type { PlayerRegistrationProfile } from "@/lib/player-registration-profile";
import { cn } from "@/lib/utils";

type VisitingTeam = { id: string; name: string };
type TenantOption = { id: string; name: string };

type PlayerOption = {
  id: string;
  name: string;
  jerseyNumber?: number | null;
  category?: string | null;
  position?: string | null;
  tenantId?: string;
};
type LegalDocOption = { id: string; name: string; type: string };

type SectionId = "comercial" | "parcelas" | "documentos" | "auditoria" | "efeitos";

export interface NegotiationFormProps {
  mode: "create" | "edit";
  /** Apenas default inicial — editável no formulário (create). */
  defaultTenantId?: string;
  negotiationId?: string | null;
  initialPlayerId?: string;
  onCancel: () => void;
  /** Após salvar; em create recebe id da negociação criada. */
  onSaved: (negotiationId?: string) => void;
}

function dateInput(v: string | null | undefined) {
  return v ? v.slice(0, 10) : "";
}

const dateInputClass =
  "text-foreground [&::-webkit-datetime-edit]:text-foreground";

function NegotiationFormBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "space-y-3 rounded-lg border border-border/80 bg-muted/10 p-4",
        className,
      )}
    >
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function NegotiationForm({
  mode,
  defaultTenantId = "",
  negotiationId,
  initialPlayerId,
  onCancel,
  onSaved,
}: NegotiationFormProps) {
  const [formTenantId, setFormTenantId] = useState(defaultTenantId);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ playerId?: string; counterparty?: string; tenant?: string }>(
    {},
  );
  const [section, setSection] = useState<SectionId>("comercial");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [negotiation, setNegotiation] = useState<PlayerNegotiationFull | null>(null);
  const [persistedId, setPersistedId] = useState<string | null>(null);
  const [form, setForm] = useState<NegotiationFormState>(() =>
    emptyNegotiationForm(initialPlayerId ?? ""),
  );

  const [playerSearch, setPlayerSearch] = useState("");
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [visitingTeams, setVisitingTeams] = useState<VisitingTeam[]>([]);
  const [legalDocs, setLegalDocs] = useState<LegalDocOption[]>([]);
  const [playerProfile, setPlayerProfile] = useState<PlayerRegistrationProfile | null>(null);

  const [installmentDraft, setInstallmentDraft] = useState({ amount: "", dueDate: "" });
  const [financeiroTarget, setFinanceiroTarget] = useState<string | null>(null);
  const [financeiroTipo, setFinanceiroTipo] = useState<"pagar" | "receber">("receber");
  const [effectiveConfirm, setEffectiveConfirm] = useState(false);
  const [feedback, setFeedback] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadName, setUploadName] = useState("");
  const [linkLegalId, setLinkLegalId] = useState("");

  const activeNegotiationId = negotiationId ?? persistedId;
  const isPersisted = !!activeNegotiationId;
  const isEdit = mode === "edit" && !!negotiationId;
  const playerId = form.playerId || negotiation?.playerId || initialPlayerId || "";

  const loadPlayers = useCallback(async () => {
    if (!formTenantId) {
      setPlayers([]);
      return;
    }
    setPlayersLoading(true);
    try {
      const params = new URLSearchParams({ tenantId: formTenantId });
      const { data } = await api.get<PlayerOption[]>(`/players?${params}`);
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
      setFeedback({
        open: true,
        title: "Elenco",
        message: "Não foi possível carregar a lista de atletas deste clube.",
      });
    } finally {
      setPlayersLoading(false);
    }
  }, [formTenantId]);

  const reloadNegotiation = useCallback(async () => {
    if (!activeNegotiationId) return;
    setLoading(true);
    try {
      const { data } = await api.get<PlayerNegotiationFull>(
        `/player-negotiations/${activeNegotiationId}`,
      );
      setNegotiation(data);
      setForm(negotiationToForm(data));
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro",
        message: e instanceof Error ? e.message : "Falha ao carregar negociação.",
      });
    } finally {
      setLoading(false);
    }
  }, [activeNegotiationId]);

  useEffect(() => {
    setTenantsLoading(true);
    api
      .get<TenantOption[]>("/tenants?clubsOnly=1")
      .then(({ data }) => setTenants(Array.isArray(data) ? data : []))
      .finally(() => setTenantsLoading(false));
  }, []);

  useEffect(() => {
    setSection("comercial");
    setPlayerSearch("");
    setPersistedId(null);
    setFormTenantId(defaultTenantId);
    if (isEdit) void reloadNegotiation();
    else {
      setNegotiation(null);
      setForm(emptyNegotiationForm(initialPlayerId ?? ""));
    }
  }, [isEdit, initialPlayerId, defaultTenantId, negotiationId, reloadNegotiation]);

  useEffect(() => {
    if (!persistedId || isEdit) return;
    void reloadNegotiation();
  }, [persistedId, isEdit, reloadNegotiation]);

  useEffect(() => {
    if (negotiation?.tenantId && isEdit) {
      setFormTenantId(negotiation.tenantId);
    }
  }, [negotiation?.tenantId, isEdit]);

  useEffect(() => {
    void loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    api.get<VisitingTeam[]>("/visiting-teams").then(({ data }) => {
      setVisitingTeams(Array.isArray(data) ? data : []);
    });
  }, []);

  useEffect(() => {
    if (!formTenantId || !form.playerId || playersLoading) return;
    if (players.length > 0 && !players.some((p) => p.id === form.playerId)) {
      setForm((f) => ({ ...f, playerId: "" }));
    }
  }, [formTenantId, players, form.playerId, playersLoading]);

  useEffect(() => {
    if (!playerId) {
      setLegalDocs([]);
      return;
    }
    api.get<LegalDocOption[]>(`/players/${playerId}/legal-documents`).then(({ data }) => {
      setLegalDocs(Array.isArray(data) ? data : []);
    });
  }, [playerId]);

  useEffect(() => {
    if (form.status !== "effective" || !playerId) {
      setPlayerProfile(null);
      return;
    }
    api
      .get<{ registrationProfile?: PlayerRegistrationProfile | null }>(`/players/${playerId}`)
      .then(({ data }) => {
        setPlayerProfile((data?.registrationProfile as PlayerRegistrationProfile) ?? null);
      })
      .catch(() => setPlayerProfile(null));
  }, [form.status, playerId]);

  const filteredPlayers = useMemo(() => {
    const q = playerSearch.trim().toLowerCase();
    const base = !q
      ? players
      : players.filter((p) => {
          const hay =
            `${p.name} ${p.category ?? ""} ${p.position ?? ""} ${p.jerseyNumber ?? ""}`.toLowerCase();
          return hay.includes(q);
        });
    return base.slice(0, 150);
  }, [players, playerSearch]);

  const handleTeamPick = (teamId: string) => {
    const team = visitingTeams.find((t) => t.id === teamId);
    setForm((f) => ({
      ...f,
      visitingTeamId: teamId,
      counterpartyMode: teamId ? "team" : "free",
      counterpartyName: team?.name ?? f.counterpartyName,
    }));
  };

  const handleSave = async () => {
    const errors: typeof fieldErrors = {};
    if (!formTenantId) errors.tenant = "Selecione o clube.";
    if (!form.playerId) errors.playerId = "Selecione o atleta.";
    if (!form.counterpartyName.trim()) errors.counterparty = "Informe clube ou entidade (contraparte).";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      if (form.futureAcquisitionRightsJson.trim()) {
        JSON.parse(form.futureAcquisitionRightsJson);
      }
      if (isPersisted && activeNegotiationId) {
        const payload = buildNegotiationPayload(formTenantId, form, false);
        await api.patch(`/player-negotiations/${activeNegotiationId}`, payload);
        await reloadNegotiation();
        onSaved(activeNegotiationId);
      } else {
        const payload = buildNegotiationPayload(formTenantId, form, true);
        const { data } = await api.post<PlayerNegotiationFull>("/player-negotiations", payload);
        setPersistedId(data.id);
        setNegotiation(data);
        setForm(negotiationToForm(data));
        onSaved(data.id);
      }
    } catch (e) {
      setFeedback({
        open: true,
        title: "Erro ao salvar",
        message:
          e instanceof SyntaxError
            ? "JSON de direitos futuros inválido."
            : e instanceof Error
              ? e.message
              : "Falha ao salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEffective = async () => {
    if (!activeNegotiationId) return;
    setSaving(true);
    try {
      await api.post(`/player-negotiations/${activeNegotiationId}/effective`, {});
      setEffectiveConfirm(false);
      await reloadNegotiation();
      onSaved();
      setSection("efeitos");
    } catch (e) {
      setFeedback({
        open: true,
        title: "Efetivação",
        message: e instanceof Error ? e.message : "Não foi possível efetivar.",
      });
    } finally {
      setSaving(false);
    }
  };

  const addInstallment = async () => {
    if (!activeNegotiationId || !installmentDraft.amount || !installmentDraft.dueDate) return;
    const nextSeq =
      (negotiation?.installments.reduce((m, i) => Math.max(m, i.sequence), 0) ?? 0) + 1;
    try {
      await api.post(`/player-negotiations/${activeNegotiationId}/installments`, {
        installments: [
          {
            sequence: nextSeq,
            amount: Number(installmentDraft.amount),
            dueDate: installmentDraft.dueDate,
          },
        ],
      });
      setInstallmentDraft({ amount: "", dueDate: "" });
      await reloadNegotiation();
      onSaved();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Parcela",
        message: e instanceof Error ? e.message : "Erro ao adicionar parcela.",
      });
    }
  };

  const markInstallmentPaid = async (installmentId: string) => {
    try {
      await api.patch(`/player-negotiations/installments/${installmentId}`, { status: "paid" });
      await reloadNegotiation();
      onSaved();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Parcela",
        message: e instanceof Error ? e.message : "Erro ao baixar parcela.",
      });
    }
  };

  const linkFinanceiro = async () => {
    if (!financeiroTarget) return;
    try {
      await api.post(`/player-negotiations/installments/${financeiroTarget}/financeiro`, {
        tipo: financeiroTipo,
        contraparte: form.counterpartyName.trim() || undefined,
      });
      setFinanceiroTarget(null);
      await reloadNegotiation();
      onSaved();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Financeiro",
        message: e instanceof Error ? e.message : "Erro ao vincular lançamento.",
      });
    }
  };

  const uploadDocument = async (file: File) => {
    if (!activeNegotiationId || !playerId) return;
    const fd = new FormData();
    fd.append("file", file);
    const q = new URLSearchParams({
      playerId,
      name: uploadName.trim() || file.name,
    });
    await api.postForm(`/player-negotiations/${activeNegotiationId}/documents/upload?${q}`, fd);
    setUploadName("");
    await reloadNegotiation();
    onSaved();
  };

  const linkLegalDocument = async () => {
    if (!activeNegotiationId || !linkLegalId) return;
    const doc = legalDocs.find((d) => d.id === linkLegalId);
    if (!doc || !playerId) return;
    try {
      await api.post(`/player-negotiations/${activeNegotiationId}/documents`, {
        name: doc.name,
        fileUrl: `/api/players/${playerId}/legal-documents/${doc.id}/download`,
        legalDocumentId: doc.id,
      });
      setLinkLegalId("");
      await reloadNegotiation();
      onSaved();
    } catch (e) {
      setFeedback({
        open: true,
        title: "Documento jurídico",
        message: e instanceof Error ? e.message : "Erro ao vincular.",
      });
    }
  };

  const sections: { id: SectionId; label: string; show: boolean }[] = [
    { id: "comercial", label: "Dados da negociação", show: true },
    { id: "parcelas", label: "Parcelas", show: isPersisted },
    { id: "documentos", label: "Documentos", show: isPersisted },
    { id: "auditoria", label: "Auditoria", show: isPersisted },
    {
      id: "efeitos",
      label: "Pós-efetivação",
      show: isPersisted && form.status === "effective",
    },
  ];

  const canEffective =
    isPersisted &&
    activeNegotiationId &&
    form.status !== "effective" &&
    form.status !== "cancelled" &&
    form.status !== "expired";

  const loanInfo = playerProfile?.loan;
  const economicRights = playerProfile?.contracts?.economicRights ?? [];
  const sportsSituation = (
    playerProfile?.sports as { situation?: string } | undefined
  )?.situation;

  const visibleSections = sections.filter((s) => s.show);

  return (
    <>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {visibleSections.length > 1 ? (
            <nav
              className="flex flex-wrap gap-0 border-b border-border/80"
              aria-label="Seções da negociação"
            >
              {visibleSections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "min-h-[44px] border-b-2 px-3 text-sm font-medium transition-colors -mb-px",
                    section === s.id
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setSection(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </nav>
          ) : null}

          <div className="space-y-6">
            {section === "comercial" && (
              <div className="space-y-6">
                <PageSection title="Dados da negociação">
                  <NegotiationFormBlock title="Clube e atleta">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Clube *</Label>
                      {isEdit ? (
                        <p className="text-sm text-foreground">
                          {tenants.find((t) => t.id === formTenantId)?.name ?? formTenantId}
                        </p>
                      ) : (
                        <NativeSelectField
                          value={formTenantId}
                          onChange={(e) => {
                            setFormTenantId(e.target.value);
                            setFieldErrors((err) => ({ ...err, tenant: undefined }));
                          }}
                          placeholder="Selecione o clube…"
                          disabled={tenantsLoading}
                          options={tenants.map((t) => ({ value: t.id, label: t.name }))}
                        />
                      )}
                      {fieldErrors.tenant ? (
                        <p className="text-sm text-destructive">{fieldErrors.tenant}</p>
                      ) : null}
                    </div>
                    {!isPersisted ? (
                      <>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Buscar atleta</Label>
                          <Input
                            value={playerSearch}
                            onChange={(e) => setPlayerSearch(e.target.value)}
                            placeholder="Nome, categoria ou posição…"
                            className="text-foreground"
                            disabled={!formTenantId}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label>Atleta *</Label>
                            <span className="text-xs text-muted-foreground">
                              {!formTenantId
                                ? "Selecione o clube acima"
                                : playersLoading
                                  ? "Carregando elenco…"
                                  : `${filteredPlayers.length} atleta(s)`}
                            </span>
                          </div>
                          {fieldErrors.playerId ? (
                            <p className="text-sm text-destructive">{fieldErrors.playerId}</p>
                          ) : null}
                          <div className="max-h-64 overflow-y-auto rounded-lg border border-border/80 bg-zinc-950/40 lg:max-h-80">
                            {!formTenantId ? (
                              <p className="p-4 text-sm text-muted-foreground">
                                Escolha o clube para carregar o elenco.
                              </p>
                            ) : playersLoading ? (
                              <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : filteredPlayers.length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground">
                                Nenhum atleta neste clube com o filtro informado.
                              </p>
                            ) : (
                                <ul className="divide-y divide-border/50">
                                  {filteredPlayers.map((p) => {
                                    const selected = form.playerId === p.id;
                                    return (
                                      <li key={p.id}>
                                        <button
                                          type="button"
                                          className={cn(
                                            "flex w-full min-h-[44px] flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors sm:flex-row sm:items-center sm:justify-between",
                                            selected
                                              ? "bg-primary/15 text-foreground"
                                              : "hover:bg-muted/30",
                                          )}
                                          onClick={() => {
                                            setForm((f) => ({ ...f, playerId: p.id }));
                                            setFieldErrors((err) => ({ ...err, playerId: undefined }));
                                          }}
                                        >
                                          <span className="font-medium">
                                            {p.jerseyNumber != null ? `${p.jerseyNumber} · ` : ""}
                                            {p.name}
                                          </span>
                                          <span className="text-xs text-muted-foreground">
                                            {[p.category, p.position].filter(Boolean).join(" · ") ||
                                              "—"}
                                          </span>
                                        </button>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="sm:col-span-2 text-sm">
                          <span className="text-muted-foreground">Atleta: </span>
                          <span className="font-medium text-foreground">
                            {negotiation?.player.name}
                          </span>
                        </div>
                      )}
                  </NegotiationFormBlock>
                </PageSection>

                <PageSection title="Operação">
                  <NegotiationFormBlock title="Tipo e status">
                    <div className="space-y-1">
                      <Label>Tipo</Label>
                      <NativeSelect
                        value={form.negotiationType}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, negotiationType: e.target.value }))
                        }
                      >
                        {NEGOTIATION_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {NEGOTIATION_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1">
                      <Label>Status</Label>
                      <NativeSelect
                        value={form.status}
                        onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        {NEGOTIATION_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {NEGOTIATION_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </NegotiationFormBlock>
                </PageSection>

                <PageSection title="Contraparte">
                  <NegotiationFormBlock title="Destino e entidade">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Destino (time adversário cadastrado)</Label>
                      <NativeSelect
                        value={form.counterpartyMode === "team" ? form.visitingTeamId : ""}
                        onChange={(e) => {
                          if (!e.target.value) {
                            setForm((f) => ({
                              ...f,
                              counterpartyMode: "free",
                              visitingTeamId: "",
                            }));
                          } else handleTeamPick(e.target.value);
                        }}
                      >
                        <option value="">Texto livre abaixo</option>
                        {visitingTeams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Clube / entidade (contraparte) *</Label>
                      <Input
                        className="text-foreground"
                        value={form.counterpartyName}
                        onChange={(e) => {
                          setForm((f) => ({
                            ...f,
                            counterpartyName: e.target.value,
                            counterpartyMode: "free",
                          }));
                          setFieldErrors((err) => ({ ...err, counterparty: undefined }));
                        }}
                      />
                      {fieldErrors.counterparty ? (
                        <p className="text-sm text-destructive">{fieldErrors.counterparty}</p>
                      ) : null}
                    </div>
                  </NegotiationFormBlock>
                </PageSection>

                <PageSection title="Valores e prazos">
                  <NegotiationFormBlock title="Valores, datas e responsável">
                    <div className="space-y-1">
                      <Label>Valor total</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.totalValue}
                        onChange={(e) => setForm((f) => ({ ...f, totalValue: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Moeda</Label>
                      <Input
                        value={form.currency}
                        onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>% negociada</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={form.negotiatedPercentage}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, negotiatedPercentage: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>% retida</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={form.retainedPercentage}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, retainedPercentage: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Data negociação</Label>
                      <Input
                        type="date"
                        className={dateInputClass}
                        value={form.negotiatedAt}
                        onChange={(e) => setForm((f) => ({ ...f, negotiatedAt: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Efetiva de</Label>
                      <Input
                        type="date"
                        className={dateInputClass}
                        value={form.effectiveFrom}
                        onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Efetiva até</Label>
                      <Input
                        type="date"
                        className={dateInputClass}
                        value={form.effectiveUntil}
                        onChange={(e) => setForm((f) => ({ ...f, effectiveUntil: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Fim empréstimo</Label>
                      <Input
                        type="date"
                        className={dateInputClass}
                        value={form.loanEndDate}
                        onChange={(e) => setForm((f) => ({ ...f, loanEndDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Responsável</Label>
                      <Input
                        className="text-foreground"
                        value={form.responsibleName}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, responsibleName: e.target.value }))
                        }
                      />
                    </div>
                  </NegotiationFormBlock>
                </PageSection>

                <PageSection title="Documentos e observações">
                  <NegotiationFormBlock title="Condições, cláusulas e notas">
                    <div className="flex min-h-[44px] items-center gap-2 sm:col-span-2">
                      <input
                        id="hasPurchaseOption"
                        type="checkbox"
                        checked={form.hasPurchaseOption}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, hasPurchaseOption: e.target.checked }))
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="hasPurchaseOption">Opção de compra</Label>
                    </div>
                    {form.hasPurchaseOption && (
                      <>
                        <div className="space-y-1">
                          <Label>Prazo opção de compra</Label>
                          <Input
                            type="date"
                            className={dateInputClass}
                            value={form.purchaseOptionDeadline}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, purchaseOptionDeadline: e.target.value }))
                            }
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-2">
                          <Label>Termos da opção de compra</Label>
                          <Textarea
                            value={form.purchaseOptionTerms}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, purchaseOptionTerms: e.target.value }))
                            }
                            rows={3}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1 sm:col-span-2">
                      <Label>Condições de pagamento</Label>
                      <Textarea
                        value={form.paymentTermsSummary}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, paymentTermsSummary: e.target.value }))
                        }
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Cláusulas e condições comerciais</Label>
                      <Textarea
                        value={form.clauses}
                        onChange={(e) => setForm((f) => ({ ...f, clauses: e.target.value }))}
                        rows={4}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Direitos futuros (JSON técnico)</Label>
                      <Textarea
                        value={form.futureAcquisitionRightsJson}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, futureAcquisitionRightsJson: e.target.value }))
                        }
                        rows={3}
                        placeholder='{"percentualAdicional": 20, "prazo": "2027-12-31"}'
                        className="font-mono text-xs text-foreground"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Observações</Label>
                      <Textarea
                        className="text-foreground"
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </NegotiationFormBlock>
                </PageSection>
              </div>
            )}

            {section === "parcelas" && negotiation && (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {negotiation.installments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              Nenhuma parcela.
                            </TableCell>
                          </TableRow>
                        ) : (
                          negotiation.installments.map((i) => (
                            <TableRow key={i.id}>
                              <TableCell>{i.sequence}</TableCell>
                              <TableCell>{dateInput(i.dueDate)}</TableCell>
                              <TableCell className="text-right">
                                {formatNegotiationMoney(i.amount, negotiation.currency)}
                              </TableCell>
                              <TableCell>
                                {INSTALLMENT_STATUS_LABELS[i.computedStatus] ?? i.computedStatus}
                                {i.financeiroLancamentoId ? " · Fin." : ""}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap justify-end gap-1">
                                  {i.computedStatus !== "paid" && i.status !== "cancelled" && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="min-h-[36px]"
                                      onClick={() => markInstallmentPaid(i.id)}
                                    >
                                      Baixar
                                    </Button>
                                  )}
                                  {!i.financeiroLancamentoId && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      className="min-h-[36px]"
                                      onClick={() => setFinanceiroTarget(i.id)}
                                    >
                                      Financeiro
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <div className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label>Valor parcela</Label>
                        <Input
                          type="number"
                          min={0}
                          value={installmentDraft.amount}
                          onChange={(e) =>
                            setInstallmentDraft((d) => ({ ...d, amount: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Vencimento</Label>
                        <Input
                          type="date"
                          className="text-foreground"
                          value={installmentDraft.dueDate}
                          onChange={(e) =>
                            setInstallmentDraft((d) => ({ ...d, dueDate: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button type="button" className="min-h-[44px] w-full" onClick={addInstallment}>
                          Adicionar parcela
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {section === "documentos" && negotiation && (
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {negotiation.documents.length === 0 ? (
                        <li className="text-sm text-muted-foreground">Nenhum documento.</li>
                      ) : (
                        negotiation.documents.map((d) => (
                          <li
                            key={d.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2"
                          >
                            <span className="text-sm font-medium">{d.name}</span>
                            <a
                              href={d.fileUrl.startsWith("/") ? d.fileUrl : d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-violet-400 hover:underline"
                            >
                              Abrir
                            </a>
                            {d.legalDocumentId && (
                              <span className="text-xs text-muted-foreground">Jurídico vinculado</span>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                    <div className="grid gap-3 rounded-lg border border-dashed border-border p-3">
                      <Label>Upload de arquivo</Label>
                      <Input
                        value={uploadName}
                        onChange={(e) => setUploadName(e.target.value)}
                        placeholder="Nome do documento (opcional)"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadDocument(f).catch((err) => {
                            setFeedback({
                              open: true,
                              title: "Upload",
                              message: err instanceof Error ? err.message : "Falha no upload.",
                            });
                          });
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-[44px]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar arquivo
                      </Button>
                    </div>
                    {legalDocs.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <NativeSelect
                          value={linkLegalId}
                          onChange={(e) => setLinkLegalId(e.target.value)}
                        >
                          <option value="">Vincular documento jurídico existente…</option>
                          {legalDocs.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.type})
                            </option>
                          ))}
                        </NativeSelect>
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-[44px]"
                          disabled={!linkLegalId}
                          onClick={linkLegalDocument}
                        >
                          Vincular
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {section === "auditoria" && negotiation && (
                  <ul className="max-h-[360px] space-y-2 overflow-y-auto">
                    {(negotiation.auditLogs ?? []).map((log) => (
                      <li
                        key={log.id}
                        className="rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-sm"
                      >
                        <div className="font-medium text-foreground">
                          {NEGOTIATION_AUDIT_ACTION_LABELS[log.action] ?? log.action}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.at).toLocaleString("pt-BR")}
                          {log.userName ? ` · ${log.userName}` : ""}
                        </div>
                        {log.details != null && (
                          <pre className="mt-1 max-h-24 overflow-auto text-xs text-muted-foreground">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {section === "efeitos" && form.status === "effective" && (
                  <div className="space-y-4 text-sm">
                    <p className="text-muted-foreground">
                      Snapshot atual no cadastro do atleta (após efetivação).
                    </p>
                    {(form.negotiationType === "loan" || form.negotiationType === "mixed") && (
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-2 font-semibold text-foreground">Empréstimo</p>
                        <p>Situação esportiva: {sportsSituation ?? "—"}</p>
                        <p>Destino: {loanInfo?.destinationClub ?? form.counterpartyName}</p>
                        <p>
                          Período: {loanInfo?.startDate ?? (form.effectiveFrom || "—")} →{" "}
                          {loanInfo?.endDate ?? (form.loanEndDate || "—")}
                        </p>
                      </div>
                    )}
                    {(form.negotiationType === "partial_rights" ||
                      form.negotiationType === "mixed" ||
                      form.negotiationType === "transfer_permanent") && (
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="mb-2 font-semibold text-foreground">Direitos econômicos</p>
                        {economicRights.length === 0 ? (
                          <p className="text-muted-foreground">Nenhum registro no perfil.</p>
                        ) : (
                          <ul className="space-y-1">
                            {economicRights.map((r) => (
                              <li key={r.id}>
                                {r.clubName}: {r.percentage}%
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="mb-2 font-semibold text-foreground">Parcelas</p>
                      <ul className="space-y-1">
                        {(negotiation?.installments ?? []).map((i) => (
                          <li key={i.id} className="flex justify-between gap-2">
                            <span>
                              #{i.sequence}{" "}
                              {INSTALLMENT_STATUS_LABELS[i.computedStatus] ?? i.computedStatus}
                            </span>
                            <span>
                              {formatNegotiationMoney(i.amount, negotiation?.currency)} ·{" "}
                              {dateInput(i.dueDate)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {canEffective && (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-[44px]"
                  onClick={() => setEffectiveConfirm(true)}
                >
                  Efetivar negociação
                </Button>
              )}
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] flex-1 sm:w-auto sm:min-w-[120px]"
                disabled={saving}
                onClick={onCancel}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="min-h-[44px] flex-1 sm:w-auto sm:min-w-[160px]"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? "Salvando…" : "Salvar negociação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!financeiroTarget} onOpenChange={(o) => !o && setFinanceiroTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançamento financeiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Tipo</Label>
            <NativeSelect
              value={financeiroTipo}
              onChange={(e) => setFinanceiroTipo(e.target.value as "pagar" | "receber")}
            >
              <option value="receber">Conta a receber</option>
              <option value="pagar">Conta a pagar</option>
            </NativeSelect>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFinanceiroTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" className="min-h-[44px]" onClick={linkFinanceiro}>
              Criar e vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={effectiveConfirm} onOpenChange={setEffectiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Efetivar negociação?</AlertDialogTitle>
            <AlertDialogDescription>
              O status passará para Efetivada e o cadastro do atleta receberá espelho de empréstimo
              e/ou direitos econômicos, conforme o tipo. O histórico da negociação será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={cn("min-h-[44px]")}
              onClick={(e) => {
                e.preventDefault();
                void handleEffective();
              }}
            >
              Confirmar efetivação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal
        open={feedback.open}
        onOpenChange={(o) => setFeedback((f) => ({ ...f, open: o }))}
        title={feedback.title}
        message={feedback.message}
      />
    </>
  );
}
