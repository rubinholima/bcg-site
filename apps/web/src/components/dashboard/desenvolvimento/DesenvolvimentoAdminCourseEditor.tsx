"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Cup360PageShell } from "@/components/dashboard/cup360/Cup360PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectField } from "@/components/ui/native-select";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import type { LearningLessonType } from "@/lib/desenvolvimento-types";
import { Tenant } from "@/types/tenant";

type CourseDetail = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  status: string;
  tenantId: string | null;
  modules: {
    id: string;
    title: string;
    sortOrder: number;
    lessons: {
      id: string;
      title: string;
      sortOrder: number;
      lessonType: LearningLessonType;
      contentHtml: string | null;
      externalUrl: string | null;
      quiz?: { questions: { question: string; options: string[]; correctIndex: number }[] } | null;
    }[];
  }[];
};

export function DesenvolvimentoAdminCourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<{ id: string; username: string; name: string | null }[]>([]);
  const [assignMode, setAssignMode] = useState("all_tenant");
  const [assignTenantId, setAssignTenantId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignUserId, setAssignUserId] = useState("");
  const [assignMandatory, setAssignMandatory] = useState(false);
  const [assignDueAt, setAssignDueAt] = useState("");
  const [progress, setProgress] = useState<
    { user: { username: string; name: string | null }; status: string; progressPct: number }[]
  >([]);
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant?: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    const [{ data: c }, { data: p }] = await Promise.all([
      api.get<CourseDetail>(`/desenvolvimento/admin/courses/${courseId}`),
      api.get<typeof progress>(`/desenvolvimento/admin/courses/${courseId}/progress`),
    ]);
    setCourse(c);
    setProgress(Array.isArray(p) ? p : []);
  }, [courseId]);

  useEffect(() => {
    void Promise.all([
      api.get<CourseDetail>(`/desenvolvimento/admin/courses/${courseId}`),
      api.get<typeof progress>(`/desenvolvimento/admin/courses/${courseId}/progress`),
    ]).then(([{ data: c }, { data: p }]) => {
      setCourse(c);
      setProgress(Array.isArray(p) ? p : []);
    });
    void api.get<Tenant[]>("/tenants").then(({ data }) => setTenants(Array.isArray(data) ? data : []));
    void api
      .get<{ id: string; username: string; name: string | null }[]>("/users")
      .then(({ data }) => setUsers(Array.isArray(data) ? data : []));
  }, [courseId]);

  if (!course) return <p className="text-sm text-muted-foreground">Carregando curso…</p>;

  const saveCourse = async () => {
    await api.patch(`/desenvolvimento/admin/courses/${courseId}`, {
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
    });
    setFeedback({ title: "Salvo", message: "Dados do curso atualizados.", variant: "success" });
  };

  const setStatus = async (status: string) => {
    await api.post(`/desenvolvimento/admin/courses/${courseId}/status`, { status });
    await load();
  };

  const addModule = async () => {
    await api.post(`/desenvolvimento/admin/courses/${courseId}/modules`, {
      title: `Módulo ${course.modules.length + 1}`,
      sortOrder: course.modules.length,
    });
    await load();
  };

  const addLesson = async (moduleId: string, sortOrder: number) => {
    await api.post(`/desenvolvimento/admin/courses/${courseId}/modules/${moduleId}/lessons`, {
      title: "Nova lição",
      sortOrder,
      lessonType: "TEXT",
      contentHtml: "<p>Conteúdo</p>",
    });
    await load();
  };

  const createAssignment = async () => {
    await api.post(`/desenvolvimento/admin/courses/${courseId}/assignments`, {
      targetMode: assignMode,
      tenantId: assignTenantId || course.tenantId,
      targetRoleSlug: assignRole || null,
      targetUserId: assignUserId || null,
      mandatory: assignMandatory,
      dueAt: assignDueAt || null,
    });
    await load();
    setFeedback({ title: "Atribuição criada", message: "Matrículas materializadas.", variant: "success" });
  };

  return (
    <Cup360PageShell>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/desenvolvimento/admin">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3 rounded-lg border border-border/60 p-4">
          <h2 className="font-semibold">Curso</h2>
          <Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
          <Input
            value={course.subtitle ?? ""}
            onChange={(e) => setCourse({ ...course, subtitle: e.target.value })}
            placeholder="Subtítulo"
          />
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={course.description ?? ""}
            onChange={(e) => setCourse({ ...course, description: e.target.value })}
            placeholder="Descrição"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void saveCourse()}>
              Salvar
            </Button>
            <Button type="button" onClick={() => void setStatus("published")}>
              Publicar
            </Button>
            <Button type="button" variant="secondary" onClick={() => void setStatus("archived")}>
              Arquivar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Status: {course.status}</p>
        </section>

        <section className="space-y-3 rounded-lg border border-border/60 p-4">
          <h2 className="font-semibold">Atribuição</h2>
          <NativeSelect value={assignMode} onChange={(e) => setAssignMode(e.target.value)}>
            <option value="all_tenant">Todos da empresa</option>
            <option value="tenant">Empresa</option>
            <option value="role">Perfil</option>
            <option value="user">Usuário</option>
          </NativeSelect>
          <NativeSelectField
            value={assignTenantId}
            onChange={(e) => setAssignTenantId(e.target.value)}
            placeholder="Empresa"
            options={tenants.map((t) => ({ value: t.id, label: t.name }))}
          />
          {assignMode === "role" ? (
            <Input value={assignRole} onChange={(e) => setAssignRole(e.target.value)} placeholder="Slug do perfil (ex.: treinador)" />
          ) : null}
          {assignMode === "user" ? (
            <NativeSelectField
              value={assignUserId}
              onChange={(e) => setAssignUserId(e.target.value)}
              placeholder="Usuário"
              options={users.map((u) => ({ value: u.id, label: u.name ?? u.username }))}
            />
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={assignMandatory} onChange={(e) => setAssignMandatory(e.target.checked)} />
            Obrigatório
          </label>
          <Input type="date" className="text-foreground" value={assignDueAt} onChange={(e) => setAssignDueAt(e.target.value)} />
          <Button type="button" onClick={() => void createAssignment()}>
            Criar atribuição
          </Button>
        </section>
      </div>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Módulos e lições</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => void addModule()}>
            <Plus className="h-4 w-4" />
            Módulo
          </Button>
        </div>
        {course.modules.map((mod) => (
          <div key={mod.id} className="rounded-lg border border-border/60 p-3">
            <p className="font-medium">{mod.title}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {mod.lessons.map((lesson) => (
                <li key={lesson.id} className="flex items-center justify-between gap-2">
                  <span>
                    {lesson.title} <span className="text-muted-foreground">({lesson.lessonType})</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => void addLesson(mod.id, mod.lessons.length)}
            >
              <Plus className="h-3 w-3" />
              Lição
            </Button>
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-lg border border-border/60 p-4">
        <h2 className="mb-3 font-semibold">Progresso ({progress.length})</h2>
        <ul className="space-y-2 text-sm">
          {progress.map((row, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-border/30 pb-2">
              <span>{row.user.name ?? row.user.username}</span>
              <span className="text-muted-foreground">
                {row.progressPct}% · {row.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant ?? "info"}
      />
    </Cup360PageShell>
  );
}
