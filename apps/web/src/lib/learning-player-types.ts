/** Experiência premium do player — extensão backward-compatible de liveMeta */

export type LearningPlayerStepId =
  | "context"
  | "learn"
  | "imitate"
  | "practice"
  | "verify"
  | "mission";

export type LearningPlayerStepDef = {
  id: LearningPlayerStepId;
  label: string;
  labelPt: string;
};

export type LearningDialogueLine = {
  speaker: string;
  textEn: string;
  audioKey?: string;
};

export type LearningPhraseItem = {
  en: string;
  pt: string;
  note?: string;
};

export type LearningAudioPhraseItem = {
  en: string;
  audioKey?: string;
  audioUrl?: string;
};

export type LearningPracticeOption = {
  labelEn: string;
  correct: boolean;
  feedbackPt: string;
};

export type LearningPracticeItem = {
  id: string;
  promptPt: string;
  options: LearningPracticeOption[];
};

export type LearningPlayerExperience = {
  version: number;
  levelLabel: string;
  moduleNumber: number;
  goalPt: string;
  steps: LearningPlayerStepDef[];
  context: {
    scenarioPt: string;
    dialogue: LearningDialogueLine[];
  };
  learn: {
    introPt: string;
    phrases: LearningPhraseItem[];
    languageTip?: string;
  };
  imitate: {
    introPt: string;
    phrases: LearningAudioPhraseItem[];
    dialogueEn?: string;
    dialogueAudioKey?: string;
    dialogueAudioUrl?: string;
  };
  practice: {
    introPt: string;
    items: LearningPracticeItem[];
  };
  mission: {
    headlineEn: string;
    headlinePt: string;
    bodyPt: string;
    canDo: string[];
  };
};

export type LearningLiveMeta = {
  methodology?: "LIVE";
  realLifeContext?: string;
  learn?: string;
  imitate?: string;
  buildPractice?: string;
  verify?: string;
  executeMission?: string;
  player?: LearningPlayerExperience;
};

export const PREMIUM_PILOT_LESSON_KEY = "start-m01-l01-hello";

export function parsePremiumPlayer(liveMeta: unknown): LearningPlayerExperience | null {
  if (!liveMeta || typeof liveMeta !== "object") return null;
  const player = (liveMeta as LearningLiveMeta).player;
  if (!player || player.version !== 1 || !Array.isArray(player.steps)) return null;
  return player;
}
