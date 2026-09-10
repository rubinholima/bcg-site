"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { LearningPlayerResponse } from "@/lib/desenvolvimento-types";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { cn } from "@/lib/utils";
import { cup360 } from "@/lib/cup360-design-tokens";

export function DesenvolvimentoCoursePlayer({ courseId }: { courseId: string }) {
  const [data, setData] = useState<LearningPlayerResponse | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<{ title: string; message: string; variant?: "success" | "error" } | null>(null);

  const load = useCallback(async (pickFirstLesson = false) => {
    setLoading(true);
    try {
      const { data: res } = await api.get<LearningPlayerResponse>(`/desenvolvimento/courses/${courseId}/player`);
      setData(res);
      if (pickFirstLesson && res.lessons[0]) setActiveLessonId(res.lessons[0].id);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load(true);
  }, [courseId, load]);

  const activeIndex = useMemo(
    () => (data?.lessons.findIndex((l) => l.id === activeLessonId) ?? -1),
    [data, activeLessonId],
  );
  const activeLesson = activeIndex >= 0 ? data?.lessons[activeIndex] : null;

  useEffect(() => {
    if (!data || !activeLessonId) return;
    void api.post(`/desenvolvimento/enrollments/${data.enrollment.id}/lessons/${activeLessonId}/touch`);
  }, [data, activeLessonId]);

  const handleComplete = async () => {
    if (!data || !activeLesson) return;
    try {
      await api.post(
        `/desenvolvimento/enrollments/${data.enrollment.id}/lessons/${activeLesson.id}/complete`,
      );
      await load();
      setFeedback({ title: "Lição concluída", message: "Progresso atualizado.", variant: "success" });
    } catch (e: unknown) {
      setFeedback({
        title: "Não foi possível concluir",
        message: e instanceof Error ? e.message : "Erro ao salvar progresso.",
        variant: "error",
      });
    }
  };

  const handleQuizSubmit = async () => {
    if (!data || !activeLesson?.quiz) return;
    const answers = activeLesson.quiz.questions.map((q) => ({
      questionId: q.id,
      selectedIndex: quizAnswers[q.id] ?? -1,
    }));
    try {
      const { data: result } = await api.post<{ score: number; passed: boolean; passingScore: number }>(
        `/desenvolvimento/enrollments/${data.enrollment.id}/lessons/${activeLesson.id}/quiz/submit`,
        { answers },
      );
      if (result.passed) {
        await load();
        setFeedback({
          title: "Quiz aprovado",
          message: `Nota ${result.score}% (mínimo ${result.passingScore}%).`,
          variant: "success",
        });
      } else {
        setFeedback({
          title: "Quiz reprovado",
          message: `Nota ${result.score}%. Tente novamente.`,
          variant: "error",
        });
      }
    } catch (e: unknown) {
      setFeedback({
        title: "Erro no quiz",
        message: e instanceof Error ? e.message : "Não foi possível enviar.",
        variant: "error",
      });
    }
  };

  if (loading) return <p className={cup360.type.caption}>Carregando curso…</p>;
  if (!data || !activeLesson) {
    return (
      <div className="space-y-3">
        <p className={cup360.type.body}>Curso indisponível ou você não está matriculado.</p>
        <Button asChild variant="outline">
          <Link href="/dashboard/desenvolvimento">Voltar</Link>
        </Button>
      </div>
    );
  }

  const prev = activeIndex > 0 ? data.lessons[activeIndex - 1] : null;
  const next = activeIndex < data.lessons.length - 1 ? data.lessons[activeIndex + 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/dashboard/desenvolvimento/meus-cursos">
            <ArrowLeft className="h-4 w-4" />
            Meus cursos
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className={cup360.type.sectionTitle}>{data.course.title}</h1>
          <p className={cup360.type.caption}>{data.enrollment.progressPct}% concluído</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <aside className="rounded-lg border border-border/60 bg-muted/10 p-3 lg:max-h-[70vh] lg:overflow-y-auto">
          {data.course.modules.map((mod) => (
            <div key={mod.id} className="mb-3 last:mb-0">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{mod.title}</p>
              <ul className="space-y-1">
                {data.lessons
                  .filter((l) => l.moduleId === mod.id)
                  .map((lesson) => {
                    const done = lesson.progress?.status === "completed";
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          onClick={() => setActiveLessonId(lesson.id)}
                          className={cn(
                            "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                            lesson.id === activeLessonId ? "bg-primary/15 text-foreground" : "hover:bg-muted/40",
                          )}
                        >
                          {done ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                          ) : (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          )}
                          <span className="min-w-0 break-words">{lesson.title}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </aside>

        <section className="min-w-0 rounded-lg border border-border/60 bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold">{activeLesson.title}</h2>
          <div className="mt-4 space-y-4">
            {activeLesson.lessonType === "TEXT" && (
              <div
                className="prose prose-invert max-w-none text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: activeLesson.contentHtml ?? "" }}
              />
            )}
            {activeLesson.lessonType === "LINK" && activeLesson.externalUrl ? (
              <a
                href={activeLesson.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Abrir conteúdo externo
              </a>
            ) : null}
            {(activeLesson.lessonType === "VIDEO" || activeLesson.lessonType === "DOCUMENT") && activeLesson.fileUrl ? (
              activeLesson.mimeType?.startsWith("video/") ? (
                <video controls className="w-full max-h-[480px] rounded-md bg-black" src={activeLesson.fileUrl} />
              ) : (
                <a href={activeLesson.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  Abrir documento
                </a>
              )
            ) : null}
            {activeLesson.lessonType === "QUIZ" && activeLesson.quiz ? (
              <div className="space-y-4">
                {activeLesson.quiz.questions.map((q) => (
                  <fieldset key={q.id} className="space-y-2 rounded-md border border-border/50 p-3">
                    <legend className="px-1 text-sm font-medium">{q.question}</legend>
                    {q.options.map((opt, idx) => (
                      <label key={idx} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={q.id}
                          checked={quizAnswers[q.id] === idx}
                          onChange={() => setQuizAnswers((s) => ({ ...s, [q.id]: idx }))}
                          className="h-4 w-4"
                        />
                        {opt}
                      </label>
                    ))}
                  </fieldset>
                ))}
                <Button type="button" onClick={() => void handleQuizSubmit()}>
                  Enviar quiz
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!prev}
              onClick={() => prev && setActiveLessonId(prev.id)}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            {activeLesson.lessonType !== "QUIZ" ? (
              <Button type="button" size="sm" onClick={() => void handleComplete()}>
                Marcar como concluída
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Conclua via quiz aprovado</span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!next}
              onClick={() => next && setActiveLessonId(next.id)}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </div>

      <FeedbackModal
        open={!!feedback}
        onOpenChange={(open) => !open && setFeedback(null)}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant ?? "info"}
      />
    </div>
  );
}
