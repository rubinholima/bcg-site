"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { NativeSelectField } from "@/components/ui/native-select";
import { MediaPicker } from "@/components/dashboard/MediaPicker";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getPublicImageUrl } from "@/lib/media-url";
import {
  GUARDIAN_RELATIONSHIP_OPTIONS,
  SOCIAL_PEDAGOGY_DOCUMENT_TYPES,
  documentTypeLabel,
  statusLabel,
  triggerLabel,
  type PlayerGuardianRow,
  type PlayerSchoolEnrollmentRow,
  type SocialPedagogyContext,
  type SocialPedagogyDocumentRow,
} from "@/lib/assistencia-social-types";

interface Props {
  playerId: string;
}

export function PlayerSocialPedagogySection({ playerId }: Props) {
  const [ctx, setCtx] = useState<SocialPedagogyContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardianOpen, setGuardianOpen] = useState(false);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [deleteGuardianId, setDeleteGuardianId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, title: "", message: "" });

  const [gName, setGName] = useState("");
  const [gRelationship, setGRelationship] = useState("responsavel");
  const [gPhone, setGPhone] = useState("");
  const [gEmail, setGEmail] = useState("");
  const [gPrimary, setGPrimary] = useState(false);

  const [schoolName, setSchoolName] = useState("");
  const [simadeNumber, setSimadeNumber] = useState("");
  const [grade, setGrade] = useState("");
  const [period, setPeriod] = useState("");
  const [coordinatorName, setCoordinatorName] = useState("");
  const [coordinatorPhone, setCoordinatorPhone] = useState("");

  const [docType, setDocType] = useState("matricula");
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [simadeDrafts, setSimadeDrafts] = useState<Record<string, string>>({});
  const [simadeSavingId, setSimadeSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const { data } = await api.get<SocialPedagogyContext>(`/players/${playerId}/social-pedagogy-context`);
      setCtx(data);
    } catch {
      setCtx(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddGuardian = async () => {
    if (!gName.trim()) return;
    setSaving(true);
    try {
      await api.post("/assistencia-social/guardians", {
        playerId,
        name: gName.trim(),
        relationship: gRelationship,
        phone: gPhone.trim() || undefined,
        email: gEmail.trim() || undefined,
        isPrimary: gPrimary,
      });
      setGuardianOpen(false);
      setGName("");
      setGPhone("");
      setGEmail("");
      await load();
    } catch (err) {
      setFeedback({ open: true, title: "Erro", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGuardian = async () => {
    if (!deleteGuardianId) return;
    try {
      await api.delete(`/assistencia-social/guardians/${deleteGuardianId}`);
      setDeleteGuardianId(null);
      await load();
    } catch (err) {
      setFeedback({ open: true, title: "Erro", message: err instanceof Error ? err.message : "Erro ao excluir." });
    }
  };

  const handleAddSchool = async () => {
    if (!schoolName.trim()) return;
    setSaving(true);
    try {
      await api.post("/assistencia-social/school-enrollments", {
        playerId,
        schoolName: schoolName.trim(),
        simadeNumber: simadeNumber.trim() || undefined,
        grade: grade.trim() || undefined,
        period: period.trim() || undefined,
        coordinatorName: coordinatorName.trim() || undefined,
        coordinatorPhone: coordinatorPhone.trim() || undefined,
        status: "ativo",
      });
      setSchoolOpen(false);
      setSchoolName("");
      setSimadeNumber("");
      await load();
    } catch (err) {
      setFeedback({ open: true, title: "Erro", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSimade = async (enrollmentId: string) => {
    const value = (simadeDrafts[enrollmentId] ?? "").trim();
    setSimadeSavingId(enrollmentId);
    try {
      await api.patch(`/assistencia-social/school-enrollments/${enrollmentId}`, {
        simadeNumber: value || null,
      });
      await load();
    } catch (err) {
      setFeedback({ open: true, title: "Erro", message: err instanceof Error ? err.message : "Erro ao salvar SIMADE." });
    } finally {
      setSimadeSavingId(null);
    }
  };

  const handleAddDocument = async () => {
    if (!docName.trim() || !docUrl.trim()) return;
    setSaving(true);
    try {
      await api.post("/assistencia-social/documents", {
        playerId,
        documentType: docType,
        name: docName.trim(),
        fileUrl: docUrl.trim(),
      });
      setDocOpen(false);
      setDocName("");
      setDocUrl("");
      await load();
    } catch (err) {
      setFeedback({ open: true, title: "Erro", message: err instanceof Error ? err.message : "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ctx) {
    return <p className="text-sm text-muted-foreground">Não foi possível carregar os dados.</p>;
  }

  const validation = ctx.contactValidation;

  return (
    <div className="space-y-6">
      {!validation.ok ? (
        <Card className="rounded-2xl border-amber-500/40 bg-amber-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pendências cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc pl-5 text-muted-foreground">
              {validation.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
            <Button type="button" variant="secondary" size="sm" asChild>
              <Link href={`/dashboard/cadastros/jogadores/${playerId}/edit?tab=dados`}>
                Completar cadastro
                <ExternalLink className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Responsáveis</CardTitle>
          <Button type="button" size="sm" variant="secondary" onClick={() => setGuardianOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ctx.guardians.length === 0 ? (
            <p className="text-muted-foreground">Nenhum responsável cadastrado.</p>
          ) : (
            ctx.guardians.map((g: PlayerGuardianRow) => (
              <div key={g.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 p-3">
                <div>
                  <p className="font-medium">
                    {g.name}
                    {g.isPrimary ? " · principal" : ""}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {g.relationship}
                    {g.phone ? ` · ${g.phone}` : ""}
                    {g.email ? ` · ${g.email}` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteGuardianId(g.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Acompanhamento escolar</CardTitle>
          <Button type="button" size="sm" variant="secondary" onClick={() => setSchoolOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Matrícula
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ctx.enrollments.length === 0 && !ctx.profileSchool.schoolName ? (
            <p className="text-muted-foreground">Escola não informada.</p>
          ) : null}
          {ctx.profileSchool.schoolName && ctx.enrollments.length === 0 ? (
            <p>
              {ctx.profileSchool.schoolName}
              {ctx.profileSchool.schoolGrade ? ` · ${ctx.profileSchool.schoolGrade}` : ""}
              <span className="text-muted-foreground text-xs"> (cadastro base)</span>
            </p>
          ) : null}
          {ctx.enrollments.map((e: PlayerSchoolEnrollmentRow) => {
            const simadeValue = simadeDrafts[e.id] ?? e.simadeNumber ?? "";
            return (
              <div key={e.id} className="rounded-lg border border-border/60 p-3 space-y-2">
                <p className="font-medium">{e.schoolName}</p>
                <p className="text-muted-foreground text-xs">
                  {e.grade ?? "—"} · {e.status}
                  {e.coordinatorName ? ` · ${e.coordinatorName}` : ""}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="grid flex-1 gap-1">
                    <Label htmlFor={`simade-${e.id}`} className="text-xs">
                      Nº SIMADE (matrícula escolar)
                    </Label>
                    <Input
                      id={`simade-${e.id}`}
                      value={simadeValue}
                      onChange={(ev) =>
                        setSimadeDrafts((prev) => ({ ...prev, [e.id]: ev.target.value }))
                      }
                      placeholder="Número SIMADE"
                      className="text-foreground"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    disabled={simadeSavingId === e.id || simadeValue === (e.simadeNumber ?? "")}
                    onClick={() => void handleSaveSimade(e.id)}
                  >
                    {simadeSavingId === e.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Salvar SIMADE"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Casos em andamento ({ctx.openCasesCount})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ctx.cases.length === 0 ? (
            <p className="text-muted-foreground">Nenhum caso registrado.</p>
          ) : (
            ctx.cases.slice(0, 5).map((c) => (
              <div key={c.id} className="rounded-lg border border-border/60 p-3">
                <p className="font-medium">{triggerLabel(c.triggerType)}</p>
                <p className="text-muted-foreground text-xs">
                  {statusLabel(c.status)} · {formatDateDayMonYear(new Date(c.updatedAt))}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/80">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Documentos escolares</CardTitle>
          <Button type="button" size="sm" variant="secondary" onClick={() => setDocOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Anexar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {ctx.documents.length === 0 ? (
            <p className="text-muted-foreground">Nenhum documento arquivado.</p>
          ) : (
            ctx.documents.map((d: SocialPedagogyDocumentRow) => {
              const url = getPublicImageUrl(d.fileUrl) || d.fileUrl;
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 p-3">
                  <div>
                    <p className="font-medium">{d.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {documentTypeLabel(d.documentType)}
                      {d.receivedAt ? ` · ${formatDateDayMonYear(new Date(d.receivedAt))}` : ""}
                    </p>
                  </div>
                  {url ? (
                    <Button type="button" variant="ghost" size="sm" asChild>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        Abrir
                      </a>
                    </Button>
                  ) : null}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={guardianOpen} onOpenChange={setGuardianOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Responsável</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1"><Label>Nome</Label><Input value={gName} onChange={(e) => setGName(e.target.value)} /></div>
            <div className="grid gap-1">
              <Label>Parentesco</Label>
              <NativeSelectField value={gRelationship} onChange={(e) => setGRelationship(e.target.value)} options={GUARDIAN_RELATIONSHIP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
            <div className="grid gap-1"><Label>Telefone</Label><Input value={gPhone} onChange={(e) => setGPhone(e.target.value)} /></div>
            <div className="grid gap-1"><Label>E-mail</Label><Input value={gEmail} onChange={(e) => setGEmail(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gPrimary} onChange={(e) => setGPrimary(e.target.checked)} />
              Responsável principal
            </label>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddGuardian} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={schoolOpen} onOpenChange={setSchoolOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Matrícula escolar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1"><Label>Escola</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} /></div>
            <div className="grid gap-1">
              <Label>Nº SIMADE</Label>
              <Input
                value={simadeNumber}
                onChange={(e) => setSimadeNumber(e.target.value)}
                placeholder="Matrícula escolar (SIMADE)"
                className="text-foreground"
              />
            </div>
            <div className="grid gap-1"><Label>Série / ano</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
            <div className="grid gap-1"><Label>Turno</Label><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Manhã, tarde…" /></div>
            <div className="grid gap-1"><Label>Coordenação — nome</Label><Input value={coordinatorName} onChange={(e) => setCoordinatorName(e.target.value)} /></div>
            <div className="grid gap-1"><Label>Coordenação — telefone</Label><Input value={coordinatorPhone} onChange={(e) => setCoordinatorPhone(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddSchool} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Documento escolar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1">
              <Label>Tipo</Label>
              <NativeSelectField value={docType} onChange={(e) => setDocType(e.target.value)} options={SOCIAL_PEDAGOGY_DOCUMENT_TYPES.map((o) => ({ value: o.value, label: o.label }))} />
            </div>
            <div className="grid gap-1"><Label>Nome</Label><Input value={docName} onChange={(e) => setDocName(e.target.value)} /></div>
            <MediaPicker sizeKey="rh_documentos" allowAllFolders value={docUrl} onChange={setDocUrl} placeholder="PDF ou imagem" />
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleAddDocument} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGuardianId} onOpenChange={(open) => !open && setDeleteGuardianId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir responsável</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGuardian} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeedbackModal open={feedback.open} onOpenChange={(open) => setFeedback((f) => ({ ...f, open }))} title={feedback.title} message={feedback.message} />
    </div>
  );
}
