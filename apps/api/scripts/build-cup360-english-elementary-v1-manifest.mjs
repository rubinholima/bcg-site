/**
 * Gera manifest skeleton cup360-english-elementary-v1 a partir do curriculum.
 * Rodar antes de patch-elementary-course.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COURSE, MODULES } from './elementary-content/curriculum.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, '../src/desenvolvimento/content/manifests/cup360-english-elementary-v1.json');
const playerDir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');

const goal = (text) =>
  `<p class="mb-4 rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-sm"><strong>Objetivo:</strong> ${text}</p>`;

function lessonHtml(title, goalPt, kind) {
  const challenge = kind === 'challenge';
  return [
    goal(goalPt ?? title),
    `<section class="mb-6"><h3 class="text-base font-semibold mb-2">LIVE — Player v2</h3><p>Esta lição usa o Player v2 ELEMENTARY: Contexto → Aprenda → Leia e Repita → Pratique → Verifique → Missão.</p>${challenge ? '<p class="text-sm text-muted-foreground mt-2"><strong>Module Challenge</strong> — consolida o módulo.</p>' : ''}</section>`,
  ].join('');
}

const manifest = {
  manifestId: COURSE.manifestId,
  manifestVersion: COURSE.manifestVersion,
  course: {
    contentKey: COURSE.contentKey,
    title: COURSE.title,
    subtitle: COURSE.subtitle,
    description: COURSE.description,
    category: COURSE.category,
    status: COURSE.status,
    tenantId: null,
    methodology: 'LIVE',
  },
  modules: MODULES.map((mod) => ({
    contentKey: mod.contentKey,
    title: mod.title,
    sortOrder: mod.sortOrder,
    lessons: mod.lessons.map((l, li) => {
      const playerPath = path.join(playerDir, `${l.contentKey}.json`);
      let goalPt = l.title;
      if (fs.existsSync(playerPath)) {
        const player = JSON.parse(fs.readFileSync(playerPath, 'utf8'));
        goalPt = player.goalPt ?? goalPt;
      }
      const isChallenge = l.kind === 'challenge';
      const isFinal = l.contentKey.includes('final-elementary-mission');
      const minutes = isFinal ? 22 : isChallenge ? 18 : 14;
      return {
        contentKey: l.contentKey,
        title: l.title,
        sortOrder: li,
        lessonType: 'TEXT',
        estimatedMinutes: minutes,
        contentHtml: lessonHtml(l.title, goalPt, l.kind),
        live: {
          realLifeContext: goalPt,
          learn: '',
          imitate: 'Leia e repita — Player v2.',
          buildPractice: 'Prática guiada Player v2.',
          verify: 'Quiz — conteúdo já ensinado (70%).',
          executeMission: goalPt,
          curriculum: {
            lessonKind: l.kind,
            objectivePt: goalPt,
            estimatedMinutes: minutes,
          },
        },
      };
    }),
  })),
};

fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
const totalLessons = manifest.modules.reduce((n, m) => n + m.lessons.length, 0);
console.log(`Manifest escrito: ${out}`);
console.log(`Módulos: ${manifest.modules.length} · Lições: ${totalLessons}`);
