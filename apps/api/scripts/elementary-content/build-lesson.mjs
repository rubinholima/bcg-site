/** Factory Player v2 — Elementary English */

export const STEPS = [
  { id: 'context', label: 'Context', labelPt: 'Contexto' },
  { id: 'learn', label: 'Learn', labelPt: 'Aprenda' },
  { id: 'imitate', label: 'Read & Repeat', labelPt: 'Leia e repita' },
  { id: 'practice', label: 'Practice', labelPt: 'Pratique' },
  { id: 'verify', label: 'Verify', labelPt: 'Verifique' },
  { id: 'mission', label: 'Mission', labelPt: 'Missão' },
];

function idPrefix(contentKey) {
  const m = contentKey.match(/elem-m(\d+)-l(\d+)/);
  return m ? `em${m[1]}-l${m[2]}` : contentKey.slice(-10);
}

export function buildPlayer(def) {
  const pfx = idPrefix(def.contentKey);
  const isChallenge = def.challenge || def.finalMission;
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
  if (def.comparison) learn.push({ id: `${pfx}-learn-cmp`, type: 'comparison', ...def.comparison });
  if (def.languageFocus) learn.push({ id: `${pfx}-learn-lf`, type: 'language_focus', ...def.languageFocus });
  if (def.vocabulary) learn.push({ id: `${pfx}-learn-voc`, type: 'vocabulary', ...def.vocabulary });
  if (def.mistake) learn.push({ id: `${pfx}-learn-mst`, type: 'mistake', ...def.mistake });
  for (let i = 0; i < (def.reviewBlocks ?? []).length; i++) {
    const rb = def.reviewBlocks[i];
    learn.push({
      id: `${pfx}-learn-rev-${String(i + 1).padStart(2, '0')}`,
      type: 'review',
      titleEn: rb.titleEn,
      titlePt: rb.titlePt,
      items: rb.items,
    });
  }
  if (def.review?.length && !(def.reviewBlocks?.length)) {
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

  const imitate = [{
    id: `${pfx}-imit-01`,
    type: 'read_repeat',
    titleEn: 'Read & Repeat',
    titlePt: 'Leia e repita',
    introPt: 'Read aloud — no audio yet. Pause between lines, then read the full dialogue.',
    phrases: (def.readRepeat?.phrases ?? []).map((en) => ({ en })),
    dialogueEn: def.readRepeat?.dialogueEn,
  }];

  return {
    version: 2,
    levelLabel: 'ELEMENTARY',
    moduleNumber: def.moduleNumber,
    goalPt: def.goalPt,
    steps: STEPS,
    context: { scenarioPt: def.scenario.scenarioPt, dialogue: [] },
    learn: { introPt: '', phrases: [] },
    imitate: { introPt: 'Leia em voz alta.', phrases: [] },
    practice: { introPt: 'Guided practice — immediate feedback.', items: [] },
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
      mission: [{
        id: `${pfx}-miss-01`,
        type: 'mission_intro',
        headlineEn: def.mission.headlineEn,
        headlinePt: def.mission.headlinePt,
        bodyPt: def.mission.bodyPt ?? '',
        prompts: def.mission.production.prompts,
      }],
    },
    practiceInteractions: (def.practice ?? []).map((item, i) => ({
      id: `${pfx}-prac-${String(i + 1).padStart(2, '0')}`,
      ...item,
    })),
    _meta: { challenge: isChallenge, estimatedMinutes: isChallenge ? (def.finalMission ? 22 : 18) : 14 },
  };
}

export function opt(labelEn, correct, feedbackPt) {
  return { labelEn, correct, feedbackPt };
}
