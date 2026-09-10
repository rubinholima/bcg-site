"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import type { LearningPlayerLesson, LearningPlayerResponse } from "@/lib/desenvolvimento-types";
import {
  getPracticeItems,
  getStepScreens,
  isDeepPlayer,
  type LearningPlayerExperience,
  type LearningPlayerStepId,
} from "@/lib/learning-player-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LearningPlayerSidebar } from "./LearningPlayerSidebar";
import { LearningDialogue } from "./LearningDialogue";
import { LearningPhraseCard, LearningLanguageTip } from "./LearningPhraseCard";
import {
  LearningAudioPhrase,
  LearningAudioUnavailableNote,
  playerExperienceHasAudio,
} from "./LearningAudioPhrase";
import { NativeSelect } from "@/components/ui/native-select";
import { LearningPracticeActivity } from "./LearningPracticeActivity";
import { LearningPracticeInteractionView } from "./LearningPracticeInteractionView";
import { LearningQuizFlow } from "./LearningQuizFlow";
import { LearningMissionScreen } from "./LearningMissionScreen";
import { LearningMissionProduction } from "./LearningMissionProduction";
import { LearningMicroScreenStep } from "./LearningMicroScreenStep";

type Props = {
  data: LearningPlayerResponse;
  lesson: LearningPlayerLesson;
  player: LearningPlayerExperience;
  onLessonChange: (lessonId: string) => void;
  onReload: () => Promise<void>;
};

export function PremiumLessonPlayer({ data, lesson, player, onLessonChange, onReload }: Props) {
  const steps = player.steps;
  const [stepIndex, setStepIndex] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(() =>
    lesson.progress?.status === "completed" ? steps.length - 1 : 0,
  );
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceStepComplete, setPracticeStepComplete] = useState(
    () => lesson.progress?.status === "completed",
  );
  const [stepMicroComplete, setStepMicroComplete] = useState<Partial<Record<LearningPlayerStepId, boolean>>>(() => {
    if (lesson.progress?.status !== "completed") return {};
    return Object.fromEntries(steps.map((s) => [s.id, true])) as Partial<Record<LearningPlayerStepId, boolean>>;
  });
  const [verifyPassed, setVerifyPassed] = useState(
    () => lesson.progress?.status === "completed",
  );
  const hasAudio = playerExperienceHasAudio(player);
  const deep = isDeepPlayer(player);

  const step = steps[stepIndex];
  const stepId = step?.id as LearningPlayerStepId | undefined;

  const lessonIndexInModule = useMemo(() => {
    const modLessons = data.lessons.filter((l) => l.moduleId === lesson.moduleId);
    return modLessons.findIndex((l) => l.id === lesson.id);
  }, [data.lessons, lesson]);

  const lessonNumber = lessonIndexInModule + 1;
  const lessonsInModule = data.lessons.filter((l) => l.moduleId === lesson.moduleId).length;

  useEffect(() => {
    void api.post(`/desenvolvimento/enrollments/${data.enrollment.id}/lessons/${lesson.id}/touch`);
  }, [data.enrollment.id, lesson.id]);

  const stepProgressPct = Math.round(((stepIndex + 1) / steps.length) * 100);

  const canGoToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= steps.length) return false;
      const targetId = steps[index]?.id as LearningPlayerStepId | undefined;
      if (targetId === "mission" && lesson.quiz && !verifyPassed) return false;
      if (targetId === "mission" && verifyPassed) return true;
      return index <= maxStepReached;
    },
    [steps, maxStepReached, lesson.quiz, verifyPassed],
  );

  const goToStep = useCallback(
    (index: number) => {
      if (!canGoToStep(index)) return;
      setStepIndex(index);
      if (steps[index]?.id !== "practice") setPracticeIndex(0);
    },
    [canGoToStep, steps],
  );

  const goNextStep = () => {
    const next = Math.min(steps.length - 1, stepIndex + 1);
    const nextId = steps[next]?.id as LearningPlayerStepId | undefined;
    if (!canAdvanceFromCurrentStep) return;
    if (nextId === "mission" && lesson.quiz && !verifyPassed) return;
    setMaxStepReached((m) => Math.max(m, next));
    goToStep(next);
  };

  const goPrevStep = () => goToStep(Math.max(0, stepIndex - 1));

  const handleQuizSubmit = useCallback(
    async (answers: Record<string, number>) => {
      if (!lesson.quiz) throw new Error("Quiz indisponível");
      const payload = lesson.quiz.questions.map((q) => ({
        questionId: q.id,
        selectedIndex: answers[q.id] ?? -1,
      }));
      const { data: result } = await api.post<{ score: number; passed: boolean; passingScore: number }>(
        `/desenvolvimento/enrollments/${data.enrollment.id}/lessons/${lesson.id}/quiz/submit`,
        { answers: payload },
      );
      if (result.passed) {
        setVerifyPassed(true);
        await onReload();
      }
      return result;
    },
    [data.enrollment.id, lesson.id, lesson.quiz, onReload],
  );

  const practiceItems = getPracticeItems(player);
  const currentPractice = practiceItems[practiceIndex];
  const currentStepScreens = stepId ? getStepScreens(player, stepId) : null;

  const markStepMicroComplete = useCallback((id: LearningPlayerStepId) => {
    setStepMicroComplete((prev) => ({ ...prev, [id]: true }));
  }, []);

  const canAdvanceFromCurrentStep =
    !stepId ||
    (!(currentStepScreens && !stepMicroComplete[stepId]) &&
      !(stepId === "practice" && deep && !practiceStepComplete) &&
      !(stepId === "verify" && !verifyPassed));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 lg:space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="min-h-[44px] gap-1">
          <Link href="/dashboard/desenvolvimento/meus-cursos">
            <ArrowLeft className="h-4 w-4" />
            Meus cursos
          </Link>
        </Button>
      </div>

      {/* Mobile compact nav */}
      <div className="space-y-2 rounded-xl border border-border/60 bg-card/80 px-4 py-3 lg:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">
            Módulo {player.moduleNumber} · Lição {lessonNumber}/{lessonsInModule}
          </p>
          <p className="text-xs text-muted-foreground">{data.enrollment.progressPct}% curso</p>
        </div>
        <NativeSelect
          value={lesson.id}
          onChange={(e) => onLessonChange(e.target.value)}
          className="min-h-[44px] w-full"
        >
          {data.lessons
            .filter((l) => l.moduleId === lesson.moduleId)
            .map((l, idx) => (
              <option key={l.id} value={l.id}>
                {idx + 1}. {l.title}
              </option>
            ))}
        </NativeSelect>
        <div className="h-1 overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-violet-500 transition-all"
            style={{ width: `${stepProgressPct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-6 lg:items-start">
        <LearningPlayerSidebar
          data={data}
          activeLessonId={lesson.id}
          activeModuleId={lesson.moduleId}
          onSelectLesson={onLessonChange}
        />

        <div className="min-w-0 flex-1 space-y-5">
          {/* Header */}
          <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-violet-950/20 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
                  {player.levelLabel} · Módulo {player.moduleNumber}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{lesson.title}</h1>
                <p className="text-sm text-muted-foreground hidden lg:block">
                  Lição {lessonNumber} de {lessonsInModule}
                  {lesson.estimatedMinutes ? ` · ~${lesson.estimatedMinutes} min` : ""}
                </p>
              </div>
              <div className="text-right text-sm text-muted-foreground shrink-0">
                <p className="hidden sm:block">Progresso da lição</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{stepProgressPct}%</p>
              </div>
            </div>

            <div className="mt-5 flex gap-1 overflow-x-auto pb-1">
              {steps.map((s, i) => {
                const enabled = canGoToStep(i);
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!enabled}
                    onClick={() => goToStep(i)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors min-h-[36px]",
                      i === stepIndex && "bg-violet-500 text-white",
                      i < stepIndex && enabled && "bg-violet-500/20 text-violet-300",
                      i > stepIndex && "bg-muted/30 text-muted-foreground",
                      !enabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {s.labelPt}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted/40">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-300"
                style={{ width: `${stepProgressPct}%` }}
              />
            </div>
          </header>

          {/* Step content — one screen one intention */}
          <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8 min-h-[320px]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-400 mb-1">{step?.label}</p>
            <h2 className="text-lg font-semibold text-foreground mb-6">{step?.labelPt}</h2>

            {stepId === "context" && currentStepScreens ? (
              <LearningMicroScreenStep
                key={`context-${lesson.id}`}
                screens={currentStepScreens}
                onComplete={() => markStepMicroComplete("context")}
              />
            ) : null}

            {stepId === "context" && !currentStepScreens ? (
              <div className="mx-auto max-w-2xl space-y-6">
                <p className="text-sm leading-relaxed text-muted-foreground">{player.context.scenarioPt}</p>
                <LearningDialogue lines={player.context.dialogue} />
              </div>
            ) : null}

            {stepId === "learn" && currentStepScreens ? (
              <LearningMicroScreenStep
                key={`learn-${lesson.id}`}
                screens={currentStepScreens}
                onComplete={() => markStepMicroComplete("learn")}
              />
            ) : null}

            {stepId === "learn" && !currentStepScreens ? (
              <div className="mx-auto max-w-3xl space-y-5">
                <p className="text-sm text-muted-foreground">{player.learn.introPt}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {player.learn.phrases.map((p) => (
                    <LearningPhraseCard key={p.en} phrase={p} />
                  ))}
                </div>
                {player.learn.languageTip ? <LearningLanguageTip text={player.learn.languageTip} /> : null}
              </div>
            ) : null}

            {stepId === "imitate" && currentStepScreens ? (
              <LearningMicroScreenStep
                key={`imitate-${lesson.id}`}
                screens={currentStepScreens}
                onComplete={() => markStepMicroComplete("imitate")}
              />
            ) : null}

            {stepId === "imitate" && !currentStepScreens ? (
              <div className="mx-auto max-w-2xl space-y-4">
                <p className="text-sm text-muted-foreground">{player.imitate.introPt}</p>
                {!hasAudio ? <LearningAudioUnavailableNote /> : null}
                <ul className="divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/5">
                  {player.imitate.phrases.map((p) => (
                    <li key={p.en} className="px-4 py-3">
                      <LearningAudioPhrase textEn={p.en} audioUrl={p.audioUrl} />
                    </li>
                  ))}
                </ul>
                {player.imitate.dialogueEn ? (
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Diálogo completo
                    </p>
                    <LearningAudioPhrase
                      textEn={player.imitate.dialogueEn}
                      audioUrl={player.imitate.dialogueAudioUrl}
                      size="lg"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {stepId === "practice" && currentPractice ? (
              <div className="mx-auto max-w-xl space-y-4">
                <p className="text-sm text-muted-foreground">{player.practice.introPt}</p>
                <p className="text-xs text-muted-foreground">
                  Atividade {practiceIndex + 1} de {practiceItems.length}
                </p>
                {deep ? (
                  <LearningPracticeInteractionView
                    key={currentPractice.id}
                    item={currentPractice}
                    onComplete={() => {
                      if (practiceIndex < practiceItems.length - 1) {
                        setPracticeIndex((i) => i + 1);
                      } else {
                        setPracticeStepComplete(true);
                      }
                    }}
                  />
                ) : currentPractice.type === "choice" ? (
                  <LearningPracticeActivity
                    key={currentPractice.id}
                    item={currentPractice}
                    onComplete={() => {
                      if (practiceIndex < practiceItems.length - 1) {
                        setPracticeIndex((i) => i + 1);
                      }
                    }}
                  />
                ) : null}
              </div>
            ) : null}

            {stepId === "verify" && lesson.quiz ? (
              <div className="mx-auto max-w-xl">
                {verifyPassed ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-6 text-center">
                    <p className="text-emerald-400 font-medium">Quiz aprovado — Verify concluído.</p>
                    <p className="mt-2 text-sm text-muted-foreground">Avance para a missão final.</p>
                  </div>
                ) : (
                  <LearningQuizFlow quiz={lesson.quiz} onSubmit={handleQuizSubmit} />
                )}
              </div>
            ) : null}

            {stepId === "mission" && currentStepScreens && !stepMicroComplete.mission ? (
              <LearningMicroScreenStep
                key={`mission-intro-${lesson.id}`}
                screens={currentStepScreens}
                onComplete={() => markStepMicroComplete("mission")}
              />
            ) : null}

            {stepId === "mission" && player.mission.production && (stepMicroComplete.mission || !currentStepScreens) ? (
              <div className="mx-auto max-w-2xl">
                <LearningMissionProduction
                  mission={player.mission}
                  production={player.mission.production}
                  lessonCompleted={verifyPassed || lesson.progress?.status === "completed"}
                />
              </div>
            ) : null}

            {stepId === "mission" && !player.mission.production && (stepMicroComplete.mission || !currentStepScreens) ? (
              <div className="mx-auto max-w-2xl">
                <LearningMissionScreen
                  mission={player.mission}
                  lessonCompleted={verifyPassed || lesson.progress?.status === "completed"}
                />
              </div>
            ) : null}
          </section>

          {/* Step navigation — does NOT complete lesson */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stepIndex === 0}
              onClick={() => goPrevStep()}
              className="min-h-[44px]"
            >
              <ChevronLeft className="h-4 w-4" />
              Etapa anterior
            </Button>
            {stepId === "mission" ? (
              <span className="text-xs text-muted-foreground">Missão concluída quando você executar na vida real</span>
            ) : stepId === "verify" && !verifyPassed ? (
              <span className="text-xs text-muted-foreground">Aprove o quiz para continuar</span>
            ) : !canAdvanceFromCurrentStep ? (
              <span className="text-xs text-muted-foreground">Conclua esta etapa para continuar</span>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={stepIndex >= steps.length - 1 || !canAdvanceFromCurrentStep}
                onClick={() => goNextStep()}
                className="min-h-[44px]"
              >
                Próxima etapa
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
