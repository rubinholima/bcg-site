/**
 * Atualiza quiz da Lição 3 para 8 questões substantivas (manifest v1.1.4).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.join(
  __dirname,
  '../src/desenvolvimento/content/manifests/cup360-english-start-v1.json',
);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.manifestVersion = '1.1.4';

const lesson = manifest.modules[0].lessons.find((l) => l.contentKey === 'start-m01-l03-im-from-brazil');
if (!lesson) throw new Error('Lição 3 não encontrada.');

lesson.estimatedMinutes = 12;
lesson.quiz = {
  passingScore: 70,
  maxAttempts: 5,
  questions: [
    {
      contentKey: 'start-m01-l03-q01',
      sortOrder: 0,
      question: 'Perguntar de onde alguém é:',
      options: ['Where are you from?', 'What do you do?', "Where do you live?"],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q02',
      sortOrder: 1,
      question: 'Dizer que mora em Boston:',
      options: ['I live in Boston.', "I'm from Boston.", 'I work in Boston.'],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q03',
      sortOrder: 2,
      question: 'Dizer nacionalidade brasileira:',
      options: ["I'm Brazilian.", "I'm Brazil.", "I'm from Brazilian."],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q04',
      sortOrder: 3,
      question: 'Resposta curta a "Do you live here?" (morando aqui):',
      options: ['Yes, I do.', 'Nice to meet you.', "I'm from here."],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q05',
      sortOrder: 4,
      question: 'Diferença correta entre from e live in:',
      options: [
        "I'm from Brazil = origem; I live in Boston = moradia atual",
        "I'm from Brazil = trabalho; I live in Boston = nome",
        'São a mesma pergunta',
      ],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q06',
      sortOrder: 5,
      question: 'Perguntar onde alguém mora:',
      options: ['Where do you live?', 'Where are you from?', "What's your name?"],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q07',
      sortOrder: 6,
      question: 'Modelo integrado — origem e moradia:',
      options: [
        "I'm from Brazil, but I live in Boston.",
        "I live from Brazil in Boston.",
        "I'm Boston from Brazil.",
      ],
      correctIndex: 0,
    },
    {
      contentKey: 'start-m01-l03-q08',
      sortOrder: 7,
      question: 'Forma natural (contração):',
      options: ["I'm from Brazil.", 'I am from Brazil always only.', 'I from Brazil.'],
      correctIndex: 0,
    },
  ],
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('Manifest v1.1.4 — quiz Lição 3 atualizado (8 questões).');
