/**
 * Atualiza quizzes do Módulo 1 — 8 questões (lições 1–4) + 10 (challenge L5).
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
manifest.manifestVersion = '2.1.0';

const m1 = manifest.modules.find((m) => m.contentKey === 'start-module-01-hello');
if (!m1) throw new Error('Módulo 1 não encontrado.');

const quizzes = {
  'start-m01-l01-hello': {
    passingScore: 70,
    maxAttempts: 5,
    questions: [
      { contentKey: 'start-m01-l01-q01', sortOrder: 0, question: '08:30 no escritório — cumprimento adequado:', options: ['Good morning!', 'Good evening!', 'Good night!'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q02', sortOrder: 1, question: 'Resposta natural a "How are you?"', options: ["I'm good, thank you.", 'My name is Carlos.', 'I live in Boston.'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q03', sortOrder: 2, question: 'Devolver a pergunta How are you?', options: ['And you?', 'Goodbye!', 'Good morning!'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q04', sortOrder: 3, question: '15:00 — cumprimento adequado:', options: ['Good afternoon!', 'Good morning!', 'See you later!'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q05', sortOrder: 4, question: 'Encerrar conversa no corredor:', options: ['See you later!', 'How are you?', 'Nice to meet you!'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q06', sortOrder: 5, question: 'Reencontro com colega conhecido:', options: ['Nice to see you!', 'Nice to meet you!', 'What is your name?'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q07', sortOrder: 6, question: 'Evitar como cumprimento de manhã:', options: ['Good night!', 'Hello!', 'Hi!'], correctIndex: 0 },
      { contentKey: 'start-m01-l01-q08', sortOrder: 7, question: 'Resposta informal positiva:', options: ["I'm great, thanks!", 'I am very well, thank you very much.', 'My name is Carlos.'], correctIndex: 0 },
    ],
  },
  'start-m01-l02-my-name-is': {
    passingScore: 70,
    maxAttempts: 5,
    questions: [
      { contentKey: 'start-m01-l02-q01', sortOrder: 0, question: 'Forma comum de dizer seu nome:', options: ["I'm Carlos.", 'I live Carlos.', 'I work Carlos.'], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q02', sortOrder: 1, question: 'Perguntar o nome de alguém:', options: ["What's your name?", 'How are you?', 'Where are you from?'], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q03', sortOrder: 2, question: 'Resposta a "Nice to meet you!"', options: ['Nice to meet you too.', 'Good morning!', 'I am fine.'], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q04', sortOrder: 3, question: 'Apresentar terceira pessoa:', options: ['This is Jamie.', "What's your name?", "I'm from Brazil."], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q05', sortOrder: 4, question: 'Perguntar quem é alguém desconhecido:', options: ['Who is this?', 'What do you do?', 'And you?'], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q06', sortOrder: 5, question: 'Contração natural:', options: ["I'm Ana.", 'I am Ana always.', 'I Ana.'], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q07', sortOrder: 6, question: 'Primeiro encontro — NÃO use:', options: ['Nice to see you!', 'Nice to meet you!', 'My name is...'], correctIndex: 0 },
      { contentKey: 'start-m01-l02-q08', sortOrder: 7, question: 'Forma clara e completa do nome:', options: ['My name is Carlos.', 'My name Carlos.', 'Name is Carlos my.'], correctIndex: 0 },
    ],
  },
  'start-m01-l03-im-from-brazil': {
    passingScore: 70,
    maxAttempts: 5,
    questions: [
      { contentKey: 'start-m01-l03-q01', sortOrder: 0, question: 'Perguntar de onde alguém é:', options: ['Where are you from?', 'What do you do?', "Where do you live?"], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q02', sortOrder: 1, question: 'Dizer que mora em Boston:', options: ['I live in Boston.', "I'm from Boston.", 'I work in Boston.'], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q03', sortOrder: 2, question: 'Dizer nacionalidade brasileira:', options: ["I'm Brazilian.", "I'm Brazil.", "I'm from Brazilian."], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q04', sortOrder: 3, question: 'Resposta curta a "Do you live here?" (morando aqui):', options: ['Yes, I do.', 'Nice to meet you.', "I'm Alex."], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q05', sortOrder: 4, question: 'Diferença correta between from e live in:', options: ["I'm from Brazil = origem; I live in Boston = moradia atual", "I'm from Brazil = trabalho; I live in Boston = nome", 'São a mesma pergunta'], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q06', sortOrder: 5, question: 'Perguntar onde alguém mora:', options: ['Where do you live?', 'Where are you from?', "What's your name?"], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q07', sortOrder: 6, question: 'Modelo integrado origem + moradia:', options: ["I'm from Brazil, but I live in Boston.", "I live from Brazil in Boston.", "I'm Boston from Brazil."], correctIndex: 0 },
      { contentKey: 'start-m01-l03-q08', sortOrder: 7, question: 'Forma natural com contração:', options: ["I'm from Brazil.", 'I am from Brazil only formal.', 'I from Brazil.'], correctIndex: 0 },
    ],
  },
  'start-m01-l04-what-do-you-do': {
    passingScore: 70,
    maxAttempts: 5,
    questions: [
      { contentKey: 'start-m01-l04-q01', sortOrder: 0, question: 'Perguntar profissão/função:', options: ['What do you do?', 'Where do you live?', 'Who is this?'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q02', sortOrder: 1, question: 'Trabalhar para uma organização:', options: ['I work for a company.', 'I live for a company.', 'I am from a company.'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q03', sortOrder: 2, question: 'Dizer área de atuação:', options: ['I work in marketing.', 'I work at marketing name.', 'I work marketing live.'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q04', sortOrder: 3, question: 'Dizer cargo/profissão:', options: ["I'm a developer.", 'I work for developer.', 'I live developer.'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q05', sortOrder: 4, question: 'Devolver pergunta sobre trabalho:', options: ['What about you?', 'Where are you from?', 'Nice to meet you.'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q06', sortOrder: 5, question: 'Perguntar local de trabalho:', options: ['Where do you work?', 'What do you do?', 'How are you?'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q07', sortOrder: 6, question: 'Responsabilidade no trabalho:', options: ["I'm responsible for logistics.", "I'm from logistics.", 'I live in logistics.'], correctIndex: 0 },
      { contentKey: 'start-m01-l04-q08', sortOrder: 7, question: 'Trabalhar em local específico:', options: ['I work at the stadium.', 'I work for the stadium name.', 'I am the stadium.'], correctIndex: 0 },
    ],
  },
  'start-m01-l05-first-conversation': {
    passingScore: 70,
    maxAttempts: 5,
    questions: [
      { contentKey: 'start-m01-l05-q01', sortOrder: 0, question: 'Abertura à tarde — cumprimento + How are you?', options: ['Good afternoon! How are you?', 'Good morning!', 'What do you do?'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q02', sortOrder: 1, question: 'Resposta natural a How are you?', options: ["I'm good, thank you. And you?", 'My name is Carlos.', 'I work in Boston.'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q03', sortOrder: 2, question: 'Após cumprimento — perguntar nome:', options: ["What's your name?", 'Where are you from?', 'See you later!'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q04', sortOrder: 3, question: 'Resposta a Nice to meet you!', options: ['Nice to meet you too.', 'Good morning!', 'I live in Boston.'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q05', sortOrder: 4, question: 'Dizer origem:', options: ["I'm from Brazil.", 'I live in Brazil.', 'I work Brazil.'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q06', sortOrder: 5, question: 'Dizer onde mora:', options: ['I live in Boston.', "I'm from Boston only origin.", 'I work at Boston.'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q07', sortOrder: 6, question: 'Perguntar sobre trabalho:', options: ['What do you do?', 'How are you?', 'Who is this?'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q08', sortOrder: 7, question: 'Responder sobre função:', options: ['I work in operations.', 'I from operations.', 'I live operations.'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q09', sortOrder: 8, question: 'Devolver pergunta de trabalho:', options: ['What about you?', 'Goodbye!', 'And you?'], correctIndex: 0 },
      { contentKey: 'start-m01-l05-q10', sortOrder: 9, question: 'Encerrar conversa naturalmente:', options: ['See you later!', "What's your name?", 'Good morning!'], correctIndex: 0 },
    ],
  },
};

const minutes = {
  'start-m01-l01-hello': 12,
  'start-m01-l02-my-name-is': 12,
  'start-m01-l03-im-from-brazil': 12,
  'start-m01-l04-what-do-you-do': 12,
  'start-m01-l05-first-conversation': 18,
};

for (const lesson of m1.lessons) {
  const quiz = quizzes[lesson.contentKey];
  if (quiz) lesson.quiz = quiz;
  if (minutes[lesson.contentKey]) lesson.estimatedMinutes = minutes[lesson.contentKey];
  if (lesson.contentKey === 'start-m01-l05-first-conversation' && lesson.live?.curriculum) {
    lesson.live.curriculum.lessonKind = 'challenge';
    lesson.live.curriculum.estimatedMinutes = 18;
  }
}

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log('Manifest v2.1.0 — quizzes M1 atualizados (L1–L4: 8q, L5: 10q).');
