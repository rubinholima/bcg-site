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

/** v2 — micro-tela dentro de uma etapa principal */
export type LearningMicroScreenBase = {
  id: string;
};

export type LearningMicroScreen =
  | (LearningMicroScreenBase & {
      type: "intro";
      titleEn: string;
      titlePt?: string;
      bodyPt: string;
    })
  | (LearningMicroScreenBase & {
      type: "scenario";
      scenarioPt: string;
      settingEn?: string;
    })
  | (LearningMicroScreenBase & {
      type: "dialogue_choice";
      speaker: string;
      promptEn: string;
      promptPt?: string;
      options: LearningPracticeOption[];
    })
  | (LearningMicroScreenBase & {
      type: "phrase_examples";
      titleEn: string;
      titlePt: string;
      introPt?: string;
      examples: { en: string; pt?: string }[];
    })
  | (LearningMicroScreenBase & {
      type: "comparison";
      titleEn: string;
      titlePt: string;
      left: { labelEn: string; exampleEn: string; notePt: string };
      right: { labelEn: string; exampleEn: string; notePt: string };
      modelEn: string;
      modelPt?: string;
    })
  | (LearningMicroScreenBase & {
      type: "nationality";
      titleEn: string;
      titlePt: string;
      pairs: { countryEn: string; nationalityEn: string; notePt?: string }[];
      introPt?: string;
    })
  | (LearningMicroScreenBase & {
      type: "language_focus";
      titleEn: string;
      titlePt: string;
      items: { formalEn: string; naturalEn: string; notePt: string }[];
      tipPt?: string;
    })
  | (LearningMicroScreenBase & {
      type: "vocabulary";
      titleEn: string;
      titlePt: string;
      words: { en: string; pt: string; exampleEn: string }[];
    })
  | (LearningMicroScreenBase & {
      type: "mistake";
      titlePt: string;
      wrongEn: string;
      rightEn: string;
      explanationPt: string;
    })
  | (LearningMicroScreenBase & {
      type: "review";
      titleEn: string;
      titlePt: string;
      items: { en: string; pt: string }[];
    })
  | (LearningMicroScreenBase & {
      type: "read_repeat";
      titleEn?: string;
      titlePt?: string;
      introPt?: string;
      phrases: { en: string }[];
      dialogueEn?: string;
    })
  | (LearningMicroScreenBase & {
      type: "mission_intro";
      headlineEn: string;
      headlinePt: string;
      bodyPt: string;
      prompts: { speaker: string; questionEn: string }[];
    });

export type LearningPracticeInteraction =
  | (LearningPracticeItem & { type: "choice" })
  | {
      id: string;
      type: "fill_blank";
      promptPt: string;
      templateEn: string;
      blankLabel: string;
      options: LearningPracticeOption[];
    }
  | {
      id: string;
      type: "reorder";
      promptPt: string;
      tokens: string[];
      correctOrder: string[];
      feedbackCorrectPt: string;
      feedbackWrongPt: string;
    }
  | {
      id: string;
      type: "classify";
      promptPt: string;
      sentenceEn: string;
      category: "from" | "live";
      feedbackCorrectPt: string;
      feedbackWrongPt: string;
    }
  | {
      id: string;
      type: "dialogue_complete";
      promptPt: string;
      speaker: string;
      contextEn: string;
      options: LearningPracticeOption[];
    };

export type LearningMissionProduction = {
  introPt: string;
  prompts: { speaker: string; questionEn: string }[];
  fields: { id: string; labelPt: string; prefixEn: string; placeholderEn: string }[];
  exampleEn: string;
};

export type LearningPlayerExperience = {
  version: number;
  levelLabel: string;
  moduleNumber: number;
  goalPt: string;
  steps: LearningPlayerStepDef[];
  /** v1 — conteúdo plano (lições 1,2,4,5) */
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
    production?: LearningMissionProduction;
  };
  /** v2 — micro-telas por etapa (piloto deep learning) */
  stepScreens?: Partial<Record<LearningPlayerStepId, LearningMicroScreen[]>>;
  practiceInteractions?: LearningPracticeInteraction[];
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

export function parsePremiumPlayer(liveMeta: unknown): LearningPlayerExperience | null {
  if (!liveMeta || typeof liveMeta !== "object") return null;
  const player = (liveMeta as LearningLiveMeta).player;
  if (!player || (player.version !== 1 && player.version !== 2) || !Array.isArray(player.steps)) return null;
  return player;
}

export function isDeepPlayer(player: LearningPlayerExperience): boolean {
  return player.version === 2;
}

export function getStepScreens(
  player: LearningPlayerExperience,
  stepId: LearningPlayerStepId,
): LearningMicroScreen[] | null {
  const screens = player.stepScreens?.[stepId];
  return screens?.length ? screens : null;
}

export function getPracticeItems(player: LearningPlayerExperience): LearningPracticeInteraction[] {
  if (player.practiceInteractions?.length) return player.practiceInteractions;
  return player.practice.items.map((item) => ({ ...item, type: "choice" as const }));
}
