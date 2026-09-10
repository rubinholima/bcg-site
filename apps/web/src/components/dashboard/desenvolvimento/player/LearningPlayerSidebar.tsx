"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningPlayerLesson, LearningPlayerResponse } from "@/lib/desenvolvimento-types";

function lessonState(lesson: LearningPlayerLesson, activeLessonId: string) {
  if (lesson.id === activeLessonId) return "current" as const;
  if (lesson.progress?.status === "completed") return "completed" as const;
  return "available" as const;
}

export function LearningPlayerSidebar({
  data,
  activeLessonId,
  activeModuleId,
  onSelectLesson,
  className,
}: {
  data: LearningPlayerResponse;
  activeLessonId: string;
  activeModuleId: string;
  onSelectLesson: (lessonId: string) => void;
  className?: string;
}) {
  const modulesWithLessons = data.course.modules.filter((m) =>
    data.lessons.some((l) => l.moduleId === m.id),
  );

  const moduleLessons = data.lessons.filter((l) => l.moduleId === activeModuleId);
  const moduleCompleted = moduleLessons.filter((l) => l.progress?.status === "completed").length;
  const moduleProgress = moduleLessons.length
    ? Math.round((moduleCompleted / moduleLessons.length) * 100)
    : 0;

  return (
    <aside
      className={cn(
        "hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col rounded-xl border border-border/60 bg-card/50 p-4",
        className,
      )}
    >
      <div className="mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Módulo atual</p>
        <p className="mt-1 text-sm font-medium leading-snug text-foreground">
          {data.course.modules.find((m) => m.id === activeModuleId)?.title}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted/40">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${moduleProgress}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{moduleProgress}% do módulo</p>
      </div>

      <ul className="space-y-1 overflow-y-auto">
        {moduleLessons.map((lesson, idx) => {
          const state = lessonState(lesson, activeLessonId);
          return (
            <li key={lesson.id}>
              <button
                type="button"
                onClick={() => onSelectLesson(lesson.id)}
                className={cn(
                  "flex w-full min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                  state === "current" && "bg-violet-500/15 text-foreground ring-1 ring-violet-500/30",
                  state === "completed" && "text-foreground hover:bg-muted/30",
                  state === "available" && "text-foreground/90 hover:bg-muted/30",
                )}
              >
                {state === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : state === "current" ? (
                  <Circle className="h-4 w-4 shrink-0 fill-violet-500 text-violet-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                )}
                <span className="min-w-0 flex-1 truncate">{idx + 1}. {lesson.title}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {modulesWithLessons.length > 1 ? (
        <p className="mt-auto pt-4 text-[11px] text-muted-foreground">
          +{modulesWithLessons.length - 1} módulo(s) após concluir este
        </p>
      ) : null}
    </aside>
  );
}
