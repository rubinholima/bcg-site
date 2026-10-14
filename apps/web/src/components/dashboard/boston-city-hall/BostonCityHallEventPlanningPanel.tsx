"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import {
  BCH_BTN_PRIMARY,
  BCH_BTN_SECONDARY,
  BCH_CARD,
  BCH_DIALOG_CONTENT,
  BCH_TABLE_WRAP,
} from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { cn } from "@/lib/utils";

type ScheduleItem = {
  id: string;
  itemType: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  locationLabel: string | null;
  responsibleName: string | null;
  responsibleTeamMemberId: string | null;
  status: string;
  notes: string | null;
};

type TeamMember = {
  id: string;
  roleLabel: string;
  contractorName: string | null;
  employee?: { name: string } | null;
  supplier?: { name: string } | null;
};

type OperationalTask = {
  id: string;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: string;
  priority: string;
  ownerTeamMemberId: string | null;
  ownerTeamMember?: TeamMember | null;
};

const SCHEDULE_TYPES = [
  { value: "setup", label: "Montagem" },
  { value: "soundcheck", label: "Soundcheck" },
  { value: "doors_open", label: "Abertura" },
  { value: "event_start", label: "Início" },
  { value: "event_end", label: "Término" },
  { value: "teardown", label: "Desmontagem" },
  { value: "custom", label: "Personalizado" },
];

const TASK_STATUS = [
  { value: "open", label: "Aberta" },
  { value: "in_progress", label: "Em andamento" },
  { value: "done", label: "Concluída" },
];

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localToIso(v: string): string | null {
  if (!v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function memberLabel(m: TeamMember): string {
  return m.employee?.name ?? m.contractorName ?? m.supplier?.name ?? m.roleLabel;
}

export function BostonCityHallEventPlanningPanel({
  eventId,
  onChanged,
}: {
  eventId: string;
  onChanged?: () => void;
}) {
  const base = `/boston-city-hall/events/${encodeURIComponent(eventId)}`;
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [tasks, setTasks] = useState<OperationalTask[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [editSchedule, setEditSchedule] = useState<ScheduleItem | null>(null);
  const [cancelScheduleId, setCancelScheduleId] = useState<string | null>(null);
  const [taskDialog, setTaskDialog] = useState(false);
  const [editTask, setEditTask] = useState<OperationalTask | null>(null);
  const [cancelTaskId, setCancelTaskId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant: "success" | "error" } | null>(
    null,
  );

  const [scheduleForm, setScheduleForm] = useState({
    itemType: "custom",
    title: "",
    startsAt: "",
    endsAt: "",
    locationLabel: "",
    responsibleTeamMemberId: "",
    responsibleName: "",
    status: "planned",
    notes: "",
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    notes: "",
    dueAt: "",
    priority: "normal",
    status: "open",
    ownerTeamMemberId: "",
  });

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [sch, tsk, tm] = await Promise.all([
        api.get<ScheduleItem[]>(`${base}/schedule`),
        api.get<OperationalTask[]>(`${base}/operational-tasks`),
        api.get<TeamMember[]>(`${base}/team-members`),
      ]);
      setSchedule(Array.isArray(sch.data) ? sch.data.filter((s) => s.status !== "cancelled") : []);
      setTasks(Array.isArray(tsk.data) ? tsk.data.filter((t) => t.status !== "cancelled") : []);
      setTeam(Array.isArray(tm.data) ? tm.data : []);
      onChanged?.();
    } catch {
      setFeedback({ title: "Erro", message: "Não foi possível carregar planejamento.", variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [base, onChanged]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openNewSchedule = () => {
    setEditSchedule(null);
    setScheduleForm({
      itemType: "custom",
      title: "",
      startsAt: "",
      endsAt: "",
      locationLabel: "",
      responsibleTeamMemberId: "",
      responsibleName: "",
      status: "planned",
      notes: "",
    });
    setScheduleDialog(true);
  };

  const openEditSchedule = (row: ScheduleItem) => {
    setEditSchedule(row);
    setScheduleForm({
      itemType: row.itemType,
      title: row.title,
      startsAt: isoToLocal(row.startsAt),
      endsAt: isoToLocal(row.endsAt),
      locationLabel: row.locationLabel ?? "",
      responsibleTeamMemberId: row.responsibleTeamMemberId ?? "",
      responsibleName: row.responsibleName ?? "",
      status: row.status,
      notes: row.notes ?? "",
    });
    setScheduleDialog(true);
  };

  const saveSchedule = async () => {
    if (!scheduleForm.title.trim() || !scheduleForm.startsAt) return;
    const payload = {
      itemType: scheduleForm.itemType,
      title: scheduleForm.title.trim(),
      startsAt: localToIso(scheduleForm.startsAt),
      endsAt: localToIso(scheduleForm.endsAt),
      locationLabel: scheduleForm.locationLabel.trim() || null,
      responsibleTeamMemberId: scheduleForm.responsibleTeamMemberId || null,
      responsibleName: scheduleForm.responsibleName.trim() || null,
      status: scheduleForm.status,
      notes: scheduleForm.notes.trim() || null,
    };
    try {
      if (editSchedule) {
        await api.patch(`${base}/schedule/${editSchedule.id}`, payload);
      } else {
        await api.post(`${base}/schedule`, payload);
      }
      setScheduleDialog(false);
      await reload();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar o marco.",
        variant: "error",
      });
    }
  };

  const seedDefaults = async () => {
    try {
      const res = await api.post<{ seeded: boolean; count: number }>(`${base}/schedule/seed-defaults`);
      if (!res.data.seeded) {
        setFeedback({
          title: "Cronograma existente",
          message: "Marcos já cadastrados — nada foi sobrescrito.",
          variant: "success",
        });
      }
      await reload();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível gerar marcos padrão.",
        variant: "error",
      });
    }
  };

  const openNewTask = () => {
    setEditTask(null);
    setTaskForm({
      title: "",
      notes: "",
      dueAt: "",
      priority: "normal",
      status: "open",
      ownerTeamMemberId: "",
    });
    setTaskDialog(true);
  };

  const openEditTask = (row: OperationalTask) => {
    setEditTask(row);
    setTaskForm({
      title: row.title,
      notes: row.notes ?? "",
      dueAt: isoToLocal(row.dueAt),
      priority: row.priority,
      status: row.status,
      ownerTeamMemberId: row.ownerTeamMemberId ?? "",
    });
    setTaskDialog(true);
  };

  const saveTask = async () => {
    if (!taskForm.title.trim()) return;
    const payload = {
      title: taskForm.title.trim(),
      notes: taskForm.notes.trim() || null,
      dueAt: localToIso(taskForm.dueAt),
      priority: taskForm.priority,
      status: taskForm.status,
      ownerTeamMemberId: taskForm.ownerTeamMemberId || null,
    };
    try {
      if (editTask) {
        await api.patch(`${base}/operational-tasks/${editTask.id}`, payload);
      } else {
        await api.post(`${base}/operational-tasks`, payload);
      }
      setTaskDialog(false);
      await reload();
    } catch (e) {
      setFeedback({
        title: "Erro",
        message: e instanceof Error ? e.message : "Não foi possível salvar a tarefa.",
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className={cn(BCH_CARD, "space-y-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Cronograma operacional</h3>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className={BCH_BTN_SECONDARY} onClick={() => void seedDefaults()}>
              Gerar padrão (sem sobrescrever)
            </Button>
            <Button type="button" size="sm" className={cn("min-h-[36px]", BCH_BTN_PRIMARY)} onClick={openNewSchedule}>
              <Plus className="mr-1 h-4 w-4" />
              Novo marco
            </Button>
          </div>
        </div>
        {schedule.length === 0 ? (
          <BchEmptyState message="Nenhum marco no cronograma." />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Marco</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[72px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(row.startsAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {row.endsAt
                        ? new Date(row.endsAt).toLocaleString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{row.locationLabel ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {row.responsibleName ??
                        (row.responsibleTeamMemberId
                          ? memberLabel(team.find((t) => t.id === row.responsibleTeamMemberId) ?? { id: "", roleLabel: "", contractorName: null })
                          : "—")}
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditSchedule(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCancelScheduleId(row.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className={cn(BCH_CARD, "space-y-3")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-100">Checklist operacional</h3>
          <Button type="button" size="sm" variant="outline" className={cn("min-h-[36px]", BCH_BTN_SECONDARY)} onClick={openNewTask}>
            <Plus className="mr-1 h-4 w-4" />
            Nova tarefa
          </Button>
        </div>
        {tasks.length === 0 ? (
          <BchEmptyState message="Nenhuma tarefa operacional." />
        ) : (
          <div className={BCH_TABLE_WRAP}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[72px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      {row.notes ? <div className="text-xs text-slate-500 line-clamp-1">{row.notes}</div> : null}
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.ownerTeamMember ? memberLabel(row.ownerTeamMember) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {row.dueAt ? new Date(row.dueAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </TableCell>
                    <TableCell>{row.priority}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditTask(row)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setCancelTaskId(row.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className={cn(BCH_DIALOG_CONTENT, "max-w-2xl")}>
          <DialogHeader>
            <DialogTitle>{editSchedule ? "Editar marco" : "Novo marco"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <NativeSelect value={scheduleForm.itemType} onChange={(e) => setScheduleForm({ ...scheduleForm, itemType: e.target.value })}>
                {SCHEDULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <NativeSelect value={scheduleForm.status} onChange={(e) => setScheduleForm({ ...scheduleForm, status: e.target.value })}>
                <option value="planned">Planejado</option>
                <option value="in_progress">Em andamento</option>
                <option value="done">Concluído</option>
              </NativeSelect>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Título *</Label>
              <Input value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Início *</Label>
              <Input type="datetime-local" value={scheduleForm.startsAt} onChange={(e) => setScheduleForm({ ...scheduleForm, startsAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Fim</Label>
              <Input type="datetime-local" value={scheduleForm.endsAt} onChange={(e) => setScheduleForm({ ...scheduleForm, endsAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Área / local operacional</Label>
              <Input value={scheduleForm.locationLabel} onChange={(e) => setScheduleForm({ ...scheduleForm, locationLabel: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Membro da equipe</Label>
              <NativeSelect
                value={scheduleForm.responsibleTeamMemberId}
                onChange={(e) => setScheduleForm({ ...scheduleForm, responsibleTeamMemberId: e.target.value })}
              >
                <option value="">Nenhum</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {memberLabel(m)} · {m.roleLabel}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Responsável (texto livre)</Label>
              <Input value={scheduleForm.responsibleName} onChange={(e) => setScheduleForm({ ...scheduleForm, responsibleName: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={2} value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setScheduleDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveSchedule()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialog} onOpenChange={setTaskDialog}>
        <DialogContent className={BCH_DIALOG_CONTENT}>
          <DialogHeader>
            <DialogTitle>{editTask ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Título *</Label>
              <Input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <NativeSelect value={taskForm.ownerTeamMemberId} onChange={(e) => setTaskForm({ ...taskForm, ownerTeamMemberId: e.target.value })}>
                <option value="">Não atribuído</option>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {memberLabel(m)}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Prazo</Label>
              <Input type="datetime-local" value={taskForm.dueAt} onChange={(e) => setTaskForm({ ...taskForm, dueAt: e.target.value })} className="text-foreground" />
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <NativeSelect value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option value="low">Baixa</option>
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </NativeSelect>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <NativeSelect value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>
                {TASK_STATUS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTaskDialog(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveTask()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelScheduleId} onOpenChange={(o) => !o && setCancelScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar marco?</AlertDialogTitle>
            <AlertDialogDescription>O marco permanece no histórico com status cancelado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!cancelScheduleId) return;
                void api.post(`${base}/schedule/${cancelScheduleId}/cancel`).then(() => {
                  setCancelScheduleId(null);
                  void reload();
                });
              }}
            >
              Cancelar marco
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cancelTaskId} onOpenChange={(o) => !o && setCancelTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar tarefa?</AlertDialogTitle>
            <AlertDialogDescription>A tarefa ficará com status cancelado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!cancelTaskId) return;
                void api.post(`${base}/operational-tasks/${cancelTaskId}/cancel`).then(() => {
                  setCancelTaskId(null);
                  void reload();
                });
              }}
            >
              Cancelar tarefa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
