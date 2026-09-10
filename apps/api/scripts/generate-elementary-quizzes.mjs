/**
 * Gera quizzes substantivos a partir do player-data ELEMENTARY.
 * 8 questões (lições normais) · 10 (module challenge) · 12 (final mission)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const playerDir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');
const outPath = path.join(__dirname, 'elementary-content/generated-quizzes.json');

function collectTeachable(player) {
  const items = [];

  for (const s of player.stepScreens?.learn ?? []) {
    if (s.type === 'phrase_examples') {
      for (const ex of s.examples ?? []) {
        items.push({ en: ex.en, pt: ex.pt, source: s.titleEn });
      }
    }
    if (s.type === 'review') {
      for (const ex of s.items ?? []) {
        items.push({ en: ex.en, pt: ex.pt, source: 'review' });
      }
    }
    if (s.type === 'mistake') {
      items.push({ en: s.rightEn, pt: s.explanationPt, source: 'mistake', wrong: s.wrongEn });
    }
    if (s.type === 'language_focus') {
      for (const it of s.items ?? []) {
        items.push({ en: it.naturalEn, pt: it.notePt, source: 'language_focus' });
      }
    }
    if (s.type === 'comparison') {
      items.push({ en: s.modelEn, pt: s.modelPt ?? s.left?.notePt, source: 'comparison' });
    }
  }

  for (const p of player.mission?.canDo ?? []) {
    items.push({ en: p, pt: player.goalPt, source: 'canDo' });
  }

  for (const pi of player.practiceInteractions ?? []) {
    const correct = (pi.options ?? []).find((o) => o.correct);
    if (correct) items.push({ en: correct.labelEn, pt: pi.promptPt, source: 'practice' });
  }

  return items;
}

function distractors(pool, correctEn) {
  return pool
    .filter((x) => x.en && x.en !== correctEn)
    .map((x) => x.en)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);
}

function buildQuestions(contentKey, player) {
  const isFinal = contentKey.includes('final-elementary-mission');
  const isChallenge = contentKey.includes('challenge') || isFinal;
  const target = isFinal ? 12 : isChallenge ? 10 : 8;

  const pool = collectTeachable(player);
  const seen = new Set();
  const questions = [];

  for (const item of pool) {
    if (!item.en || seen.has(item.en)) continue;
    const others = distractors(pool, item.en);
    if (others.length < 2) continue;

    const options = [item.en, ...others.slice(0, 2)];
    const sorted = [...options].sort((a, b) => a.localeCompare(b));
    const correctIndex = sorted.indexOf(item.en);

    const prompt =
      item.source === 'mistake'
        ? `Evite o erro comum — forma correta:`
        : item.pt && item.pt.length < 120
          ? item.pt.replace(/\?$/, '') + '?'
          : `Qual frase/expressão está correta nesta lição?`;

    questions.push({
      contentKey: `${contentKey}-q${String(questions.length + 1).padStart(2, '0')}`,
      sortOrder: questions.length,
      question: prompt,
      options: sorted,
      correctIndex,
    });
    seen.add(item.en);
    if (questions.length >= target) break;
  }

  if (questions.length < target) {
    for (const pi of player.practiceInteractions ?? []) {
      const correct = (pi.options ?? []).find((o) => o.correct);
      if (!correct || seen.has(correct.labelEn)) continue;
      const others = (pi.options ?? []).filter((o) => !o.correct).map((o) => o.labelEn);
      if (others.length < 2) continue;
      const options = [correct.labelEn, others[0], others[1]].sort((a, b) => a.localeCompare(b));
      questions.push({
        contentKey: `${contentKey}-q${String(questions.length + 1).padStart(2, '0')}`,
        sortOrder: questions.length,
        question: pi.promptPt,
        options,
        correctIndex: options.indexOf(correct.labelEn),
      });
      seen.add(correct.labelEn);
      if (questions.length >= target) break;
    }
  }

  if (questions.length < (isFinal ? 10 : isChallenge ? 8 : 6)) {
    throw new Error(`${contentKey}: only ${questions.length} quiz questions generated`);
  }

  return {
    passingScore: 70,
    maxAttempts: 5,
    questions,
  };
}

const manifestPath = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-elementary-v1.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('Manifest não encontrado — rode build-cup360-english-elementary-v1-manifest.mjs primeiro.');
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const quizzes = {};
for (const mod of manifest.modules) {
  for (const lesson of mod.lessons) {
    const playerPath = path.join(playerDir, `${lesson.contentKey}.json`);
    if (!fs.existsSync(playerPath)) {
      throw new Error(`Player ausente: ${lesson.contentKey}.json`);
    }
    const player = JSON.parse(fs.readFileSync(playerPath, 'utf8'));
    quizzes[lesson.contentKey] = buildQuestions(lesson.contentKey, player);
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(quizzes, null, 2)}\n`, 'utf8');
console.log(`Quizzes gerados: ${Object.keys(quizzes).length} lições → ${outPath}`);
