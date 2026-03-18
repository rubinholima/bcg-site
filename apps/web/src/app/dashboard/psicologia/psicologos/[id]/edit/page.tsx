"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2, CalendarOff, Calendar, StickyNote, BarChart3, User, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { PhotoUploadWithName } from "@/components/dashboard/PhotoUploadWithName";
import { getPhotoDisplayName, PHOTO_DEPARTMENT_BY_SIZE_KEY } from "@/lib/utils";
import { getPublicImageUrl } from "@/lib/media-url";
import type { Psychologist } from "@/types/psychologist";
import type { AttendanceLogEntry, PerformanceSheet } from "@/types/psychologist";
import type { Tenant } from "@/types/tenant";

export default function EditarPsicologoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;
  const [psychologist, setPsychologist] = useState<Psychologist | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingPhotoFile) { setPendingPreviewUrl(null); return; }
    const url = URL.createObjectURL(pendingPhotoFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhotoFile]);
  const [consultationsFromSystem, setConsultationsFromSystem] = useState<Array<{
    id: string;
    date?: string;
    time?: string;
    playerName: string;
    playerId: string;
    status?: string;
    notes?: string;
  }>>([]);
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<Psychologist>(`/psychologists/${id}`).then(({ data }) => data),
      api.get<Tenant[]>("/tenants?clubsOnly=1").then(({ data }) => Array.isArray(data) ? data : []),
    ])
      .then(([p, t]) => {
        setPsychologist(p ?? null);
        setTenants(t ?? []);
      })
      .catch(() => setPsychologist(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!psychologist?.name) return;
    api
      .get<Array<{ id: string; playerId: string; playerName: string; date?: string; time?: string; status?: string; notes?: string; psychologist?: string }>>("/consultations")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        const byThis = list.filter(
          (c) => (c.psychologist ?? "").trim() && (c.psychologist ?? "").trim().toLowerCase() === psychologist.name.trim().toLowerCase()
        );
        setConsultationsFromSystem(
          byThis.map((c) => ({
            id: c.id,
            date: c.date,
            time: c.time,
            playerName: c.playerName ?? "—",
            playerId: c.playerId,
            status: c.status,
            notes: c.notes,
          }))
        );
      })
      .catch(() => setConsultationsFromSystem([]));
  }, [psychologist?.name]);

  const attendanceLog = (psychologist?.attendanceLog as AttendanceLogEntry[] | undefined) ?? [];
  const performanceSheet = (psychologist?.performanceSheet as PerformanceSheet | undefined) ?? {};

  const setAttendanceLog = (next: AttendanceLogEntry[]) => {
    if (!psychologist) return;
    setPsychologist({ ...psychologist, attendanceLog: next });
  };

  const setPerformanceSheet = (patch: Partial<PerformanceSheet>) => {
    if (!psychologist) return;
    setPsychologist({
      ...psychologist,
      performanceSheet: { ...performanceSheet, ...patch },
    });
  };

  const addAttendanceEntry = () => {
    setAttendanceLog([
      ...attendanceLog,
      { date: new Date().toISOString().slice(0, 10), startTime: "09:00", endTime: "10:00", playerName: "", notes: "" },
    ]);
  };

  const removeAttendanceEntry = (index: number) => {
    setAttendanceLog(attendanceLog.filter((_, i) => i !== index));
  };

  const updateAttendanceEntry = (index: number, field: keyof AttendanceLogEntry, value: string) => {
    const next = [...attendanceLog];
    (next[index] as Record<string, string>)[field] = value;
    setAttendanceLog(next as AttendanceLogEntry[]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!psychologist) return;
    if (pendingPhotoFile && !psychologist.name?.trim()) {
      setError("Preencha o nome antes de salvar a foto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let photoUrl = psychologist.photoUrl ?? undefined;
      if (pendingPhotoFile && psychologist.name?.trim()) {
        const formData = new FormData();
        formData.append("file", pendingPhotoFile);
        formData.append("sizeKey", "psicologia");
        formData.append("displayName", getPhotoDisplayName(psychologist.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.psicologia));
        const res = await fetch("/api/media", { method: "POST", credentials: "include", body: formData });
        const data = (await res.json()) as { url?: string; message?: string; error?: string };
        if (!res.ok) {
          setError(data?.message ?? data?.error ?? "Erro ao enviar foto.");
          setSaving(false);
          return;
        }
        if (data?.url) {
          photoUrl = data.url;
          setPendingPhotoFile(null);
          setPsychologist((p) => (p ? { ...p, photoUrl: data.url ?? null } : p));
        }
      }
      await api.patch(`/psychologists/${psychologist.id}`, {
        name: psychologist.name,
        email: psychologist.email ?? undefined,
        phone: psychologist.phone ?? undefined,
        crpOrEquivalent: psychologist.crpOrEquivalent ?? undefined,
        bio: psychologist.bio ?? undefined,
        photoUrl,
        tenantId: psychologist.tenantId ?? undefined,
        calendarBlocked: psychologist.calendarBlocked,
        attendanceLog: attendanceLog.length > 0 ? attendanceLog : undefined,
        performanceSheet: Object.keys(performanceSheet).length > 0 ? { ...performanceSheet, updatedAt: new Date().toISOString() } : undefined,
      });
      router.push("/dashboard/psicologia/psicologos?success=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
      setSaving(false);
    }
  };

  if (loading || !psychologist) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/psicologia/psicologos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          {(pendingPreviewUrl || psychologist.photoUrl) ? (
            <div className="h-14 w-14 rounded-full overflow-hidden bg-muted border-2 border-border flex items-center justify-center">
              <img
                src={pendingPreviewUrl ?? getPublicImageUrl(psychologist.photoUrl!)}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center text-primary text-xl font-semibold">
              {psychologist.name.trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join("").toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Psicólogo</h1>
            <p className="text-muted-foreground">
              {psychologist.name}
              {psychologist.tenant ? ` · ${psychologist.tenant.name}` : ""}
            </p>
          </div>
        </div>
        <Button type="submit" form="form-psychologist" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>

      <form id="form-psychologist" onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Dados do psicólogo</CardTitle>
            <CardDescription>Estes dados populam a seleção de psicólogo em consultas e e-mails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  required
                  value={psychologist.name}
                  onChange={(e) => setPsychologist((p) => (p ? { ...p, name: e.target.value } : p))}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="crp">CRP / Registro</Label>
                <Input
                  id="crp"
                  value={psychologist.crpOrEquivalent ?? ""}
                  onChange={(e) => setPsychologist((p) => (p ? { ...p, crpOrEquivalent: e.target.value || null } : p))}
                  disabled={saving}
                  className="text-foreground"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Foto</Label>
              <PhotoUploadWithName
                sizeKey="psicologia"
                value={psychologist.photoUrl ?? ""}
                onChange={(v) => setPsychologist((p) => (p ? { ...p, photoUrl: v || null } : p))}
                disabled={saving}
                namePlaceholder="Ex: foto-nome-do-psicologo"
                deferredUpload
                onFileSelect={(f) => setPendingPhotoFile(f ?? null)}
                pendingFile={pendingPhotoFile}
                requireNameToUpload={psychologist.name}
                displayNameAuto={getPhotoDisplayName(psychologist.name, PHOTO_DEPARTMENT_BY_SIZE_KEY.psicologia) || undefined}
                hidePreview
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={psychologist.email ?? ""}
                  onChange={(e) => setPsychologist((p) => (p ? { ...p, email: e.target.value || null } : p))}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={psychologist.phone ?? ""}
                  onChange={(e) => setPsychologist((p) => (p ? { ...p, phone: e.target.value || null } : p))}
                  disabled={saving}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia / Observações</Label>
              <textarea
                id="bio"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={psychologist.bio ?? ""}
                onChange={(e) => setPsychologist((p) => (p ? { ...p, bio: e.target.value || null } : p))}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tenantId">Clube / Empresa</Label>
              <select
                id="tenantId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={psychologist.tenantId ?? ""}
                onChange={(e) => setPsychologist((p) => (p ? { ...p, tenantId: e.target.value || null } : p))}
                disabled={saving}
              >
                <option value="">Todos</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="calendarBlocked"
                checked={psychologist.calendarBlocked}
                onChange={(e) => setPsychologist((p) => (p ? { ...p, calendarBlocked: e.target.checked } : p))}
                disabled={saving}
                className="rounded border-input"
              />
              <Label htmlFor="calendarBlocked" className="flex items-center gap-2">
                {psychologist.calendarBlocked ? <CalendarOff className="h-4 w-4 text-amber-500" /> : <Calendar className="h-4 w-4" />}
                Bloquear calendário (não disponível para agendamento)
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Agenda — Horas de atendimento realizadas
            </CardTitle>
            <CardDescription>
              Registro das sessões/atendimentos realizados (data, horário, atleta, observações).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button type="button" variant="outline" size="sm" onClick={addAttendanceEntry} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar atendimento
            </Button>
            {attendanceLog.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Data</th>
                      <th className="p-2 text-left font-medium">Início</th>
                      <th className="p-2 text-left font-medium">Fim</th>
                      <th className="p-2 text-left font-medium">Atleta</th>
                      <th className="p-2 text-left font-medium">Observações</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceLog.map((entry, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">
                          <Input
                            type="date"
                            className="h-9 text-foreground"
                            value={entry.date ?? ""}
                            onChange={(e) => updateAttendanceEntry(i, "date", e.target.value)}
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="time"
                            className="h-9 text-foreground"
                            value={entry.startTime ?? ""}
                            onChange={(e) => updateAttendanceEntry(i, "startTime", e.target.value)}
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="time"
                            className="h-9 text-foreground"
                            value={entry.endTime ?? ""}
                            onChange={(e) => updateAttendanceEntry(i, "endTime", e.target.value)}
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-9 text-foreground"
                            value={entry.playerName ?? ""}
                            onChange={(e) => updateAttendanceEntry(i, "playerName", e.target.value)}
                            placeholder="Nome do atleta"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            className="h-9 text-foreground"
                            value={entry.notes ?? ""}
                            onChange={(e) => updateAttendanceEntry(i, "notes", e.target.value)}
                            placeholder="Observações"
                            disabled={saving}
                          />
                        </td>
                        <td className="p-2">
                          <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeAttendanceEntry(i)} disabled={saving}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" />
              Consultas vinculadas (atendimentos no sistema)
            </CardTitle>
            <CardDescription>
              Consultas em que este psicólogo está atribuído — alterações feitas em Depto Psicologia → Consultas aparecem aqui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consultationsFromSystem.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Nenhuma consulta com este psicólogo no momento. Atribua o psicólogo ao editar uma consulta em Depto Psicologia → Consultas.
              </p>
            ) : (
              <div className="space-y-2">
                {consultationsFromSystem
                  .sort((a, b) => {
                    const da = (a.date ?? "") + (a.time ?? "");
                    const db = (b.date ?? "") + (b.time ?? "");
                    return da.localeCompare(db);
                  })
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {c.date ? new Date(c.date + (c.time ? `T${c.time}` : "T00:00")).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) + (c.time ? ` ${c.time}` : "") : "—"}
                      </span>
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <Link
                        href={`/dashboard/cadastros/jogadores/${c.playerId}/edit`}
                        className="font-medium hover:underline"
                      >
                        {c.playerName}
                      </Link>
                      {c.status && (
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            c.status === "completed" ? "bg-emerald-500/20 text-emerald-600" : c.status === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-600"
                          }`}
                        >
                          {c.status === "completed" ? "Realizada" : c.status === "cancelled" ? "Cancelada" : "Agendada"}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ficha de performance
            </CardTitle>
            <CardDescription>
              Resumo e métricas de desempenho do psicólogo (opcional).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="perfSummary">Resumo</Label>
              <textarea
                id="perfSummary"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={performanceSheet.summary ?? ""}
                onChange={(e) => setPerformanceSheet({ summary: e.target.value })}
                placeholder="Resumo da performance ou avaliação"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="perfNotes">Observações da ficha</Label>
              <textarea
                id="perfNotes"
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={performanceSheet.notes ?? ""}
                onChange={(e) => setPerformanceSheet({ notes: e.target.value })}
                placeholder="Notas adicionais"
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-2">
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
          <Link href="/dashboard/psicologia/psicologos">
            <Button type="button" variant="outline" disabled={saving}>Cancelar</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
