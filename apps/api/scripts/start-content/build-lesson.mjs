/** Factory Player v2 — padrão Módulo 1 */

const STEPS = [
  { id: 'context', label: 'Context', labelPt: 'Contexto' },
  { id: 'learn', label: 'Learn', labelPt: 'Aprenda' },
  { id: 'imitate', label: 'Read & Repeat', labelPt: 'Leia e repita' },
  { id: 'practice', label: 'Practice', labelPt: 'Pratique' },
  { id: 'verify', label: 'Verify', labelPt: 'Verifique' },
  { id: 'mission', label: 'Mission', labelPt: 'Missão' },
];

function idPrefix(contentKey) {
  const m = contentKey.match(/start-m(\d+)-l(\d+)/);
  return m ? `m${m[1]}-l${m[2]}` : contentKey.slice(-8);
}

/**
 * @param {object} def
 * @returns {object} Player v2 JSON
 */
export function buildPlayer(def) {
  const pfx = idPrefix(def.contentKey);
  const learn = [];

  for (let i = 0; i < (def.phraseBlocks ?? []).length; i++) {
    const b = def.phraseBlocks[i];
    learn.push({
      id: `${pfx}-learn-${String(i + 1).padStart(2, '0')}`,
      type: 'phrase_examples',
      titleEn: b.titleEn,
      titlePt: b.titlePt,
      introPt: b.introPt,
      examples: b.examples,
    });
  }

  if (def.comparison) {
    learn.push({
      id: `${pfx}-learn-cmp`,
      type: 'comparison',
      ...def.comparison,
    });
  }

  if (def.languageFocus) {
    learn.push({
      id: `${pfx}-learn-lf`,
      type: 'language_focus',
      ...def.languageFocus,
    });
  }

  if (def.vocabulary) {
    learn.push({
      id: `${pfx}-learn-voc`,
      type: 'vocabulary',
      ...def.vocabulary,
    });
  }

  if (def.mistake) {
    learn.push({
      id: `${pfx}-learn-mst`,
      type: 'mistake',
      ...def.mistake,
    });
  }

  if (def.review?.length) {
    learn.push({
      id: `${pfx}-learn-rev`,
      type: 'review',
      titleEn: def.reviewTitleEn ?? 'Quick review',
      titlePt: def.reviewTitlePt ?? 'Revisão rápida',
      items: def.review,
    });
  }

  const ctx = [
    {
      id: `${pfx}-ctx-01`,
      type: 'intro',
      titleEn: def.intro.titleEn,
      titlePt: def.intro.titlePt,
      bodyPt: def.intro.bodyPt,
    },
    {
      id: `${pfx}-ctx-02`,
      type: 'scenario',
      settingEn: def.scenario.settingEn,
      scenarioPt: def.scenario.scenarioPt,
    },
    ...(def.ctxChoices ?? []).map((c, i) => ({
      id: `${pfx}-ctx-${String(i + 3).padStart(2, '0')}`,
      type: 'dialogue_choice',
      ...c,
    })),
  ];

  const imitate = [
    {
      id: `${pfx}-imit-01`,
      type: 'read_repeat',
      titleEn: 'Read & Repeat',
      titlePt: 'Leia e repita',
      introPt:
        'Sem áudio ainda — leia em voz alta, pausa curta entre frases. Depois leia o diálogo completo.',
      phrases: def.readRepeat.phrases.map((en) => ({ en })),
      dialogueEn: def.readRepeat.dialogueEn,
    },
  ];

  const missionScreens = [
    {
      id: `${pfx}-miss-01`,
      type: 'mission_intro',
      headlineEn: def.mission.headlineEn,
      headlinePt: def.mission.headlinePt,
      bodyPt: def.mission.bodyPt,
      prompts: def.mission.production.prompts,
    },
  ];

  return {
    version: 2,
    levelLabel: 'START',
    moduleNumber: def.moduleNumber,
    goalPt: def.goalPt,
    steps: STEPS,
    context: { scenarioPt: def.scenario.scenarioPt, dialogue: [] },
    learn: { introPt: '', phrases: [] },
    imitate: { introPt: 'Leia em voz alta e repita cada frase.', phrases: [] },
    practice: { introPt: 'Interações guiadas — feedback imediato, sem nota.', items: [] },
    mission: {
      headlineEn: def.mission.headlineEn,
      headlinePt: def.mission.headlinePt,
      bodyPt: def.mission.bodyPt ?? '',
      canDo: def.mission.canDo,
      production: def.mission.production,
    },
    stepScreens: {
      context: ctx,
      learn,
      imitate,
      mission: missionScreens,
    },
    practiceInteractions: def.practice.map((item, i) => ({
      id: `${pfx}-prac-${String(i + 1).padStart(2, '0')}`,
      ...item,
    })),
  };
}

export function buildQuiz(def) {
  const isChallenge = def.challenge || def.finalMission;
  const count = isChallenge ? (def.finalMission ? 12 : 10) : 8;
  const questions = def.quiz.slice(0, count).map((q, i) => ({
    contentKey: `${def.contentKey}-q${String(i + 1).padStart(2, '0')}`,
    sortOrder: i,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
  }));

  return {
    passingScore: 70,
    maxAttempts: 5,
    questions,
  };
}

export function choice(promptPt, options) {
  return { type: 'choice', promptPt, options };
}

export function fillBlank(promptPt, templateEn, blankLabel, options) {
  return { type: 'fill_blank', promptPt, templateEn, blankLabel, options };
}

export function reorder(promptPt, tokens, correctOrder, feedbackCorrectPt, feedbackWrongPt) {
  return { type: 'reorder', promptPt, tokens, correctOrder, feedbackCorrectPt, feedbackWrongPt };
}

export function dialogueComplete(promptPt, speaker, contextEn, options) {
  return { type: 'dialogue_complete', promptPt, speaker, contextEn, options };
}

export function opt(labelEn, correct, feedbackPt) {
  return { labelEn, correct, feedbackPt };
}
