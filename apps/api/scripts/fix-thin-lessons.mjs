import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '../src/desenvolvimento/content/manifests/player-data');

function load(key) {
  return JSON.parse(fs.readFileSync(path.join(dir, `${key}.json`), 'utf8'));
}
function save(key, data) {
  fs.writeFileSync(path.join(dir, `${key}.json`), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

// M7 challenge — expand learn + context
{
  const p = load('start-m07-l07-food-shopping-challenge');
  p.stepScreens.context.push(
    {
      id: 'l07-ctx-06',
      type: 'dialogue_choice',
      speaker: 'Clerk',
      promptEn: 'Anything else?',
      promptPt: 'Passo 4 — finalizar compra.',
      options: [
        { labelEn: 'Two bottles of water, please. That\'s all.', correct: true, feedbackPt: 'Quantidade + encerramento.' },
        { labelEn: 'I have a reservation.', correct: false, feedbackPt: 'Hotel — M8.' },
        { labelEn: 'What time is it?', correct: false, feedbackPt: 'Horário — M3.' },
      ],
    },
    {
      id: 'l07-ctx-07',
      type: 'dialogue_choice',
      speaker: 'You',
      promptEn: 'Thank you! Have a good day.',
      promptPt: 'Passo 5 — despedida educada na loja.',
      options: [
        { labelEn: 'You too! See you later!', correct: true, feedbackPt: 'Despedida natural.' },
        { labelEn: 'Can I have the menu?', correct: false, feedbackPt: 'Restaurante — já terminou.' },
        { labelEn: 'Where is gate B12?', correct: false, feedbackPt: 'Aeroporto — M8.' },
      ],
    },
    {
      id: 'l07-ctx-08',
      type: 'scenario',
      settingEn: 'Challenge complete · Real life',
      scenarioPt: 'Você completou restaurante + loja usando só o Módulo 7. Pronto para a missão final.',
    },
  );
  p.stepScreens.learn.push(
    {
      id: 'l07-learn-04',
      type: 'comparison',
      titleEn: 'Like vs Would like',
      titlePt: 'Like vs Would like',
      left: { labelEn: 'I like coffee.', exampleEn: 'I like coffee.', notePt: 'preferência geral' },
      right: { labelEn: "I'd like a coffee.", exampleEn: "I'd like a coffee, please.", notePt: 'pedido agora' },
      modelEn: "I'd like the chicken, please.",
      modelPt: 'No restaurante, peça com would like.',
    },
    {
      id: 'l07-learn-05',
      type: 'phrase_examples',
      titleEn: 'Prices & payment',
      titlePt: 'Preços e pagamento',
      introPt: 'Frases úteis na loja e no restaurante.',
      examples: [
        { en: "It's ten dollars.", pt: 'preço' },
        { en: 'Do you take cards?', pt: 'pagamento' },
        { en: "That's all, thank you.", pt: 'encerrar' },
        { en: 'Can I have a receipt?', pt: 'recibo' },
      ],
    },
    {
      id: 'l07-learn-06',
      type: 'review',
      titleEn: 'Challenge checklist',
      titlePt: 'Checklist do desafio',
      items: [
        { en: "I'd like..., please.", pt: 'pedido' },
        { en: 'Can I have the check?', pt: 'conta' },
        { en: 'How much is it?', pt: 'preço' },
        { en: "I'm looking for...", pt: 'procurar' },
        { en: 'Two bottles of water.', pt: 'quantidade' },
        { en: "I'll take it.", pt: 'comprar' },
      ],
    },
  );
  save('start-m07-l07-food-shopping-challenge', p);
}

// M8 challenge
{
  const p = load('start-m08-l07-travel-challenge');
  p.stepScreens.context.push(
    {
      id: 'l08-ctx-06',
      type: 'dialogue_choice',
      speaker: 'Agent',
      promptEn: 'Boarding pass, please.',
      promptPt: 'Passo 4 — aeroporto.',
      options: [
        { labelEn: "Here's my boarding pass.", correct: true, feedbackPt: 'Entrega do cartão de embarque.' },
        { labelEn: 'I have a reservation under Silva.', correct: false, feedbackPt: 'Hotel — contexto errado.' },
        { labelEn: "I'd like a coffee.", correct: false, feedbackPt: 'Restaurante — M7.' },
      ],
    },
    {
      id: 'l08-ctx-07',
      type: 'dialogue_choice',
      speaker: 'You',
      promptEn: 'Excuse me, where is the subway station?',
      promptPt: 'Passo 5 — pedir direção na cidade.',
      options: [
        { labelEn: 'Excuse me, where is the subway station?', correct: true, feedbackPt: 'Pergunta de localização educada.' },
        { labelEn: 'How much is the subway?', correct: false, feedbackPt: 'Preço — M7.' },
        { labelEn: 'What do you do?', correct: false, feedbackPt: 'Trabalho — M1.' },
      ],
    },
    {
      id: 'l08-ctx-08',
      type: 'scenario',
      settingEn: 'Travel day complete',
      scenarioPt: 'Aeroporto → hotel → direções → reserva. Fluxo completo do Módulo 8.',
    },
  );
  p.stepScreens.learn.push(
    {
      id: 'l08-learn-03',
      type: 'phrase_examples',
      titleEn: 'Airport essentials',
      titlePt: 'Essencial no aeroporto',
      introPt: 'Frases fixas — memorize o fluxo.',
      examples: [
        { en: "Here's my boarding pass.", pt: 'embarque' },
        { en: 'Where is gate B12?', pt: 'portão' },
        { en: 'Is the flight on time?', pt: 'horário do voo' },
        { en: 'Where is security?', pt: 'segurança' },
      ],
    },
    {
      id: 'l08-learn-04',
      type: 'phrase_examples',
      titleEn: 'Hotel & reservation',
      titlePt: 'Hotel e reserva',
      examples: [
        { en: 'I have a reservation under Silva.', pt: 'check-in' },
        { en: 'What time is checkout?', pt: 'saída' },
        { en: 'Party of two at 7 PM.', pt: 'restaurante' },
        { en: 'Could I have a late checkout?', pt: 'pedido extra' },
      ],
    },
    {
      id: 'l08-learn-05',
      type: 'comparison',
      titleEn: 'Where is vs How do I get to',
      titlePt: 'Where is vs How do I get to',
      left: { labelEn: 'Where is the hotel?', exampleEn: 'Where is the hotel?', notePt: 'localização fixa' },
      right: { labelEn: 'How do I get to downtown?', exampleEn: 'How do I get to downtown?', notePt: 'rota / caminho' },
      modelEn: 'Go straight two blocks, then turn right.',
      modelPt: 'Depois de where/how, espere direções passo a passo.',
    },
    {
      id: 'l08-learn-06',
      type: 'review',
      titleEn: 'Challenge checklist',
      titlePt: 'Checklist do desafio',
      items: [
        { en: 'Where is the...?', pt: 'localizar' },
        { en: 'Go straight / Turn left', pt: 'direções' },
        { en: 'Take the subway.', pt: 'transporte' },
        { en: 'Check-in, please.', pt: 'hotel' },
        { en: "Here's my boarding pass.", pt: 'aeroporto' },
        { en: 'Reservation under Silva.', pt: 'reserva' },
      ],
    },
  );
  save('start-m08-l07-travel-challenge', p);
}

// M10 consolidation lessons — add learn review blocks
const m10Extra = {
  'start-m10-l01-meeting-someone': [
    {
      id: 'm10l01-learn-05',
      type: 'phrase_examples',
      titleEn: 'Greeting + name flow',
      titlePt: 'Fluxo cumprimento + nome',
      examples: [
        { en: 'Hi! Good afternoon!', pt: 'abertura' },
        { en: "I'm Carlos. / My name is Carlos.", pt: 'nome' },
        { en: "What's your name?", pt: 'perguntar nome' },
        { en: 'Nice to meet you too!', pt: 'resposta' },
      ],
    },
    {
      id: 'm10l01-learn-06',
      type: 'language_focus',
      titleEn: 'Meet vs See',
      titlePt: 'Meet vs See',
      items: [
        { formalEn: 'Nice to meet you!', naturalEn: 'Nice to meet you!', notePt: 'primeiro encontro' },
        { formalEn: 'Nice to see you!', naturalEn: 'Nice to see you!', notePt: 'reencontro' },
      ],
      tipPt: 'Módulo 1 — escolha meet ou see conforme o contexto.',
    },
  ],
  'start-m10-l02-my-life': [
    {
      id: 'm10l02-learn-06',
      type: 'phrase_examples',
      titleEn: 'My life block',
      titlePt: 'Bloco my life',
      examples: [
        { en: "I'm from Brazil. I live in Boston.", pt: 'origem + moradia' },
        { en: "I'm 32 years old.", pt: 'idade' },
        { en: 'I usually wake up at 6.', pt: 'rotina' },
        { en: 'This is my brother.', pt: 'família' },
      ],
    },
  ],
  'start-m10-l03-at-work': [
    {
      id: 'm10l03-learn-06',
      type: 'phrase_examples',
      titleEn: 'At work block',
      titlePt: 'Bloco no trabalho',
      examples: [
        { en: 'Can you help me with this?', pt: 'ajuda' },
        { en: 'Could you send me the file?', pt: 'pedido' },
        { en: "Please don't forget the meeting.", pt: 'instrução' },
        { en: "Let's start. Any questions?", pt: 'reunião' },
      ],
    },
  ],
  'start-m10-l04-restaurant-shopping': [
    {
      id: 'm10l04-learn-06',
      type: 'phrase_examples',
      titleEn: 'Food & shopping block',
      titlePt: 'Bloco comida e compras',
      examples: [
        { en: "I'd like the chicken, please.", pt: 'pedido' },
        { en: 'Can I have the check?', pt: 'conta' },
        { en: 'How much is it?', pt: 'preço' },
        { en: "I'm looking for a blue shirt.", pt: 'loja' },
      ],
    },
  ],
  'start-m10-l05-travel-situation': [
    {
      id: 'm10l05-learn-06',
      type: 'phrase_examples',
      titleEn: 'Travel block',
      titlePt: 'Bloco viagem',
      examples: [
        { en: 'I have a reservation under Silva.', pt: 'hotel' },
        { en: 'Where is the subway?', pt: 'localizar' },
        { en: 'Go straight, then turn left.', pt: 'direção' },
        { en: "Here's my boarding pass.", pt: 'aeroporto' },
      ],
    },
  ],
};

for (const [key, screens] of Object.entries(m10Extra)) {
  const p = load(key);
  p.stepScreens.learn.push(...screens);
  save(key, p);
}

console.log('Lições finas corrigidas: M7 challenge, M8 challenge, M10 L01-L05');
