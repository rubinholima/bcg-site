/**
 * Generate Elementary M1 & M2 Player v2 JSON files.
 * Run: node apps/api/scripts/elementary-content/generate-m01-m02.mjs
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPlayer, opt } from './build-lesson.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../../src/desenvolvimento/content/manifests/player-data');

function pr(type, promptPt, extra = {}) {
  return { type, promptPt, ...extra };
}

const LESSONS = [
  // ─── MODULE 1 ─────────────────────────────────────────────────────────────
  {
    contentKey: 'elem-m01-l01-beyond-start',
    moduleNumber: 1,
    goalPt: 'Ir além do START — falar de estado civil, moradia atual e trabalho com frases mais completas e naturais.',
    intro: {
      titleEn: 'Beyond START — personal details',
      titlePt: 'Além do START — detalhes pessoais',
      bodyPt: 'Você já sabe nome, origem e profissão básica. Agora a conversa aprofunda: casado ou solteiro? Onde mora hoje? Onde trabalha agora? Frases mais longas, mais inglês, menos tradução do português.',
    },
    scenario: {
      settingEn: 'Office lounge · After-work mixer',
      scenarioPt: 'Alex encontra você num happy hour da empresa. A conversa sai do básico e entra em detalhes pessoais — estado civil, moradia e trabalho atual.',
    },
    ctxChoices: [
      {
        speaker: 'Alex',
        promptEn: "So, are you married or single?",
        promptPt: 'Alex pergunta estado civil — comum em conversa informal nos EUA.',
        options: [
          opt("I'm single.", true, "Resposta direta e natural."),
          opt("I am single person.", false, "Redundante — single já basta."),
          opt("I have single.", false, "Tradução literal — use BE (I'm single)."),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "Where do you live now?",
        promptPt: 'Alex quer saber onde você mora atualmente — now enfatiza o presente.',
        options: [
          opt("I live in Boston now.", true, "Now = situação atual — natural."),
          opt("I live in Boston yesterday.", false, "Yesterday é passado — moradia é presente."),
          opt("I am live in Boston.", false, "Live é verbo — não use am antes de live."),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "And where do you work now?",
        promptPt: 'Alex conecta moradia e trabalho — pergunta sobre emprego atual.',
        options: [
          opt("I work at the club's office downtown.", true, "At + local — resposta completa."),
          opt("I work in the club office downtown.", false, "In funciona para departamento; aqui at + local físico é mais natural."),
          opt("I am work at downtown.", false, "Gramaticalmente incorreto — I work, não I am work."),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "Nice! I'm married, actually. Two kids.",
        promptPt: 'Alex compartilha sobre si. Como devolver interesse?',
        options: [
          opt("Oh, really? Tell me more.", true, "Follow-up natural — mostra interesse."),
          opt("Where do you live now?", false, "Muda de assunto abruptamente."),
          opt("I am single.", false, "Só repete sobre você — não reage ao que Alex disse."),
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Marital status',
        titlePt: 'Estado civil',
        introPt: 'Perguntas e respostas comuns — married, single, divorced. Use BE (I\'m), não have.',
        examples: [
          { en: "Are you married or single?", pt: 'pergunta direta' },
          { en: "I'm single.", pt: 'solteiro(a)' },
          { en: "I'm married.", pt: 'casado(a)' },
          { en: "I'm divorced.", pt: 'divorciado(a)' },
        ],
      },
      {
        titleEn: 'Where do you live / work now?',
        titlePt: 'Onde mora / trabalha agora?',
        introPt: 'Now marca a situação atual — diferente de where are you from (origem).',
        examples: [
          { en: 'Where do you live now?', pt: 'moradia atual' },
          { en: 'I live in Miami now.', pt: 'moro em Miami' },
          { en: 'Where do you work now?', pt: 'emprego atual' },
          { en: "I work at the training center.", pt: 'trabalho no centro' },
        ],
      },
      {
        titleEn: 'at vs in (work)',
        titlePt: 'at vs in (trabalho)',
        introPt: 'At = empresa/local específico. In = departamento ou área dentro de organização.',
        examples: [
          { en: "I work at Google.", pt: 'empresa' },
          { en: 'I work in marketing.', pt: 'departamento' },
          { en: "I work at the club's office.", pt: 'local físico' },
          { en: 'I work in operations.', pt: 'área' },
        ],
      },
    ],
    languageFocus: {
      titleEn: 'Now vs from',
      titlePt: 'Now vs from — presente vs origem',
      items: [
        { formalEn: 'Where are you from? → Brazil.', naturalEn: 'Where do you live now? → I live in Boston now.', notePt: 'From = origem. Live now = moradia atual.' },
        { formalEn: 'What do you do? → I am engineer.', naturalEn: 'Where do you work now? → I work at the club office.', notePt: 'Profissão vs local de trabalho — perguntas diferentes.' },
      ],
      tipPt: 'Em conversas mais longas, alterne origem (from) com situação atual (now).',
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I have single. / I am work at the office.',
      rightEn: "I'm single. / I work at the office.",
      explanationPt: "Estado civil usa BE: I'm single, I'm married — não I have single. Trabalho usa verbo simples: I work — não I am work.",
    },
    vocabulary: {
      titleEn: 'Personal detail words',
      titlePt: 'Vocabulário — detalhes pessoais',
      words: [
        { en: 'single', pt: 'solteiro(a)', exampleEn: "I'm single." },
        { en: 'married', pt: 'casado(a)', exampleEn: "I'm married with two kids." },
        { en: 'downtown', pt: 'centro da cidade', exampleEn: 'I work downtown.' },
        { en: 'actually', pt: 'na verdade', exampleEn: "I'm married, actually." },
      ],
    },
    review: [
      { en: "I'm single.", pt: 'estado civil' },
      { en: 'Where do you live now?', pt: 'moradia atual' },
      { en: 'I live in Boston now.', pt: 'resposta moradia' },
      { en: 'Where do you work now?', pt: 'trabalho atual' },
      { en: "I work at the club's office.", pt: 'resposta trabalho' },
    ],
    readRepeat: {
      phrases: [
        "Are you married or single?",
        "I'm single.",
        "Where do you live now?",
        "I live in Boston now.",
        "Where do you work now?",
        "I work at the club's office downtown.",
        "Oh, really? Tell me more.",
        "I'm married, actually. Two kids.",
      ],
      dialogueEn: "Are you married or single? — I'm single. — Where do you live now? — I live in Boston now. — Where do you work now? — I work at the club's office downtown. — Nice! I'm married, actually. Two kids. — Oh, really? Tell me more.",
    },
    mission: {
      headlineEn: 'You can share personal details beyond START.',
      headlinePt: 'Você consegue compartilhar detalhes pessoais além do START.',
      canDo: ["I'm single.", 'Where do you live now?', 'I work at...', 'Tell me more.'],
      production: {
        introPt: 'Alex quer te conhecer melhor. Responda sobre estado civil, moradia e trabalho — frases completas em inglês.',
        prompts: [
          { speaker: 'Alex', questionEn: 'Are you married or single?' },
          { speaker: 'Alex', questionEn: 'Where do you live now?' },
          { speaker: 'Alex', questionEn: 'Where do you work now?' },
        ],
        fields: [
          { id: 'status', labelPt: 'Estado civil', prefixEn: "I'm", placeholderEn: 'single.' },
          { id: 'live', labelPt: 'Onde mora', prefixEn: 'I live in', placeholderEn: 'Boston now.' },
          { id: 'work', labelPt: 'Onde trabalha', prefixEn: 'I work at', placeholderEn: "the club's office downtown." },
          { id: 'followUp', labelPt: 'Reagir ao que Alex disse', prefixEn: '', placeholderEn: 'Oh, really? Tell me more.' },
        ],
        exampleEn: "I'm single. I live in Boston now. I work at the club's office downtown. Oh, really? Tell me more.",
      },
    },
    practice: [
      pr('choice', 'Alex: Are you married or single?', { options: [opt("I'm single.", true, 'BE + adjetivo.'), opt('I have single.', false, 'Use I\'m, não have.'), opt('I am single person.', false, 'Redundante.')] }),
      pr('fill_blank', 'Complete: moradia atual', { templateEn: 'I live ___ Boston now.', blankLabel: 'preposição', options: [opt('in', true, 'Live in + cidade.'), opt('at', false, 'At é para lugares específicos, não cidade inteira.'), opt('on', false, 'On não combina com cidade.')] }),
      pr('reorder', 'Monte: onde trabalha', { tokens: ['downtown.', 'work', 'I', "at the club's office"], correctOrder: ['I', 'work', "at the club's office", 'downtown.'], feedbackCorrectPt: "I work at the club's office downtown.", feedbackWrongPt: 'I + work + at + local.' }),
      pr('dialogue_complete', 'Alex: Where do you live now?', { speaker: 'You', contextEn: 'Alex: Where do you live now?', options: [opt('I live in Miami now.', true, 'Now = situação atual.'), opt('I am from Miami.', false, 'From = origem, não moradia atual.'), opt('I live in Miami yesterday.', false, 'Yesterday é passado.')] }),
      pr('choice', 'Qual pergunta é sobre trabalho ATUAL?', { options: [opt('Where do you work now?', true, 'Work now = emprego atual.'), opt('Where are you from?', false, 'Origem/nacionalidade.'), opt('What is your name?', false, 'Nome.')] }),
      pr('fill_blank', 'Estado civil — use BE:', { templateEn: 'I ___ married.', blankLabel: 'verbo', options: [opt("'m", true, "I'm married."), opt('have', false, 'I have married está errado.'), opt('do', false, 'Do não combina.')] }),
      pr('dialogue_complete', 'Alex compartilha: I\'m married. Two kids.', { speaker: 'You', contextEn: "Alex: I'm married, actually. Two kids.", options: [opt('Oh, really? Tell me more.', true, 'Follow-up natural.'), opt("I'm single.", false, 'Ignora o que Alex disse.'), opt('Where do you work now?', false, 'Muda de assunto.')] }),
      pr('choice', 'Melhor resposta sobre trabalho:', { options: [opt("I work in marketing.", true, 'In + departamento.'), opt('I am work in marketing.', false, 'I work, não I am work.'), opt('I work at marketing.', false, 'At marketing soa estranho — use in marketing.')] }),
      pr('reorder', 'Monte pergunta moradia:', { tokens: ['now?', 'live', 'you', 'do', 'Where'], correctOrder: ['Where', 'do', 'you', 'live', 'now?'], feedbackCorrectPt: 'Where do you live now?', feedbackWrongPt: 'Where + do + you + live + now?' }),
      pr('fill_blank', 'Trabalho — preposição departamento:', { templateEn: 'She works ___ HR.', blankLabel: 'preposição', options: [opt('in', true, 'In + departamento.'), opt('at', false, 'At HR é menos natural que in HR.'), opt('on', false, 'On não combina.')] }),
    ],
  },

  {
    contentKey: 'elem-m01-l02-follow-up-questions',
    moduleNumber: 1,
    goalPt: 'Manter a conversa viva com follow-ups: Really? How long? Tell me more. What about you?',
    intro: {
      titleEn: 'Follow-up questions',
      titlePt: 'Perguntas de follow-up',
      bodyPt: 'Conversas reais não são só pergunta-resposta — você reage, aprofunda e devolve. Aprenda frases curtas que mantêm o diálogo fluindo naturalmente.',
    },
    scenario: {
      settingEn: 'Coffee shop · Weekend chat',
      scenarioPt: 'Alex conta que mora em Boston há três anos. Você aprende a reagir, aprofundar e devolver a pergunta.',
    },
    ctxChoices: [
      {
        speaker: 'Alex',
        promptEn: "I've lived in Boston for three years.",
        promptPt: 'Alex compartilha algo. Como reagir antes de fazer outra pergunta?',
        options: [
          opt('Really? How long have you been here?', true, 'Really? mostra interesse + How long aprofunda.'),
          opt('What is your name?', false, 'Vocês já se conhecem — fora de contexto.'),
          opt('I live in Boston.', false, 'Não reage ao que Alex disse.'),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "About three years. I moved from Chicago.",
        promptPt: 'Alex responde. Como pedir mais detalhes?',
        options: [
          opt('Tell me more.', true, 'Convite aberto — Alex pode elaborar.'),
          opt('Goodbye.', false, 'Encerra a conversa.'),
          opt('How old are you?', false, 'Muda de assunto sem transição.'),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "Well, I got a job offer and my wife wanted a change.",
        promptPt: 'Alex elaborou. Como devolver a conversa para você?',
        options: [
          opt('What about you? Where do you live?', true, 'What about you? devolve naturalmente.'),
          opt('Tell me more.', false, 'Repetir Tell me more após resposta longa soa estranho.'),
          opt('I am fine.', false, 'Não devolve a pergunta.'),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "That's interesting! And you?",
        promptPt: 'Alex devolve. Como responder sobre sua situação?',
        options: [
          opt("I've been here for about a year.", true, 'Resposta natural com tempo.'),
          opt('Really? How long?', false, 'Isso seria pergunta, não resposta.'),
          opt('Tell me more.', false, 'Alex acabou de perguntar sobre você.'),
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Really?',
        titlePt: 'Really?',
        introPt: 'Reação curta de interesse ou surpresa — abre espaço para mais informação.',
        examples: [
          { en: 'Really?', pt: 'Sério? / É mesmo?' },
          { en: 'Oh, really? That\'s cool.', pt: 'com entusiasmo' },
          { en: 'Really? I didn\'t know that.', pt: 'surpresa' },
          { en: 'Really? How come?', pt: 'aprofundar motivo' },
        ],
      },
      {
        titleEn: 'How long?',
        titlePt: 'Há quanto tempo?',
        introPt: 'Pergunta duração — How long + present perfect ou simple present.',
        examples: [
          { en: 'How long have you been here?', pt: 'há quanto tempo está aqui' },
          { en: 'How long have you worked here?', pt: 'há quanto trabalha aqui' },
          { en: "I've been here for two years.", pt: 'resposta com for' },
          { en: 'About three years.', pt: 'resposta curta' },
        ],
      },
      {
        titleEn: 'Tell me more / What about you?',
        titlePt: 'Conte mais / E você?',
        introPt: 'Tell me more convida elaboração. What about you? devolve a pergunta.',
        examples: [
          { en: 'Tell me more.', pt: 'conte mais' },
          { en: 'That sounds interesting. Tell me more.', pt: 'com reação' },
          { en: 'What about you?', pt: 'e você?' },
          { en: 'And you? What do you think?', pt: 'variante' },
        ],
      },
    ],
    languageFocus: {
      titleEn: 'Conversation flow',
      titlePt: 'Fluxo conversacional',
      items: [
        { formalEn: 'Answer only. Next question.', naturalEn: 'React → Ask follow-up → Share → Return question', notePt: 'Really? → How long? → Tell me more → What about you?' },
        { formalEn: 'How long you are here?', naturalEn: 'How long have you been here?', notePt: 'How long + present perfect para duração até agora.' },
      ],
      tipPt: 'Follow-ups curtos (Really?, And you?) soam mais naturais que perguntas longas demais.',
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'How long you live here? / Tell me more about it please now.',
      rightEn: 'How long have you lived here? / Tell me more.',
      explanationPt: 'Perguntas com how long precisam de auxiliar (have/has). Tell me more é curto e natural — não precisa de please now no final.',
    },
    review: [
      { en: 'Really?', pt: 'reação' },
      { en: 'How long have you been here?', pt: 'duração' },
      { en: 'Tell me more.', pt: 'aprofundar' },
      { en: 'What about you?', pt: 'devolver' },
      { en: "I've been here for a year.", pt: 'resposta tempo' },
    ],
    readRepeat: {
      phrases: [
        "I've lived in Boston for three years.",
        'Really? How long have you been here?',
        'About three years.',
        'Tell me more.',
        'Well, I got a job offer.',
        'What about you?',
        "I've been here for about a year.",
        "That's interesting!",
      ],
      dialogueEn: "I've lived in Boston for three years. — Really? How long have you been here? — About three years. I moved from Chicago. — Tell me more. — Well, I got a job offer. — What about you? — I've been here for about a year.",
    },
    mission: {
      headlineEn: 'You can keep a conversation going with follow-ups.',
      headlinePt: 'Você consegue manter a conversa com follow-ups.',
      canDo: ['Really?', 'How long?', 'Tell me more.', 'What about you?'],
      production: {
        introPt: 'Alex contou sobre a mudança para Boston. Reaja, aprofunde, peça mais detalhes e devolva a pergunta.',
        prompts: [{ speaker: 'Alex', questionEn: "I've lived in Boston for three years." }],
        fields: [
          { id: 'react', labelPt: 'Reação', prefixEn: '', placeholderEn: 'Really? How long have you been here?' },
          { id: 'more', labelPt: 'Pedir detalhes', prefixEn: '', placeholderEn: 'Tell me more.' },
          { id: 'return', labelPt: 'Devolver', prefixEn: '', placeholderEn: 'What about you?' },
          { id: 'answer', labelPt: 'Sua resposta', prefixEn: '', placeholderEn: "I've been here for about a year." },
        ],
        exampleEn: "Really? How long have you been here? — Tell me more. — What about you? — I've been here for about a year.",
      },
    },
    practice: [
      pr('choice', 'Alex: I moved from Chicago last year.', { options: [opt('Really? Tell me more.', true, 'Reação + follow-up.'), opt('What is Chicago?', false, 'Não é follow-up natural.'), opt('Goodbye.', false, 'Encerra conversa.')] }),
      pr('fill_blank', 'Complete follow-up duração:', { templateEn: 'How long ___ you been here?', blankLabel: 'auxiliar', options: [opt('have', true, 'Present perfect.'), opt('are', false, 'Are não combina com been.'), opt('do', false, 'Do não combina com been.')] }),
      pr('reorder', 'Monte: conte mais', { tokens: ['more.', 'me', 'Tell'], correctOrder: ['Tell', 'me', 'more.'], feedbackCorrectPt: 'Tell me more.', feedbackWrongPt: 'Tell + me + more.' }),
      pr('dialogue_complete', 'Devolver pergunta:', { speaker: 'You', contextEn: 'Alex told you about his job.', options: [opt('What about you?', true, 'Devolve naturalmente.'), opt('Tell me more.', false, 'Pedir mais após resposta curta ok, mas here Alex espera reciprocidade.'), opt('Really?', false, 'Só reação — falta devolver.')] }),
      pr('choice', 'Resposta sobre tempo:', { options: [opt("I've been here for two years.", true, 'For + período.'), opt('I am here two years.', false, 'Falta have been.'), opt('I have here two years.', false, 'Ordem incorreta.')] }),
      pr('fill_blank', 'Reação curta:', { templateEn: '___, that\'s interesting!', blankLabel: 'reação', options: [opt('Really', true, 'Really? ou Oh, really!'), opt('Very', false, 'Very that\'s interesting não funciona.'), opt('Much', false, 'Much não combina.')] }),
      pr('dialogue_complete', 'Alex deu detalhes longos — você:', { speaker: 'You', contextEn: 'Alex: Well, I got a job offer and my wife wanted a change.', options: [opt('What about you? Where do you live?', true, 'Devolve após ouvir.'), opt('Tell me more.', false, 'Alex já elaborou bastante.'), opt('How old are you?', false, 'Fora de contexto.')] }),
      pr('reorder', 'Monte pergunta duração:', { tokens: ['here?', 'long', 'been', 'you', 'have', 'How'], correctOrder: ['How', 'long', 'have', 'you', 'been', 'here?'], feedbackCorrectPt: 'How long have you been here?', feedbackWrongPt: 'How long + have + you + been + here?' }),
      pr('choice', 'Melhor sequência conversacional:', { options: [opt('Listen → React → Follow-up → Return', true, 'Fluxo natural.'), opt('Question → Question → Question', false, 'Sem reação soa interrogatório.'), opt('Answer only → Silence', false, 'Conversa morre.')] }),
      pr('fill_blank', 'Resposta curta tempo:', { templateEn: 'About ___ years.', blankLabel: 'número', options: [opt('three', true, 'About three years.'), opt('three of', false, 'About three of years incorreto.'), opt('the three', false, 'The three years soa estranho aqui.')] }),
    ],
  },

  {
    contentKey: 'elem-m01-l03-interests-hobbies',
    moduleNumber: 1,
    goalPt: 'Falar de interesses e hobbies com I\'m into..., I enjoy... e Do you like...? — conversa mais natural sobre gostos.',
    intro: {
      titleEn: 'Interests & hobbies',
      titlePt: 'Interesses e hobbies',
      bodyPt: 'Depois dos detalhes pessoais, a conversa vira gostos e tempo livre. Aprenda formas naturais para dizer o que você curte e perguntar sobre o outro — mais inglês, menos tradução do português.',
    },
    scenario: {
      settingEn: 'Team lunch · Casual conversation',
      scenarioPt: 'Alex quer saber o que você faz fora do trabalho. Vocês trocam interesses e hobbies de forma descontraída.',
    },
    ctxChoices: [
      {
        speaker: 'Alex',
        promptEn: 'So, what are you into these days?',
        promptPt: 'Alex pergunta seus interesses atuais — forma informal comum.',
        options: [
          opt("I'm into soccer and cooking.", true, "I'm into + atividade — natural e atual."),
          opt('I am into the soccer.', false, 'Sem the antes de esporte/hobby genérico.'),
          opt('I have interest in soccer.', false, 'Possível, mas menos natural que I\'m into.'),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: 'Do you like hiking?',
        promptPt: 'Alex pergunta sobre um hobby específico.',
        options: [
          opt('Yes, I enjoy hiking on weekends.', true, 'Enjoy + verbo-ing — resposta completa.'),
          opt('Yes, I like hike.', false, 'Like + verbo-ing ou to + verbo — não like hike.'),
          opt('Yes, I am like hiking.', false, 'I like, não I am like.'),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: "I'm really into photography lately.",
        promptPt: 'Alex compartilha hobby. Como mostrar interesse?',
        options: [
          opt('Oh, really? What kind of photos do you take?', true, 'Follow-up natural sobre o hobby dele.'),
          opt('I work downtown.', false, 'Muda de assunto — Alex falou de fotografia.'),
          opt('Do you like hiking?', false, 'Pergunta ok, mas não reage ao que Alex disse.'),
        ],
      },
      {
        speaker: 'Alex',
        promptEn: 'Mostly street photography. What about you?',
        promptPt: 'Alex devolve a pergunta. Como responder sobre seus hobbies?',
        options: [
          opt('I enjoy playing guitar in my free time.', true, 'Resposta completa com enjoy + -ing.'),
          opt('I enjoy play guitar.', false, 'Enjoy + playing, não play.'),
          opt('I am into the guitar play.', false, 'Ordem e forma incorretas.'),
        ],
      },
      {
        speaker: 'You',
        promptEn: 'Do you like sports?',
        promptPt: 'Sua vez de perguntar sobre gostos de Alex.',
        options: [
          opt('Do you like sports?', true, 'Do you like + substantivo — pergunta padrão.'),
          opt('You like sports?', false, 'Falta auxiliar Do em pergunta.'),
          opt('Are you like sports?', false, 'Are you like não existe assim.'),
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: "I'm into...",
        titlePt: 'Estou curtindo / gosto de...',
        introPt: "I'm into = interesse forte ou moda atual — mais informal que I like.",
        examples: [
          { en: "I'm into soccer.", pt: 'curto futebol' },
          { en: "I'm into true crime podcasts.", pt: 'interesse atual' },
          { en: "What are you into these days?", pt: 'pergunta informal' },
          { en: "I'm not really into that.", pt: 'não curto' },
        ],
      },
      {
        titleEn: 'I enjoy...',
        titlePt: 'Eu gosto / aprecio...',
        introPt: 'Enjoy + verbo-ing — atividade que você aprecia fazer.',
        examples: [
          { en: 'I enjoy cooking.', pt: 'gosto de cozinhar' },
          { en: 'I enjoy reading before bed.', pt: 'com detalhe' },
          { en: 'I enjoy playing guitar.', pt: 'hobby musical' },
          { en: 'Do you enjoy traveling?', pt: 'pergunta' },
        ],
      },
      {
        titleEn: 'Do you like...?',
        titlePt: 'Você gosta de...?',
        introPt: 'Pergunta simples e versátil — like + substantivo ou like + -ing.',
        examples: [
          { en: 'Do you like sports?', pt: 'esportes' },
          { en: 'Do you like cooking?', pt: 'cozinhar' },
          { en: 'Do you like watching movies?', pt: 'like + -ing' },
          { en: 'Yes, I love it.', pt: 'resposta entusiasta' },
        ],
      },
    ],
    languageFocus: {
      titleEn: 'into vs enjoy vs like',
      titlePt: 'into vs enjoy vs like',
      items: [
        { formalEn: 'I have interest in music.', naturalEn: "I'm into music. / I enjoy listening to music.", notePt: 'Into = moda/interesse forte. Enjoy = prazer na atividade.' },
        { formalEn: 'Do you like to hike?', naturalEn: 'Do you like hiking? / Do you enjoy hiking?', notePt: 'Like/enjoy + -ing é comum na fala americana.' },
      ],
      tipPt: "I'm into soa jovem e atual; I enjoy é um pouco mais reflexivo; Do you like...? é a pergunta mais neutra.",
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I like play soccer. / I am into the soccer.',
      rightEn: 'I like playing soccer. / I\'m into soccer.',
      explanationPt: 'Like e enjoy pedem -ing (playing) ou substantivo (soccer). Into vai direto com substantivo, sem the desnecessário.',
    },
    vocabulary: {
      titleEn: 'Hobby words',
      titlePt: 'Vocabulário — hobbies',
      words: [
        { en: 'hiking', pt: 'caminhada/trilha', exampleEn: 'I enjoy hiking on weekends.' },
        { en: 'photography', pt: 'fotografia', exampleEn: "I'm into photography." },
        { en: 'free time', pt: 'tempo livre', exampleEn: 'In my free time, I read.' },
        { en: 'lately', pt: 'ultimamente', exampleEn: "I'm into podcasts lately." },
      ],
    },
    review: [
      { en: "I'm into soccer.", pt: 'interesse' },
      { en: 'I enjoy cooking.', pt: 'prazer na atividade' },
      { en: 'Do you like sports?', pt: 'pergunta' },
      { en: 'I enjoy playing guitar.', pt: 'enjoy + -ing' },
      { en: 'What are you into these days?', pt: 'pergunta informal' },
    ],
    readRepeat: {
      phrases: [
        'What are you into these days?',
        "I'm into soccer and cooking.",
        'Do you like hiking?',
        'Yes, I enjoy hiking on weekends.',
        "I'm really into photography lately.",
        'Oh, really? What kind of photos do you take?',
        'Mostly street photography.',
        'I enjoy playing guitar in my free time.',
        'What about you?',
        'Do you like sports?',
      ],
      dialogueEn: "What are you into these days? — I'm into soccer and cooking. — Do you like hiking? — Yes, I enjoy hiking on weekends. — I'm really into photography lately. — Oh, really? What kind of photos do you take? — Mostly street photography. What about you? — I enjoy playing guitar in my free time.",
    },
    mission: {
      headlineEn: 'You can talk about interests and hobbies.',
      headlinePt: 'Você consegue falar de interesses e hobbies.',
      canDo: ["I'm into...", 'I enjoy...', 'Do you like...?', 'What about you?'],
      production: {
        introPt: 'Conte seus interesses, pergunte sobre Alex e responda quando ele devolver a pergunta.',
        prompts: [
          { speaker: 'Alex', questionEn: 'What are you into these days?' },
          { speaker: 'Alex', questionEn: 'Do you like hiking?' },
        ],
        fields: [
          { id: 'into', labelPt: 'Seus interesses', prefixEn: "I'm into", placeholderEn: 'soccer and cooking.' },
          { id: 'enjoy', labelPt: 'O que você aprecia fazer', prefixEn: 'I enjoy', placeholderEn: 'playing guitar in my free time.' },
          { id: 'ask', labelPt: 'Perguntar sobre Alex', prefixEn: '', placeholderEn: 'Do you like sports?' },
          { id: 'react', labelPt: 'Reagir ao hobby dele', prefixEn: '', placeholderEn: 'Oh, really? Tell me more.' },
        ],
        exampleEn: "I'm into soccer and cooking. I enjoy playing guitar. Do you like sports? Oh, really? Tell me more.",
      },
    },
    practice: [
      pr('choice', 'Melhor forma de dizer interesse atual:', { options: [opt("I'm into podcasts lately.", true, "I'm into + substantivo."), opt('I am into the podcasts.', false, 'Sem the desnecessário.'), opt('I have into podcasts.', false, 'Into não usa have.')] }),
      pr('fill_blank', 'Complete: prazer na atividade', { templateEn: 'I enjoy ___ on weekends.', blankLabel: 'verbo', options: [opt('hiking', true, 'Enjoy + hiking (substantivo/gerúndio).'), opt('to hike', false, 'Enjoy + -ing é mais comum que to.'), opt('hike', false, 'Enjoy hiking, não enjoy hike.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['sports?', 'like', 'you', 'Do'], correctOrder: ['Do', 'you', 'like', 'sports?'], feedbackCorrectPt: 'Do you like sports?', feedbackWrongPt: 'Do + you + like + substantivo?' }),
      pr('dialogue_complete', 'Alex: What are you into?', { speaker: 'You', contextEn: 'Alex: What are you into these days?', options: [opt("I'm into cooking and travel.", true, 'Resposta natural.'), opt('I like to cooking.', false, 'Like cooking ou like to cook.'), opt('I am interest cooking.', false, 'Forma incorreta.')] }),
      pr('choice', 'Qual frase está correta?', { options: [opt('I enjoy reading before bed.', true, 'Enjoy + -ing.'), opt('I enjoy read before bed.', false, 'Enjoy + reading.'), opt('I am enjoy reading.', false, 'I enjoy, não I am enjoy.')] }),
      pr('fill_blank', 'Resposta entusiasta:', { templateEn: 'Yes, I ___ it!', blankLabel: 'verbo', options: [opt('love', true, 'Love it = adoro.'), opt('am love', false, 'I love, não I am love.'), opt('liking', false, 'I like it, não I liking.')] }),
      pr('dialogue_complete', 'Alex: I\'m into photography.', { speaker: 'You', contextEn: "Alex: I'm really into photography lately.", options: [opt('Oh, really? What kind of photos do you take?', true, 'Follow-up natural.'), opt('I work at the office.', false, 'Fora de contexto.'), opt('Do you like the photography?', false, 'The photography soa estranho.')] }),
      pr('reorder', 'Monte resposta com enjoy:', { tokens: ['guitar.', 'playing', 'enjoy', 'I'], correctOrder: ['I', 'enjoy', 'playing', 'guitar.'], feedbackCorrectPt: 'I enjoy playing guitar.', feedbackWrongPt: 'I + enjoy + playing + objeto.' }),
      pr('choice', 'Pergunta correta sobre hobby:', { options: [opt('Do you enjoy traveling?', true, 'Do you + enjoy + -ing.'), opt('You enjoy traveling?', false, 'Falta Do.'), opt('Are you enjoy traveling?', false, 'Are + enjoy incorreto.')] }),
      pr('fill_blank', 'Negativa informal:', { templateEn: "I'm not really ___ that.", blankLabel: 'preposição', options: [opt('into', true, "Not into = não curto."), opt('enjoy', false, 'Not enjoy soa incompleto — use into ou enjoy that.'), opt('like to', false, 'Not like to that não funciona.')] }),
    ],
  },
];

// Remaining lessons (M1L4–M2L7)
LESSONS.push(
  {
    contentKey: 'elem-m01-l04-likes-dislikes',
    moduleNumber: 1,
    goalPt: 'Expressar intensidade de gosto — love, hate, don\'t mind — e concordar com Me too / Neither do I.',
    intro: {
      titleEn: 'Likes & dislikes',
      titlePt: 'Gostos e aversões',
      bodyPt: 'Nem todo gosto é igual — love, hate e don\'t mind mostram intensidade. Aprenda também a concordar naturalmente: Me too e Neither do I.',
    },
    scenario: {
      settingEn: 'Office kitchen · Lunch break',
      scenarioPt: 'Você e Alex comentam comida, clima e rotina do escritório — com opiniões fortes e concordâncias.',
    },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'Do you like the cafeteria food here?', promptPt: 'Alex pergunta opinião sobre comida.', options: [opt("Honestly, I don't mind it.", true, "Don't mind = tolerável, neutro."), opt("I don't minding it.", false, "Don't mind + base, não -ing."), opt('I am not mind it.', false, 'Forma incorreta.')] },
      { speaker: 'Alex', promptEn: 'I love the coffee here.', promptPt: 'Alex expressa gosto forte.', options: [opt('Me too! The espresso is great.', true, 'Me too = concordo (afirmativo).'), opt('Neither do I.', false, 'Neither do I é para negativo — Alex disse love (positivo).'), opt('I hate coffee.', false, 'Contradiz sem transição — possível, mas não concorda.')] },
      { speaker: 'Alex', promptEn: "I can't stand long meetings.", promptPt: 'Alex expressa aversão forte.', options: [opt("Neither can I.", true, 'Neither + auxiliar — concordância negativa.'), opt('Me too.', false, 'Me too é para positivo.'), opt('I can stand too.', false, 'Forma incorreta.')] },
      { speaker: 'You', promptEn: 'I hate cold mornings.', promptPt: 'Você compartilha aversão. Alex concorda — qual resposta dele?', options: [opt('Me too. I need coffee first.', true, 'Me too após hate (afirmativa de aversão compartilhada).'), opt('Neither do I.', false, 'Hate é afirmativo — use Me too, não Neither.'), opt('I love cold mornings.', false, 'Discorda.')] },
      { speaker: 'Alex', promptEn: 'What about spicy food?', promptPt: 'Alex muda de assunto — comida apimentada.', options: [opt('I love it!', true, 'Love = adoro.'), opt('I am love it.', false, 'I love, não I am love.'), opt('I love spicy.', false, 'Love it ou I love spicy food — spicy sozinho incompleto.')] },
    ],
    phraseBlocks: [
      { titleEn: 'love / hate / like', titlePt: 'love / hate / like', introPt: 'Intensidade crescente ou decrescente — love > like > don\'t mind > dislike > hate.', examples: [{ en: 'I love pizza.', pt: 'adoro' }, { en: 'I like pizza.', pt: 'gosto' }, { en: 'I hate cold coffee.', pt: 'odeio' }, { en: "I don't like spicy food.", pt: 'não gosto' }] },
      { titleEn: "don't mind", titlePt: 'não me importo / tolero', introPt: "Don't mind = neutro, aceitável — nem ama nem odeia.", examples: [{ en: "I don't mind the commute.", pt: 'tolerável' }, { en: "I don't mind working late sometimes.", pt: 'aceito' }, { en: 'Do you mind if I sit here?', pt: 'pergunta educada' }, { en: 'Not at all.', pt: 'resposta' }] },
      { titleEn: 'Me too / Neither do I', titlePt: 'Eu também / Nem eu', introPt: 'Me too = concordância com frase positiva. Neither do I = concordância com negativa.', examples: [{ en: 'I love it. — Me too!', pt: 'positivo' }, { en: "I don't like that. — Neither do I.", pt: 'negativo' }, { en: "I can't swim. — Neither can I.", pt: 'outro auxiliar' }, { en: "I'm not a morning person. — Me neither.", pt: 'variante informal' }] },
    ],
    comparison: { titleEn: 'Me too vs Neither do I', titlePt: 'Me too vs Neither do I', left: { labelEn: 'POSITIVE · Me too', exampleEn: 'I love coffee. — Me too!', notePt: 'Concorda com afirmativa positiva.' }, right: { labelEn: 'NEGATIVE · Neither do I', exampleEn: "I don't like that. — Neither do I.", notePt: 'Concorda com negativa.' }, modelEn: 'I love it. — Me too. / I hate it. — Me too. (shared feeling) / I don\'t mind. — Neither do I.', modelPt: 'Com hate/love afirmativo, Me too funciona para compartilhar o sentimento.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'Me neither do I. / I am not mind it.', rightEn: 'Neither do I. / I don\'t mind it.', explanationPt: 'Não misture Me neither com Neither do I na mesma frase. Don\'t mind + verbo base ou substantivo.' },
    review: [{ en: 'I love it.', pt: 'intensidade alta' }, { en: "I don't mind.", pt: 'neutro' }, { en: 'Me too!', pt: 'concordância positiva' }, { en: 'Neither do I.', pt: 'concordância negativa' }, { en: "I can't stand long meetings.", pt: 'aversão forte' }],
    readRepeat: { phrases: ['Do you like the cafeteria food?', "Honestly, I don't mind it.", 'I love the coffee here.', 'Me too! The espresso is great.', "I can't stand long meetings.", 'Neither can I.', 'I hate cold mornings.', 'Me too. I need coffee first.', 'What about spicy food?', 'I love it!'], dialogueEn: "Do you like the cafeteria food? — Honestly, I don't mind it. — I love the coffee here. — Me too! — I can't stand long meetings. — Neither can I. — I hate cold mornings. — Me too!" },
    mission: { headlineEn: 'You can express likes, dislikes, and agree naturally.', headlinePt: 'Você consegue expressar gostos, aversões e concordar naturalmente.', canDo: ['I love...', "I don't mind...", 'Me too.', 'Neither do I.'], production: { introPt: 'Dê opiniões sobre comida e rotina do escritório; concorde com Alex quando fizer sentido.', prompts: [{ speaker: 'Alex', questionEn: 'Do you like the cafeteria food?' }, { speaker: 'Alex', questionEn: 'I love the coffee here.' }], fields: [{ id: 'neutral', labelPt: 'Opinião neutra', prefixEn: "I don't mind", placeholderEn: 'the cafeteria food.' }, { id: 'love', labelPt: 'Algo que adora', prefixEn: 'I love', placeholderEn: 'the espresso here.' }, { id: 'agree', labelPt: 'Concordar', prefixEn: '', placeholderEn: 'Me too!' }, { id: 'hate', labelPt: 'Algo que odeia', prefixEn: 'I hate', placeholderEn: 'long meetings.' }, { id: 'neither', labelPt: 'Concordar (negativo)', prefixEn: '', placeholderEn: 'Neither can I.' }], exampleEn: "I don't mind the food. I love the espresso. Me too! I hate long meetings. Neither can I." } },
    practice: [
      pr('choice', 'Alex: I love the coffee. Você também:', { options: [opt('Me too!', true, 'Concordância positiva.'), opt('Neither do I.', false, 'Para negativo.'), opt('Me neither do I.', false, 'Mistura incorreta.')] }),
      pr('fill_blank', 'Opinião neutra:', { templateEn: "I ___ mind the commute.", blankLabel: 'auxiliar', options: [opt("don't", true, "Don't mind."), opt("doesn't", false, 'I = don\'t.'), opt('am not', false, 'Don\'t mind, não am not mind.')] }),
      pr('dialogue_complete', 'Alex: I don\'t like spicy food.', { speaker: 'You', contextEn: "Alex: I don't like spicy food.", options: [opt('Neither do I.', true, 'Concordância negativa.'), opt('Me too.', false, 'Me too com negativo de Alex — ambíguo; Neither é mais claro.'), opt('I am neither.', false, 'Forma incompleta.')] }),
      pr('reorder', 'Monte: adoro', { tokens: ['it!', 'love', 'I'], correctOrder: ['I', 'love', 'it!'], feedbackCorrectPt: 'I love it!', feedbackWrongPt: 'I + love + it.' }),
      pr('choice', 'Intensidade — mais forte que like:', { options: [opt('love', true, 'Love > like.'), opt('mind', false, "Don't mind é neutro."), opt('kind of', false, 'Kind of é fraco.')] }),
      pr('fill_blank', 'Aversão forte:', { templateEn: "I can't ___ long meetings.", blankLabel: 'verbo', options: [opt('stand', true, "Can't stand = não suporto."), opt('standing', false, 'Stand, não standing.'), opt('to stand', false, 'Can\'t stand, não can\'t to stand.')] }),
      pr('dialogue_complete', 'Concordar com hate:', { speaker: 'You', contextEn: 'Friend: I hate traffic.', options: [opt('Me too.', true, 'Compartilha aversão.'), opt('Neither do I hate.', false, 'Forma incorreta.'), opt('I am too.', false, 'Me too, não I am too.')] }),
      pr('reorder', 'Monte concordância negativa:', { tokens: ['I.', 'do', 'Neither'], correctOrder: ['Neither', 'do', 'I.'], feedbackCorrectPt: 'Neither do I.', feedbackWrongPt: 'Neither + do + I.' }),
      pr('choice', 'Qual está ERRADA?', { options: [opt("I am not mind it.", true, 'Errada — use don\'t mind.'), opt("I don't mind it.", false, 'Correta.'), opt('I love it.', false, 'Correta.')] }),
      pr('fill_blank', 'Variante informal:', { templateEn: "I'm not a morning person. — ___ neither.", blankLabel: 'Me', options: [opt('Me', true, 'Me neither — informal.'), opt('Neither', false, 'Falta Me.'), opt('Too', false, 'Me too seria concordância positiva estranha aqui.')] }),
    ],
  },
  {
    contentKey: 'elem-m01-l05-personality',
    moduleNumber: 1,
    goalPt: 'Descrever personalidade com friendly, outgoing, shy e He seems... — impressões naturais sobre pessoas.',
    intro: { titleEn: 'Personality', titlePt: 'Personalidade', bodyPt: 'Além de hobbies, você descreve como as pessoas são — friendly, outgoing, shy. He seems... permite dar impressões sem ser rude.' },
    scenario: { settingEn: 'Team event · New colleagues', scenarioPt: 'Alex apresenta colegas novos. Vocês comentam personalidade de forma educada e natural.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'What do you think of Maria?', promptPt: 'Alex pede impressão sobre colega.', options: [opt('She seems really friendly.', true, 'Seems + adjetivo — impressão educada.'), opt('She is seem friendly.', false, 'She seems, não is seem.'), opt('She friendly seems.', false, 'Ordem incorreta.')] },
      { speaker: 'Alex', promptEn: 'And Tom? He talks to everyone at parties.', promptPt: 'Alex descreve comportamento de Tom.', options: [opt("He's very outgoing.", true, 'Outgoing = extrovertido, sociável.'), opt("He's very outgoingly.", false, 'Outgoing é adjetivo, não -ly.'), opt('He outgoing is.', false, 'Ordem incorreta.')] },
      { speaker: 'Alex', promptEn: 'I heard Lisa is pretty quiet in meetings.', promptPt: 'Alex fala de Lisa.', options: [opt('Yeah, she seems a bit shy.', true, 'Shy = tímida; seems suaviza.'), opt('Yeah, she seems shyly.', false, 'Shy, não shyly (adjetivo).'), opt('Yeah, she is shyness.', false, 'Shyness é substantivo.')] },
      { speaker: 'You', promptEn: 'How would you describe yourself?', promptPt: 'Alex pergunta sobre sua personalidade.', options: [opt("I'm friendly, but sometimes I'm shy at first.", true, 'Resposta honesta com conectores.'), opt('I am personality friendly.', false, 'Forma incorreta.'), opt('I seem I am friendly.', false, 'Redundante e errado.')] },
      { speaker: 'Alex', promptEn: 'Our manager seems strict but fair.', promptPt: 'Alex descreve o gerente.', options: [opt('Yeah, he seems professional.', true, 'Seems + adjetivo profissional.'), opt('Yeah, he seem professional.', false, 'He seems — terceira pessoa.'), opt('Yeah, he is seem strict.', false, 'Is seem incorreto.')] },
    ],
    phraseBlocks: [
      { titleEn: 'friendly / outgoing / shy', titlePt: 'friendly / outgoing / shy', introPt: 'Adjetivos comuns para personalidade — use BE (is/are) ou seem.', examples: [{ en: "She's very friendly.", pt: 'simpática' }, { en: "He's outgoing and fun.", pt: 'extrovertido' }, { en: "I'm a bit shy at first.", pt: 'tímido no início' }, { en: 'Are you outgoing?', pt: 'pergunta' }] },
      { titleEn: 'He seems...', titlePt: 'Ele parece...', introPt: 'Seem = impressão, não fato absoluto — mais educado que He is... quando você acabou de conhecer.', examples: [{ en: 'He seems nice.', pt: 'parece legal' }, { en: 'She seems really smart.', pt: 'parece inteligente' }, { en: 'They seem friendly.', pt: 'parecem simpáticos' }, { en: 'Does he seem shy?', pt: 'pergunta' }] },
      { titleEn: 'Personality questions', titlePt: 'Perguntas sobre personalidade', introPt: 'What is he/she like? = como é a pessoa (personalidade).', examples: [{ en: "What's Maria like?", pt: 'como é a Maria?' }, { en: "What's he like at work?", pt: 'no trabalho' }, { en: "She's calm and organized.", pt: 'resposta' }, { en: 'How would you describe yourself?', pt: 'autodescrição' }] },
    ],
    languageFocus: { titleEn: 'seem vs be', titlePt: 'seem vs be', items: [{ formalEn: 'He is shy. (first meeting)', naturalEn: 'He seems shy.', notePt: 'Seem suaviza — você não conhece bem a pessoa.' }, { formalEn: 'She is outgoing person.', naturalEn: "She's outgoing.", notePt: 'Adjetivo direto — sem person redundante.' }], tipPt: 'Em impressões iniciais, seems soa mais natural e menos definitivo.' },
    vocabulary: { titleEn: 'More personality words', titlePt: 'Mais adjetivos', words: [{ en: 'calm', pt: 'calmo(a)', exampleEn: "She's calm under pressure." }, { en: 'organized', pt: 'organizado(a)', exampleEn: "He's very organized." }, { en: 'fun', pt: 'divertido(a)', exampleEn: "They're a lot of fun." }, { en: 'strict', pt: 'rigoroso(a)', exampleEn: 'He seems strict but fair.' }] },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'He is very friend. / She seems shyly.', rightEn: 'He is very friendly. / She seems shy.', explanationPt: 'Friendly é adjetivo (não friend = amigo). Shy é adjetivo — não shyly após seem.' },
    review: [{ en: 'She seems friendly.', pt: 'impressão' }, { en: "He's outgoing.", pt: 'extrovertido' }, { en: "I'm shy at first.", pt: 'tímido' }, { en: "What's she like?", pt: 'pergunta' }, { en: 'He seems professional.', pt: 'seem + adjetivo' }],
    readRepeat: { phrases: ["What's Maria like?", 'She seems really friendly.', 'What about Tom?', "He's very outgoing.", 'Lisa seems a bit shy.', 'How would you describe yourself?', "I'm friendly, but shy at first.", 'Our manager seems strict but fair.', 'Yeah, he seems professional.', 'They seem like a great team.'], dialogueEn: "What's Maria like? — She seems really friendly. — What about Tom? — He's very outgoing. — Lisa seems a bit shy. — How would you describe yourself? — I'm friendly, but shy at first." },
    mission: { headlineEn: 'You can describe personality naturally.', headlinePt: 'Você consegue descrever personalidade naturalmente.', canDo: ['friendly / outgoing / shy', 'He seems...', "What's she like?"], production: { introPt: 'Descreva colegas e a si mesmo — impressões educadas com seem e adjetivos.', prompts: [{ speaker: 'Alex', questionEn: "What's Maria like?" }, { speaker: 'Alex', questionEn: 'How would you describe yourself?' }], fields: [{ id: 'maria', labelPt: 'Sobre Maria', prefixEn: 'She seems', placeholderEn: 'really friendly.' }, { id: 'tom', labelPt: 'Sobre Tom', prefixEn: "He's", placeholderEn: 'very outgoing.' }, { id: 'self', labelPt: 'Sobre você', prefixEn: "I'm", placeholderEn: 'friendly, but shy at first.' }, { id: 'manager', labelPt: 'Sobre o gerente', prefixEn: 'He seems', placeholderEn: 'strict but fair.' }], exampleEn: "She seems friendly. He's outgoing. I'm friendly but shy at first. He seems professional." } },
    practice: [
      pr('choice', 'Impressão educada:', { options: [opt('She seems friendly.', true, 'Seem + adjetivo.'), opt('She is seem friendly.', false, 'Is seem errado.'), opt('She friendly.', false, 'Falta verbo.')] }),
      pr('fill_blank', 'Extrovertido:', { templateEn: "He's very ___.", blankLabel: 'adjetivo', options: [opt('outgoing', true, 'Outgoing.'), opt('outgoingly', false, 'Adjetivo, não advérbio.'), opt('outgo', false, 'Não existe.')] }),
      pr('dialogue_complete', 'Alex: What\'s Tom like?', { speaker: 'You', contextEn: "Alex: What's Tom like?", options: [opt("He's very outgoing.", true, 'Resposta direta.'), opt('He is very friend.', false, 'Friendly, não friend.'), opt('He outgoing is.', false, 'Ordem errada.')] }),
      pr('reorder', 'Monte impressão:', { tokens: ['shy.', 'seems', 'She', 'a bit'], correctOrder: ['She', 'seems', 'a bit', 'shy.'], feedbackCorrectPt: 'She seems a bit shy.', feedbackWrongPt: 'She + seems + a bit + shy.' }),
      pr('choice', 'Pergunta sobre personalidade:', { options: [opt("What's she like?", true, 'Like = personalidade/comportamento.'), opt('What does she like?', false, 'Like = gostos/hobbies.'), opt('How she is?', false, 'Falta auxiliar.')] }),
      pr('fill_blank', 'Terceira pessoa seem:', { templateEn: 'He ___ professional.', blankLabel: 'verbo', options: [opt('seems', true, 'He seems.'), opt('seem', false, 'He + seems.'), opt('is seem', false, 'Is seem errado.')] }),
      pr('dialogue_complete', 'Autodescrição:', { speaker: 'You', contextEn: 'Alex: How would you describe yourself?', options: [opt("I'm friendly, but shy at first.", true, 'Honesto e natural.'), opt('I am personality outgoing.', false, 'Incorreto.'), opt('I seem I friendly.', false, 'Redundante.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['like?', 'she', 'is', 'What'], correctOrder: ['What', 'is', 'she', 'like?'], feedbackCorrectPt: "What's she like?", feedbackWrongPt: 'What + is + she + like?' }),
      pr('choice', 'Qual adjetivo descreve quem fala com todos?', { options: [opt('outgoing', true, 'Sociável, extrovertido.'), opt('shy', false, 'Tímido — oposto.'), opt('strict', false, 'Rigoroso — outro sentido.')] }),
      pr('fill_blank', 'Corrija:', { templateEn: 'He is very ___. (simpático — adjetivo)', blankLabel: 'palavra', options: [opt('friendly', true, 'Friendly = simpático.'), opt('friend', false, 'Friend = substantivo amigo.'), opt('friendship', false, 'Friendship = amizade.')] }),
    ],
  },
  {
    contentKey: 'elem-m01-l06-describing-people',
    moduleNumber: 1,
    goalPt: 'Descrever aparência e personalidade juntas — conectores and / but para frases mais completas.',
    intro: { titleEn: 'Describing people', titlePt: 'Descrevendo pessoas', bodyPt: 'Junte aparência (tall, dark hair) com personalidade (friendly, funny) usando and e but — descrições naturais de colegas e amigos.' },
    scenario: { settingEn: 'Video call · Introducing a teammate', scenarioPt: 'Alex precisa que você descreva um colega para alguém que ainda não o conhece — aparência + personalidade.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'Can you describe Marco for the new hire?', promptPt: 'Alex pede descrição completa.', options: [opt("He's tall with dark hair, and he's really friendly.", true, 'Aparência + and + personalidade.'), opt('He tall and friendly.', false, 'Falta verbo (is/has).'), opt("He's tall but dark hair.", false, 'But conecta contrastes — dark hair precisa de with/has.')] },
      { speaker: 'Alex', promptEn: 'What about Sarah?', promptPt: 'Alex pede descrição de Sarah.', options: [opt("She has long blonde hair and she seems very organized.", true, 'Has + aparência + seem + personalidade.'), opt('She have long hair.', false, 'She has.'), opt('She is have blonde hair.', false, 'Is have incorreto.')] },
      { speaker: 'Alex', promptEn: 'Is Tom the quiet one?', promptPt: 'Alex confirma impressão sobre Tom.', options: [opt("Yeah, he's quiet but really smart.", true, 'But = contraste — quiet but smart.'), opt('Yeah, he quiet but smart.', false, 'Falta is.'), opt('Yeah, he is quiet and but smart.', false, 'And but redundante.')] },
      { speaker: 'You', promptEn: 'How would you describe our coach?', promptPt: 'Sua pergunta sobre o treinador.', options: [opt("What's he like?", true, 'Pergunta padrão personalidade.'), opt('What does he look?', false, 'What does he look like? — falta like.'), opt('How he is?', false, 'Falta auxiliar.')] },
      { speaker: 'Alex', promptEn: "He's strict in training but fair off the field.", promptPt: 'Alex descreve treinador com contraste.', options: [opt('That makes sense — strict but fair.', true, 'Repete estrutura but com concordância.'), opt('That makes sense — strict and but fair.', false, 'And but incorreto.'), opt('He is strict but is fair off.', false, 'Redundante e incompleto.')] },
    ],
    phraseBlocks: [
      { titleEn: 'Appearance basics', titlePt: 'Aparência básica', introPt: 'Adjetivos + with/has para detalhes físicos.', examples: [{ en: "He's tall.", pt: 'alto' }, { en: 'She has long dark hair.', pt: 'cabelo escuro longo' }, { en: "He's in his thirties.", pt: 'idade aproximada' }, { en: 'What does he look like?', pt: 'pergunta aparência' }] },
      { titleEn: 'and — adding information', titlePt: 'and — somar informação', introPt: 'And conecta ideias similares — aparência + aparência ou personalidade + personalidade.', examples: [{ en: "He's tall and athletic.", pt: 'dois adjetivos' }, { en: "She's friendly and funny.", pt: 'personalidade' }, { en: "He has dark hair and brown eyes.", pt: 'dois traços' }, { en: "She's smart and organized.", pt: 'trabalho' }] },
      { titleEn: 'but — contrast', titlePt: 'but — contraste', introPt: 'But mostra contraste — quiet but smart, strict but fair.', examples: [{ en: "He's quiet but friendly.", pt: 'tímido mas simpático' }, { en: "She's strict but fair.", pt: 'rigorosa mas justa' }, { en: "He's young but experienced.", pt: 'jovem mas experiente' }, { en: 'Small but powerful.', pt: 'estrutura comum' }] },
    ],
    comparison: { titleEn: 'and vs but', titlePt: 'and vs but', left: { labelEn: 'AND · similar / add', exampleEn: 'tall and friendly · smart and organized', notePt: 'Soma informações que combinam.' }, right: { labelEn: 'BUT · contrast', exampleEn: 'quiet but smart · strict but fair', notePt: 'Mostra contraste ou surpresa.' }, modelEn: "He's tall and friendly. / He's quiet but really smart.", modelPt: 'And = e (adição). But = mas (contraste).' },
    languageFocus: { titleEn: 'Look like vs Be like', titlePt: 'Look like vs Be like', items: [{ formalEn: 'What is his appearance?', naturalEn: 'What does he look like?', notePt: 'Look like = aparência física.' }, { formalEn: 'What is his personality?', naturalEn: "What's he like?", notePt: 'Be like = personalidade/comportamento.' }], tipPt: 'Look like = ver; Be like = personalidade.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'What does he look? / She have long hair.', rightEn: 'What does he look like? / She has long hair.', explanationPt: 'Look like é fixo para aparência. Terceira pessoa: she has, he has.' },
    review: [{ en: "He's tall with dark hair.", pt: 'aparência' }, { en: "She's friendly and funny.", pt: 'and' }, { en: "He's quiet but smart.", pt: 'but' }, { en: 'What does he look like?', pt: 'pergunta aparência' }, { en: "What's she like?", pt: 'pergunta personalidade' }],
    readRepeat: { phrases: ['Can you describe Marco?', "He's tall with dark hair.", "And he's really friendly.", 'What about Sarah?', 'She has long blonde hair.', 'She seems very organized.', 'Is Tom the quiet one?', "He's quiet but really smart.", 'What does he look like?', "What's she like?", 'Strict but fair.'], dialogueEn: "Can you describe Marco? — He's tall with dark hair, and he's really friendly. — What about Sarah? — She has long blonde hair and she seems very organized. — Is Tom quiet? — He's quiet but really smart." },
    mission: { headlineEn: 'You can describe people — looks and personality.', headlinePt: 'Você consegue descrever pessoas — aparência e personalidade.', canDo: ['What does he look like?', "What's she like?", 'and / but'], production: { introPt: 'Descreva três colegas — aparência, personalidade e um contraste com but.', prompts: [{ speaker: 'Alex', questionEn: 'Can you describe Marco for the new hire?' }, { speaker: 'Alex', questionEn: 'What about Sarah?' }], fields: [{ id: 'marco', labelPt: 'Marco (aparência + personalidade)', prefixEn: "He's", placeholderEn: 'tall with dark hair, and really friendly.' }, { id: 'sarah', labelPt: 'Sarah', prefixEn: 'She has', placeholderEn: 'long blonde hair and seems organized.' }, { id: 'tom', labelPt: 'Tom (contraste)', prefixEn: "He's", placeholderEn: 'quiet but really smart.' }, { id: 'coach', labelPt: 'Treinador', prefixEn: "He's", placeholderEn: 'strict but fair.' }], exampleEn: "He's tall and friendly. She has long hair and seems organized. He's quiet but smart. Strict but fair." } },
    practice: [
      pr('choice', 'Pergunta sobre aparência:', { options: [opt('What does he look like?', true, 'Look like = aparência.'), opt('What does he look?', false, 'Falta like.'), opt("What's he look like?", false, 'Does, não is.')] }),
      pr('fill_blank', 'Conector contraste:', { templateEn: "He's quiet ___ really smart.", blankLabel: 'conector', options: [opt('but', true, 'But = mas.'), opt('and', false, 'And não mostra contraste aqui.'), opt('because', false, 'Because = causa.')] }),
      pr('reorder', 'Monte descrição:', { tokens: ['friendly.', 'and', "he's", 'tall,', "He's"], correctOrder: ["He's", 'tall,', 'and', "he's", 'friendly.'], feedbackCorrectPt: "He's tall, and he's friendly.", feedbackWrongPt: 'Aparência + and + personalidade.' }),
      pr('dialogue_complete', 'Alex: Describe Sarah.', { speaker: 'You', contextEn: 'Alex: Can you describe Sarah?', options: [opt('She has long blonde hair and seems organized.', true, 'Completa.'), opt('She have long hair.', false, 'She has.'), opt('She is have blonde.', false, 'Incorreto.')] }),
      pr('choice', 'Conector para somar:', { options: [opt('and', true, 'And soma.'), opt('but', false, 'But contrasta.'), opt('because', false, 'Because explica causa.')] }),
      pr('fill_blank', 'Terceira pessoa has:', { templateEn: 'She ___ dark hair.', blankLabel: 'verbo', options: [opt('has', true, 'She has.'), opt('have', false, 'She have errado.'), opt('is', false, 'Is não combina com hair sozinho.')] }),
      pr('dialogue_complete', 'Contraste:', { speaker: 'You', contextEn: 'Describe Tom — quiet but...', options: [opt("He's quiet but really smart.", true, 'But + contraste.'), opt('He quiet but smart.', false, 'Falta is.'), opt("He's quiet and but smart.", false, 'And but errado.')] }),
      pr('reorder', 'Monte pergunta personalidade:', { tokens: ['like?', 'she', 'is', 'What'], correctOrder: ['What', 'is', 'she', 'like?'], feedbackCorrectPt: "What's she like?", feedbackWrongPt: 'What is she like?' }),
      pr('choice', 'Descrição completa:', { options: [opt("He's tall and athletic.", true, 'Dois adjetivos com and.'), opt('He tall and athletic.', false, 'Falta is.'), opt("He's tall but athletic.", false, 'But implica contraste — tall e athletic não contrastam.')] }),
      pr('fill_blank', 'Aparência com with:', { templateEn: "He's tall ___ dark hair.", blankLabel: 'preposição', options: [opt('with', true, 'With dark hair.'), opt('and', false, 'And dark hair incompleto.'), opt('has', false, 'He has dark hair — estrutura diferente.')] }),
    ],
  },
  {
    contentKey: 'elem-m01-l07-getting-to-know-you-challenge',
    moduleNumber: 1,
    challenge: true,
    goalPt: 'Desafio Módulo 1 — integrar detalhes pessoais, follow-ups, hobbies, gostos, personalidade e descrições numa conversa completa.',
    intro: { titleEn: 'Getting to Know You Challenge', titlePt: 'Desafio — Conhecendo você', bodyPt: 'Hora de juntar tudo do Módulo 1 numa conversa real com Alex — sem vocabulário novo. Detalhes pessoais, follow-ups, hobbies, likes, personalidade e descrições.' },
    scenario: { settingEn: 'Team welcome dinner · Full conversation', scenarioPt: 'Jantar de boas-vindas — Alex conduz conversa completa para te conhecer de verdade.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'So — married or single?', promptPt: 'Passo 1 — estado civil.', options: [opt("I'm single.", true, 'BE + adjetivo.'), opt('I have single.', false, 'Have errado.'), opt('I am single person.', false, 'Redundante.')] },
      { speaker: 'Alex', promptEn: "I've lived here for five years.", promptPt: 'Passo 2 — Alex compartilha. Reação?', options: [opt('Really? How long have you been in Boston?', true, 'Follow-up natural.'), opt('What is your name?', false, 'Fora de contexto.'), opt('I hate Boston.', false, 'Rude sem motivo.')] },
      { speaker: 'Alex', promptEn: 'What are you into these days?', promptPt: 'Passo 3 — hobbies.', options: [opt("I'm into soccer and I enjoy cooking.", true, 'Into + enjoy.'), opt('I like play soccer.', false, 'Like playing.'), opt('I am into the cooking.', false, 'Sem the.')] },
      { speaker: 'Alex', promptEn: 'I love the food here. The steak is amazing.', promptPt: 'Passo 4 — likes.', options: [opt('Me too! I love it.', true, 'Me too + love.'), opt('Neither do I.', false, 'Para negativo.'), opt('I am love steak.', false, 'I love.')] },
      { speaker: 'Alex', promptEn: "What's Maria like? You work with her, right?", promptPt: 'Passo 5 — personalidade.', options: [opt('She seems really friendly and organized.', true, 'Seem + adjetivos.'), opt('She is seem friendly.', false, 'Is seem errado.'), opt('She friendly.', false, 'Falta verbo.')] },
      { speaker: 'Alex', promptEn: 'Can you describe Marco for me? I haven\'t met him yet.', promptPt: 'Passo 6 — descrição completa.', options: [opt("He's tall with dark hair, and he's outgoing but really professional.", true, 'Aparência + and + but.'), opt('He tall and outgoing.', false, 'Falta verbo.'), opt('He has tall.', false, 'Incorreto.')] },
    ],
    reviewBlocks: [
      { titleEn: 'Step 1 — Personal details', titlePt: 'Passo 1 — Detalhes pessoais', items: [{ en: "I'm single.", pt: 'estado civil' }, { en: 'Where do you live now?', pt: 'moradia' }, { en: 'Where do you work now?', pt: 'trabalho' }] },
      { titleEn: 'Step 2 — Follow-ups', titlePt: 'Passo 2 — Follow-ups', items: [{ en: 'Really?', pt: 'reação' }, { en: 'How long have you been here?', pt: 'duração' }, { en: 'Tell me more.', pt: 'aprofundar' }, { en: 'What about you?', pt: 'devolver' }] },
      { titleEn: 'Step 3 — Hobbies & likes', titlePt: 'Passo 3 — Hobbies e gostos', items: [{ en: "I'm into soccer.", pt: 'interesses' }, { en: 'I enjoy cooking.', pt: 'enjoy + -ing' }, { en: 'I love it. / Me too!', pt: 'likes + concordância' }] },
      { titleEn: 'Step 4 — People', titlePt: 'Passo 4 — Pessoas', items: [{ en: 'She seems friendly.', pt: 'personalidade' }, { en: "He's tall with dark hair.", pt: 'aparência' }, { en: "He's quiet but smart.", pt: 'and / but' }] },
    ],
    comparison: { titleEn: 'Full flow — Getting to know someone', titlePt: 'Fluxo completo', left: { labelEn: 'OPEN · personal', exampleEn: 'Married? · Where live? · Where work?', notePt: 'Detalhes básicos além do START.' }, right: { labelEn: 'DEEPEN · connect', exampleEn: 'Really? · Hobbies · Likes · People · Descriptions', notePt: 'Follow-ups e tópicos sociais.' }, modelEn: 'Status → Follow-up → Hobbies → Likes → Personality → Describe someone', modelPt: 'Ordem típica num jantar ou happy hour.' },
    languageFocus: { titleEn: 'Challenge reminders', titlePt: 'Lembretes do desafio', items: [{ formalEn: 'I have single. / I like play soccer.', naturalEn: "I'm single. / I like playing soccer.", notePt: 'BE para estado civil; like/enjoy + -ing.' }, { formalEn: 'Answer only, no reaction.', naturalEn: 'React → Follow-up → Share → Return', notePt: 'Mantenha a conversa viva.' }], tipPt: 'Cada pergunta de Alex cobre um tópico do módulo — responda só aquilo, depois avance.' },
    readRepeat: { phrases: ['Are you married or single?', "I'm single.", 'Really? Tell me more.', 'What are you into?', "I'm into soccer.", 'I love the food here.', 'Me too!', "What's Maria like?", 'She seems friendly.', 'Can you describe Marco?', "He's tall and outgoing.", 'Nice getting to know you!'], dialogueEn: "Are you married or single? — I'm single. — Really? Tell me more. — What are you into? — I'm into soccer. — I love the food here. — Me too! — What's Maria like? — She seems friendly. — Can you describe Marco? — He's tall and outgoing. — Nice getting to know you!" },
    mission: { headlineEn: 'Full Module 1 conversation — getting to know you.', headlinePt: 'Conversa completa Módulo 1 — conhecendo você.', canDo: ['Personal details', 'Follow-ups', 'Hobbies', 'Likes', 'Personality', 'Descriptions'], production: { introPt: 'Monte a conversa completa do Módulo 1 — use apenas o que aprendeu nas lições 1 a 6.', prompts: [{ speaker: 'Alex', questionEn: "Let's really get to know each other — ready?" }], fields: [{ id: 'status', labelPt: 'Estado civil + moradia', prefixEn: "I'm", placeholderEn: 'single. I live in Boston now.' }, { id: 'followUp', labelPt: 'Follow-up', prefixEn: '', placeholderEn: 'Really? Tell me more.' }, { id: 'hobbies', labelPt: 'Hobbies', prefixEn: "I'm into", placeholderEn: 'soccer. I enjoy cooking.' }, { id: 'likes', labelPt: 'Likes + concordância', prefixEn: '', placeholderEn: 'I love the food here. Me too!' }, { id: 'people', labelPt: 'Personalidade + descrição', prefixEn: '', placeholderEn: 'Maria seems friendly. Marco is tall and outgoing.' }], exampleEn: "I'm single. I live in Boston. Really? Tell me more. I'm into soccer. Me too! Maria seems friendly. Marco is tall and outgoing." } },
    practice: [
      pr('choice', 'Passo 1 — estado civil:', { options: [opt("I'm single.", true, 'Correto.'), opt('I have single.', false, 'Have errado.'), opt('Where do you work?', false, 'Não responde.')] }),
      pr('dialogue_complete', 'Passo 2 — Alex: I\'ve lived here five years.', { speaker: 'You', contextEn: "Alex: I've lived here for five years.", options: [opt('Really? How long have you been here?', true, 'Follow-up.'), opt('I am single.', false, 'Outro tópico.'), opt('Goodbye.', false, 'Encerra.')] }),
      pr('fill_blank', 'Passo 3 — hobby:', { templateEn: "I'm ___ soccer.", blankLabel: 'preposição', options: [opt('into', true, "I'm into."), opt('enjoy', false, 'I enjoy playing — estrutura diferente.'), opt('like to', false, 'I like playing soccer.')] }),
      pr('dialogue_complete', 'Passo 4 — Alex: I love the food.', { speaker: 'You', contextEn: 'Alex: I love the food here.', options: [opt('Me too!', true, 'Concordância.'), opt('Neither do I.', false, 'Negativo.'), opt('Tell me more.', false, 'Não concorda.')] }),
      pr('reorder', 'Passo 5 — personalidade:', { tokens: ['friendly.', 'seems', 'She', 'really'], correctOrder: ['She', 'seems', 'really', 'friendly.'], feedbackCorrectPt: 'She seems really friendly.', feedbackWrongPt: 'She seems + adv + adj.' }),
      pr('choice', 'Passo 6 — descrição:', { options: [opt("He's tall and outgoing.", true, 'Aparência + personalidade.'), opt('He tall outgoing.', false, 'Falta verbo.'), opt('He is seem tall.', false, 'Is seem errado.')] }),
      pr('fill_blank', 'Integração — concordância negativa:', { templateEn: "I don't like cold weather. — ___ do I.", blankLabel: 'Neither', options: [opt('Neither', true, 'Neither do I.'), opt('Me', false, 'Me too é positivo.'), opt('Nor', false, 'Nor alone incompleto.')] }),
      pr('dialogue_complete', 'Follow-up devolver:', { speaker: 'You', contextEn: 'Alex shared about his move.', options: [opt('What about you?', true, 'Devolve.'), opt('Really?', false, 'Só reação.'), opt('I hate moving.', false, 'Sem devolver.')] }),
      pr('reorder', 'Monte: enjoy + atividade', { tokens: ['cooking.', 'enjoy', 'I'], correctOrder: ['I', 'enjoy', 'cooking.'], feedbackCorrectPt: 'I enjoy cooking.', feedbackWrongPt: 'I enjoy + -ing/substantivo.' }),
      pr('choice', 'Contraste na descrição:', { options: [opt('quiet but smart', true, 'But = contraste.'), opt('quiet and but smart', false, 'And but errado.'), opt('quiet because smart', false, 'Because = causa.')] }),
      pr('fill_blank', 'Moradia atual:', { templateEn: 'I live ___ Miami now.', blankLabel: 'preposição', options: [opt('in', true, 'Live in + cidade.'), opt('at', false, 'At cidade errado.'), opt('on', false, 'On não combina.')] }),
      pr('dialogue_complete', 'Encerramento:', { speaker: 'You', contextEn: 'Alex: Great getting to know you!', options: [opt('Nice talking to you!', true, 'Encerramento.'), opt('How old are you?', false, 'Reabre.'), opt('Tell me more.', false, 'Fora de contexto.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l01-present-expanded',
    moduleNumber: 2,
    goalPt: 'Expandir o Presente Simples — I usually..., always e rotinas com mais naturalidade.',
    intro: { titleEn: 'Simple Present — expanded', titlePt: 'Presente Simples — expandido', bodyPt: 'Você já usa I work every day. Agora expande com usually, always e frases mais completas sobre rotina diária.' },
    scenario: { settingEn: 'Morning coffee · Routine chat', scenarioPt: 'Alex pergunta sobre sua rotina matinal e hábitos diários com usually e always.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'What time do you usually wake up?', promptPt: 'Alex pergunta horário habitual com usually.', options: [opt('I usually wake up at 6:30.', true, 'Usually antes do verbo principal.'), opt('I wake up usually at 6:30.', false, 'Usually antes do verbo (exceto verbo to be).'), opt('I am usually wake up at 6:30.', false, 'Am wake incorreto.')] },
      { speaker: 'Alex', promptEn: 'Do you always have coffee first?', promptPt: 'Alex pergunta hábito com always.', options: [opt('Yes, I always have coffee first.', true, 'Always antes do verbo principal.'), opt('Yes, I have always coffee first.', false, 'Always antes do have.'), opt('Yes, I always having coffee.', false, 'Always + base, não -ing.')] },
      { speaker: 'Alex', promptEn: 'I usually take the train to work.', promptPt: 'Alex compartilha rotina.', options: [opt('Me too. I usually drive.', true, 'Resposta paralela com usually.'), opt('I am usually drive.', false, 'I usually drive.'), opt('I drive usually always.', false, 'Ordem confusa.')] },
      { speaker: 'You', promptEn: 'Do you always eat breakfast?', promptPt: 'Sua pergunta sobre hábito.', options: [opt('Do you always eat breakfast?', true, 'Do you + always + verbo base.'), opt('Are you always eat breakfast?', false, 'Are eat incorreto.'), opt('Do you eat always breakfast?', false, 'Always antes do verbo.')] },
      { speaker: 'Alex', promptEn: 'I always check email before meetings.', promptPt: 'Alex descreve hábito de trabalho.', options: [opt('That makes sense. I usually do the same.', true, 'Resposta natural.'), opt('I always am check email.', false, 'Am check errado.'), opt('I usually same do.', false, 'Ordem incorreta.')] },
    ],
    phraseBlocks: [
      { titleEn: 'I usually...', titlePt: 'Eu geralmente...', introPt: 'Usually = na maioria das vezes — hábito com variação.', examples: [{ en: 'I usually wake up at 6.', pt: 'acordar' }, { en: 'I usually take the train.', pt: 'transporte' }, { en: 'What do you usually do on Sundays?', pt: 'pergunta' }, { en: 'She usually works from home.', pt: 'terceira pessoa' }] },
      { titleEn: 'I always...', titlePt: 'Eu sempre...', introPt: 'Always = 100% do tempo — hábito fixo.', examples: [{ en: 'I always have coffee first.', pt: 'café' }, { en: 'I always check my email.', pt: 'trabalho' }, { en: 'Do you always eat breakfast?', pt: 'pergunta' }, { en: 'He always arrives early.', pt: 'terceira pessoa' }] },
      { titleEn: 'Daily routine verbs', titlePt: 'Verbos de rotina', introPt: 'Verbos comuns no Presente Simples — forma base com I/you/we/they.', examples: [{ en: 'I wake up · I get dressed · I leave home', pt: 'manhã' }, { en: 'I work · I train · I study English', pt: 'dia' }, { en: 'I cook dinner · I relax · I go to bed', pt: 'noite' }, { en: 'What time do you start work?', pt: 'pergunta horário' }] },
    ],
    languageFocus: { titleEn: 'Adverb position — usually / always', titlePt: 'Posição de usually / always', items: [{ formalEn: 'I go always to the gym.', naturalEn: 'I always go to the gym.', notePt: 'Always/usually ANTES do verbo principal (exceto to be).' }, { formalEn: 'She works usually at home.', naturalEn: 'She usually works at home.', notePt: 'Mesma regra na terceira pessoa.' }], tipPt: 'Exceção: I am always tired. (to be + always + adjetivo)' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'I always am tired. / I go always to work.', rightEn: 'I am always tired. / I always go to work.', explanationPt: 'Com to be: am/is/are + always. Com outros verbos: always + verbo base.' },
    vocabulary: { titleEn: 'Routine words', titlePt: 'Vocabulário rotina', words: [{ en: 'usually', pt: 'geralmente', exampleEn: 'I usually wake up at 6.' }, { en: 'always', pt: 'sempre', exampleEn: 'I always have coffee.' }, { en: 'wake up', pt: 'acordar', exampleEn: 'I wake up early.' }, { en: 'commute', pt: 'deslocamento', exampleEn: 'I commute by train.' }] },
    review: [{ en: 'I usually wake up at 6.', pt: 'usually' }, { en: 'I always have coffee first.', pt: 'always' }, { en: 'What do you usually do?', pt: 'pergunta' }, { en: 'She usually works from home.', pt: '3ª pessoa' }, { en: 'I am always tired on Mondays.', pt: 'to be + always' }],
    readRepeat: { phrases: ['What time do you usually wake up?', 'I usually wake up at 6:30.', 'Do you always have coffee first?', 'Yes, I always have coffee first.', 'I usually take the train to work.', 'Me too. I usually drive.', 'Do you always eat breakfast?', 'I always check email before meetings.', 'I usually do the same.', 'What do you usually do on Sundays?'], dialogueEn: 'What time do you usually wake up? — I usually wake up at 6:30. — Do you always have coffee first? — Yes, I always have coffee first. — I usually take the train. — Me too. I usually drive.' },
    mission: { headlineEn: 'You can talk about daily routines with usually and always.', headlinePt: 'Você consegue falar de rotina com usually e always.', canDo: ['I usually...', 'I always...', 'What do you usually...?'], production: { introPt: 'Descreva sua rotina matinal e hábitos fixos com usually e always.', prompts: [{ speaker: 'Alex', questionEn: 'What time do you usually wake up?' }, { speaker: 'Alex', questionEn: 'Do you always have coffee first?' }], fields: [{ id: 'wake', labelPt: 'Acordar (usually)', prefixEn: 'I usually wake up at', placeholderEn: '6:30.' }, { id: 'coffee', labelPt: 'Café (always)', prefixEn: 'I always', placeholderEn: 'have coffee first.' }, { id: 'commute', labelPt: 'Deslocamento (usually)', prefixEn: 'I usually', placeholderEn: 'take the train to work.' }, { id: 'ask', labelPt: 'Perguntar a Alex', prefixEn: '', placeholderEn: 'Do you always eat breakfast?' }], exampleEn: 'I usually wake up at 6:30. I always have coffee first. I usually take the train. Do you always eat breakfast?' } },
    practice: [
      pr('choice', 'Posição de always:', { options: [opt('I always have coffee.', true, 'Always antes do verbo.'), opt('I have always coffee.', false, 'Posição errada.'), opt('I always having coffee.', false, 'Having errado.')] }),
      pr('fill_blank', 'Usually + verbo:', { templateEn: 'I ___ wake up at 6.', blankLabel: 'advérbio', options: [opt('usually', true, 'I usually wake up.'), opt('usual', false, 'Usually, não usual.'), opt('am usually', false, 'I usually, não I am usually wake.')] }),
      pr('reorder', 'Monte rotina:', { tokens: ['at 6:30.', 'wake up', 'usually', 'I'], correctOrder: ['I', 'usually', 'wake up', 'at 6:30.'], feedbackCorrectPt: 'I usually wake up at 6:30.', feedbackWrongPt: 'I + usually + verbo + horário.' }),
      pr('dialogue_complete', 'Alex: Do you always eat breakfast?', { speaker: 'You', contextEn: 'Alex: Do you always eat breakfast?', options: [opt('Yes, I always eat breakfast.', true, 'Always antes de eat.'), opt('Yes, I eat always breakfast.', false, 'Posição errada.'), opt('Yes, I am always eat.', false, 'Am eat errado.')] }),
      pr('choice', 'To be + always:', { options: [opt('I am always tired on Mondays.', true, 'Am + always + adjetivo.'), opt('I always am tired on Mondays.', false, 'Am always tired.'), opt('I always tired am.', false, 'Ordem errada.')] }),
      pr('fill_blank', 'Pergunta rotina:', { templateEn: 'What do you ___ do on Sundays?', blankLabel: 'advérbio', options: [opt('usually', true, 'Do you usually.'), opt('always', false, 'Usually encaixa melhor para variação.'), opt('usual', false, 'Usually.')] }),
      pr('dialogue_complete', 'Alex: I usually take the train.', { speaker: 'You', contextEn: 'Alex: I usually take the train to work.', options: [opt('Me too. I usually drive.', true, 'Resposta paralela.'), opt('I am usually drive.', false, 'I usually drive.'), opt('I drive usually the.', false, 'Incorreto.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['coffee first?', 'always', 'have', 'you', 'Do'], correctOrder: ['Do', 'you', 'always', 'have', 'coffee first?'], feedbackCorrectPt: 'Do you always have coffee first?', feedbackWrongPt: 'Do + you + always + verbo.' }),
      pr('choice', 'Terceira pessoa usually:', { options: [opt('She usually works from home.', true, 'She + usually + works.'), opt('She usually work from home.', false, 'Works com -s.'), opt('She works usually from home.', false, 'Posição errada.')] }),
      pr('fill_blank', 'Verbo rotina:', { templateEn: 'I always ___ my email before meetings.', blankLabel: 'verbo', options: [opt('check', true, 'Check — base form.'), opt('checks', false, 'I check, não checks.'), opt('checking', false, 'Always + base.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l02-third-person',
    moduleNumber: 2,
    goalPt: 'Terceira pessoa no Presente Simples — he/she works, regra do -s e erro clássico he work.',
    intro: { titleEn: 'Third person — he/she works', titlePt: 'Terceira pessoa — he/she works', bodyPt: 'Com he, she, it o verbo leva -s: works, trains, plays. Regra crítica para brasileiros que esquecem o -s.' },
    scenario: { settingEn: 'Office · Talking about teammates', scenarioPt: 'Alex pergunta sobre colegas — você descreve rotinas de he/she com -s.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'Where does Marco work?', promptPt: 'Alex pergunta sobre Marco (he).', options: [opt('He works in marketing.', true, 'He works — -s obrigatório.'), opt('He work in marketing.', false, 'He work — erro clássico BR.'), opt('He working in marketing.', false, 'Forma incompleta.')] },
      { speaker: 'Alex', promptEn: 'Does Sarah train every morning?', promptPt: 'Alex pergunta sobre Sarah (she).', options: [opt('Yes, she trains every morning.', true, 'She trains — -s.'), opt('Yes, she train every morning.', false, 'She train errado.'), opt('Yes, she training every morning.', false, 'Training incompleto.')] },
      { speaker: 'Alex', promptEn: 'What time does he start work?', promptPt: 'Pergunta com does — verbo base na resposta.', options: [opt('He starts at 8 a.m.', true, 'He starts — afirmativa com -s.'), opt('He start at 8 a.m.', false, 'He start errado.'), opt('He does starts at 8.', false, 'Does starts redundante.')] },
      { speaker: 'You', promptEn: 'Does she work from home?', promptPt: 'Sua pergunta sobre colega.', options: [opt('Does she work from home?', true, 'Does + she + verbo base.'), opt('Do she work from home?', false, 'She = does.'), opt('Does she works from home?', false, 'Does + work base, não works.')] },
      { speaker: 'Alex', promptEn: 'The team practices on Mondays.', promptPt: 'Alex fala do time (it/they).', options: [opt('Yes, the team practices every Monday.', true, 'Team singular — practices.'), opt('Yes, the team practice every Monday.', false, 'Team = it — practices.'), opt('Yes, the team is practice.', false, 'Is practice errado.')] },
    ],
    phraseBlocks: [
      { titleEn: 'He / She + -s', titlePt: 'He / She + -s', introPt: 'Terceira pessoa singular — verbo + s (works, lives, trains).', examples: [{ en: 'He works in marketing.', pt: 'ele trabalha' }, { en: 'She lives in Boston.', pt: 'ela mora' }, { en: 'He trains every morning.', pt: 'ele treina' }, { en: 'She plays soccer on weekends.', pt: 'ela joga' }] },
      { titleEn: 'Does he/she...?', titlePt: 'Does he/she...?', introPt: 'Pergunta: Does + he/she + verbo BASE (sem -s).', examples: [{ en: 'Does he work here?', pt: 'pergunta' }, { en: 'Does she train every day?', pt: 'pergunta' }, { en: 'Yes, he does. / No, he doesn\'t.', pt: 'resposta curta' }, { en: 'What time does she start?', pt: 'WH + does' }] },
      { titleEn: 'I vs He comparison', titlePt: 'I vs He — comparação', introPt: 'I/you/we/they = base. He/she/it = -s.', examples: [{ en: 'I work · He works', pt: 'trabalhar' }, { en: 'I live · She lives', pt: 'morar' }, { en: 'We train · He trains', pt: 'treinar' }, { en: 'They play · She plays', pt: 'jogar' }] },
    ],
    comparison: { titleEn: 'I work vs He works', titlePt: 'I work vs He works', left: { labelEn: 'I / YOU / WE / THEY', exampleEn: 'I work · They train', notePt: 'Verbo base — sem -s.' }, right: { labelEn: 'HE / SHE / IT', exampleEn: 'He works · She trains', notePt: 'Verbo + -s — obrigatório.' }, modelEn: 'I work every day. He works in marketing. She trains every morning.', modelPt: 'Brasileiros esquecem o -s na terceira pessoa.' },
    languageFocus: { titleEn: 'Does + base verb', titlePt: 'Does + verbo base', items: [{ formalEn: 'Does he works here?', naturalEn: 'Does he work here?', notePt: 'Does já marca 3ª pessoa — verbo volta à base.' }, { formalEn: 'He work in Boston.', naturalEn: 'He works in Boston.', notePt: 'Afirmativa: he + works.' }], tipPt: 'Pergunta: Does she work? Resposta: Yes, she works.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'He work in marketing. / She train every day.', rightEn: 'He works in marketing. / She trains every day.', explanationPt: 'Português não marca -s na 3ª pessoa — inglês marca. He works, she trains, it practices.' },
    review: [{ en: 'He works in marketing.', pt: '3ª pessoa -s' }, { en: 'She trains every morning.', pt: '3ª pessoa -s' }, { en: 'Does he work here?', pt: 'pergunta does' }, { en: 'I work · He works', pt: 'contraste' }, { en: 'Yes, she does.', pt: 'resposta curta' }],
    readRepeat: { phrases: ['Where does Marco work?', 'He works in marketing.', 'Does Sarah train every morning?', 'Yes, she trains every morning.', 'What time does he start work?', 'He starts at 8 a.m.', 'Does she work from home?', 'Yes, she works from home on Fridays.', 'I work every day.', 'He works in marketing. She trains every morning.'], dialogueEn: 'Where does Marco work? — He works in marketing. — Does Sarah train every morning? — Yes, she trains every morning. — What time does he start? — He starts at 8 a.m.' },
    mission: { headlineEn: 'You can describe he/she routines with -s.', headlinePt: 'Você consegue descrever rotinas de he/she com -s.', canDo: ['He works...', 'She trains...', 'Does he/she...?'], production: { introPt: 'Descreva rotinas de dois colegas (he e she) e faça uma pergunta com Does.', prompts: [{ speaker: 'Alex', questionEn: 'Tell me about Marco and Sarah.' }], fields: [{ id: 'he', labelPt: 'Marco (he)', prefixEn: 'He works', placeholderEn: 'in marketing.' }, { id: 'she', labelPt: 'Sarah (she)', prefixEn: 'She trains', placeholderEn: 'every morning.' }, { id: 'question', labelPt: 'Pergunta Does', prefixEn: '', placeholderEn: 'Does she work from home?' }, { id: 'you', labelPt: 'Contraste — você (I)', prefixEn: 'I work', placeholderEn: 'every day.' }], exampleEn: 'He works in marketing. She trains every morning. Does she work from home? I work every day.' } },
    practice: [
      pr('choice', 'Marco (he) trabalha:', { options: [opt('He works in marketing.', true, '-s obrigatório.'), opt('He work in marketing.', false, 'Erro clássico BR.'), opt('He working in marketing.', false, 'Incompleto.')] }),
      pr('fill_blank', 'Sarah (she) treina:', { templateEn: 'She ___ every morning.', blankLabel: 'verbo', options: [opt('trains', true, 'She trains.'), opt('train', false, 'She train errado.'), opt('training', false, 'Training incompleto.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['here?', 'work', 'he', 'Does'], correctOrder: ['Does', 'he', 'work', 'here?'], feedbackCorrectPt: 'Does he work here?', feedbackWrongPt: 'Does + he + work (base).' }),
      pr('dialogue_complete', 'Alex: Does she work from home?', { speaker: 'You', contextEn: 'Alex: Does she work from home?', options: [opt('Yes, she works from home on Fridays.', true, 'Works na resposta.'), opt('Yes, she work from home.', false, 'She work errado.'), opt('Yes, she does works.', false, 'Does works redundante.')] }),
      pr('choice', 'Qual está ERRADA?', { options: [opt('He work every day.', true, 'Errada — He works.'), opt('He works every day.', false, 'Correta.'), opt('She works every day.', false, 'Correta.')] }),
      pr('fill_blank', 'Pergunta — verbo base:', { templateEn: 'Does he ___ in Boston?', blankLabel: 'verbo', options: [opt('live', true, 'Does + live (base).'), opt('lives', false, 'Does + base, não lives.'), opt('living', false, 'Living errado.')] }),
      pr('dialogue_complete', 'Contraste I vs He:', { speaker: 'You', contextEn: 'Describe you and Marco.', options: [opt('I work every day. He works in marketing.', true, 'I base, he -s.'), opt('I works every day. He work in marketing.', false, 'Ambos errados.'), opt('I work. He work.', false, 'He precisa -s.')] }),
      pr('reorder', 'Monte afirmativa:', { tokens: ['marketing.', 'in', 'works', 'He'], correctOrder: ['He', 'works', 'in', 'marketing.'], feedbackCorrectPt: 'He works in marketing.', feedbackWrongPt: 'He + works + in + lugar.' }),
      pr('choice', 'Resposta curta:', { options: [opt('Yes, she does.', true, 'Does = she does.'), opt('Yes, she works.', false, 'Possível mas less common as short answer.'), opt('Yes, she do.', false, 'She do errado.')] }),
      pr('fill_blank', 'Team (it):', { templateEn: 'The team ___ on Mondays.', blankLabel: 'verbo', options: [opt('practices', true, 'Team singular — practices.'), opt('practice', false, 'Team = it — practices.'), opt('is practice', false, 'Is practice errado.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l03-weekly-routine',
    moduleNumber: 2,
    goalPt: 'Descrever rotina semanal — On Mondays I..., weekly schedule com dias da semana.',
    intro: { titleEn: 'Weekly routines', titlePt: 'Rotinas semanais', bodyPt: 'Organize sua semana em inglês — On Mondays I..., on weekends, every Tuesday. Rotina semanal clara e natural.' },
    scenario: { settingEn: 'Team planning · Week overview', scenarioPt: 'Alex pergunta como você organiza a semana — treinos, trabalho e dias específicos.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'What do you do on Mondays?', promptPt: 'Alex pergunta sobre segunda-feira.', options: [opt('On Mondays I usually have team meetings.', true, 'On Mondays + rotina.'), opt('In Mondays I have meetings.', false, 'On Mondays, não In Mondays.'), opt('On Monday I am have meetings.', false, 'Am have errado.')] },
      { speaker: 'Alex', promptEn: 'How about Wednesdays?', promptPt: 'Alex continua pela semana.', options: [opt('On Wednesdays I train in the morning.', true, 'On + dia plural + rotina.'), opt('On Wednesdays I am train.', false, 'I train, não am train.'), opt('At Wednesdays I train.', false, 'On Wednesdays.')] },
      { speaker: 'Alex', promptEn: 'Do you work on weekends?', promptPt: 'Alex pergunta sobre fim de semana.', options: [opt('Sometimes I work on Saturdays, but not always.', true, 'On Saturdays + sometimes.'), opt('I work in weekends always.', false, 'On weekends.'), opt('I am work on weekend.', false, 'I work.')] },
      { speaker: 'You', promptEn: 'What do you usually do on Fridays?', promptPt: 'Sua pergunta sobre sexta.', options: [opt('What do you usually do on Fridays?', true, 'Pergunta natural.'), opt('What you do on Fridays?', false, 'Falta do.'), opt('What do you usually on Fridays do?', false, 'Ordem errada.')] },
      { speaker: 'Alex', promptEn: 'I never work on Sundays.', promptPt: 'Alex compartilha hábito dominical.', options: [opt('Same here. I usually relax on Sundays.', true, 'Resposta paralela.'), opt('I never am work Sundays.', false, 'I never work.'), opt('Same here. I relax on the Sunday always.', false, 'On Sundays.')] },
    ],
    phraseBlocks: [
      { titleEn: 'On Mondays / On Tuesdays...', titlePt: 'On Mondays / On Tuesdays...', introPt: 'On + dia (plural) = todo/aquele dia da semana repetidamente.', examples: [{ en: 'On Mondays I have meetings.', pt: 'segundas' }, { en: 'On Wednesdays I train.', pt: 'quartas' }, { en: 'On Fridays I leave early.', pt: 'sextas' }, { en: 'What do you do on Thursdays?', pt: 'pergunta' }] },
      { titleEn: 'on weekends / weekdays', titlePt: 'fim de semana / dias úteis', introPt: 'On weekends = sábado e domingo. On weekdays = segunda a sexta.', examples: [{ en: 'I relax on weekends.', pt: 'descanso' }, { en: 'I work on weekdays.', pt: 'dias úteis' }, { en: 'Do you train on weekends?', pt: 'pergunta' }, { en: 'I usually sleep in on Sundays.', pt: 'domingo' }] },
      { titleEn: 'Weekly schedule phrases', titlePt: 'Frases de agenda semanal', introPt: 'Monte sua semana com frases curtas conectadas.', examples: [{ en: 'Monday: meetings. Tuesday: training. Wednesday: travel.', pt: 'lista' }, { en: 'My busiest day is Thursday.', pt: 'dia mais cheio' }, { en: 'I never work on Sundays.', pt: 'nunca' }, { en: 'Every Tuesday I have a team call.', pt: 'every + dia' }] },
    ],
    languageFocus: { titleEn: 'On vs In vs At (days)', titlePt: 'On vs In vs At (dias)', items: [{ formalEn: 'In Monday I work.', naturalEn: 'On Monday / On Mondays I work.', notePt: 'Dias da semana = ON.' }, { formalEn: 'At weekends I relax.', naturalEn: 'On weekends I relax. (US)', notePt: 'Americano: on weekends. Britânico também at weekends.' }], tipPt: 'On Mondays (plural) = toda segunda. On Monday = esta/próxima segunda específica.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'In Mondays I work. / At Wednesday I train.', rightEn: 'On Mondays I work. / On Wednesdays I train.', explanationPt: 'Dias da semana usam ON — não in nem at (exceto at weekends em UK).' },
    vocabulary: { titleEn: 'Days of the week', titlePt: 'Dias da semana', words: [{ en: 'Monday', pt: 'segunda', exampleEn: 'On Mondays I have meetings.' }, { en: 'Wednesday', pt: 'quarta', exampleEn: 'On Wednesdays I train.' }, { en: 'weekend', pt: 'fim de semana', exampleEn: 'I relax on weekends.' }, { en: 'weekday', pt: 'dia útil', exampleEn: 'I work on weekdays.' }] },
    review: [{ en: 'On Mondays I have meetings.', pt: 'on + dia' }, { en: 'I train on Wednesdays.', pt: 'rotina' }, { en: 'I relax on weekends.', pt: 'weekend' }, { en: 'I never work on Sundays.', pt: 'never' }, { en: 'What do you do on Fridays?', pt: 'pergunta' }],
    readRepeat: { phrases: ['What do you do on Mondays?', 'On Mondays I usually have team meetings.', 'How about Wednesdays?', 'On Wednesdays I train in the morning.', 'Do you work on weekends?', 'Sometimes I work on Saturdays.', 'I never work on Sundays.', 'What do you usually do on Fridays?', 'Same here. I usually relax on Sundays.', 'My busiest day is Thursday.'], dialogueEn: 'What do you do on Mondays? — On Mondays I have team meetings. — How about Wednesdays? — On Wednesdays I train. — Do you work on weekends? — Sometimes on Saturdays. I never work on Sundays.' },
    mission: { headlineEn: 'You can describe your weekly schedule.', headlinePt: 'Você consegue descrever sua agenda semanal.', canDo: ['On Mondays I...', 'on weekends', 'I never work on Sundays'], production: { introPt: 'Descreva sua semana — três dias específicos e o fim de semana.', prompts: [{ speaker: 'Alex', questionEn: 'Walk me through your week.' }], fields: [{ id: 'mon', labelPt: 'Segunda', prefixEn: 'On Mondays I', placeholderEn: 'usually have team meetings.' }, { id: 'wed', labelPt: 'Quarta', prefixEn: 'On Wednesdays I', placeholderEn: 'train in the morning.' }, { id: 'fri', labelPt: 'Sexta', prefixEn: 'On Fridays I', placeholderEn: 'usually leave early.' }, { id: 'weekend', labelPt: 'Fim de semana', prefixEn: '', placeholderEn: 'I relax on weekends. I never work on Sundays.' }], exampleEn: 'On Mondays I have meetings. On Wednesdays I train. On Fridays I leave early. I relax on weekends.' } },
    practice: [
      pr('choice', 'Segunda-feira (rotina):', { options: [opt('On Mondays I have meetings.', true, 'On Mondays.'), opt('In Mondays I have meetings.', false, 'On, não In.'), opt('At Monday I have meetings.', false, 'On Monday(s).')] }),
      pr('fill_blank', 'Preposição dia:', { templateEn: '___ Wednesdays I train.', blankLabel: 'preposição', options: [opt('On', true, 'On Wednesdays.'), opt('In', false, 'In errado.'), opt('At', false, 'At errado para dia.')] }),
      pr('reorder', 'Monte rotina:', { tokens: ['meetings.', 'have', 'I', 'Mondays', 'On', 'team'], correctOrder: ['On', 'Mondays', 'I', 'have', 'team', 'meetings.'], feedbackCorrectPt: 'On Mondays I have team meetings.', feedbackWrongPt: 'On + day + I + verbo.' }),
      pr('dialogue_complete', 'Alex: Do you work on weekends?', { speaker: 'You', contextEn: 'Alex: Do you work on weekends?', options: [opt('Sometimes on Saturdays, but not always.', true, 'Natural.'), opt('I work in weekends.', false, 'On weekends.'), opt('I am work Saturday.', false, 'I work on Saturdays.')] }),
      pr('choice', 'Fim de semana:', { options: [opt('I relax on weekends.', true, 'On weekends.'), opt('I relax in weekends.', false, 'On weekends (US).'), opt('I relax at the weekend always.', false, 'Menos natural US.')] }),
      pr('fill_blank', 'Never + domingo:', { templateEn: 'I never work ___ Sundays.', blankLabel: 'preposição', options: [opt('on', true, 'On Sundays.'), opt('in', false, 'On.'), opt('at', false, 'On.')] }),
      pr('dialogue_complete', 'Alex: I never work on Sundays.', { speaker: 'You', contextEn: 'Alex: I never work on Sundays.', options: [opt('Same here. I usually relax on Sundays.', true, 'Resposta paralela.'), opt('I never am work.', false, 'I never work.'), opt('Same here. I work on Sunday always.', false, 'Contradiz.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['Fridays?', 'on', 'do', 'you', 'What'], correctOrder: ['What', 'do', 'you', 'do', 'on', 'Fridays?'], feedbackCorrectPt: 'What do you do on Fridays?', feedbackWrongPt: 'What do you do on + day?' }),
      pr('choice', 'Every + dia:', { options: [opt('Every Tuesday I have a team call.', true, 'Every Tuesday.'), opt('Every Tuesdays I have calls.', false, 'Every Tuesday singular.'), opt('All Tuesday I have call.', false, 'Every Tuesday.')] }),
      pr('fill_blank', 'Dia mais cheio:', { templateEn: 'My busiest day is ___.', blankLabel: 'dia', options: [opt('Thursday', true, 'Thursday.'), opt('Thursdays', false, 'Busiest day is Thursday (singular).'), opt('on Thursday', false, 'Is Thursday, não is on Thursday.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l04-frequency',
    moduleNumber: 2,
    goalPt: 'Adverbios de frequência — always, usually, sometimes, never e posição correta na frase.',
    intro: { titleEn: 'Frequency & habits', titlePt: 'Frequência e hábitos', bodyPt: 'Always, usually, sometimes, never — onde colocar na frase? Posição correta é essencial para soar natural.' },
    scenario: { settingEn: 'Gym · Habit conversation', scenarioPt: 'Alex e você comparam frequência de treino, estudo e hábitos saudáveis.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'How often do you train?', promptPt: 'Alex pergunta frequência de treino.', options: [opt('I usually train three times a week.', true, 'Usually antes do verbo.'), opt('I train usually three times.', false, 'Posição errada.'), opt('I am usually train three times.', false, 'Am train errado.')] },
      { speaker: 'Alex', promptEn: 'Do you ever skip breakfast?', promptPt: 'Alex pergunta sobre café da manhã.', options: [opt('Sometimes I skip it, but I usually eat something.', true, 'Sometimes + usually.'), opt('I sometimes am skip it.', false, 'Sometimes + base verb.'), opt('Sometimes I skipping it.', false, 'Skip, não skipping.')] },
      { speaker: 'Alex', promptEn: 'I never eat fast food.', promptPt: 'Alex compartilha hábito.', options: [opt('Really? I sometimes eat fast food.', true, 'Sometimes = ocasionalmente.'), opt('Really? I eat sometimes fast food.', false, 'Posição errada.'), opt('Really? I never sometimes eat.', false, 'Confuso.')] },
      { speaker: 'You', promptEn: 'How often do you study English?', promptPt: 'Sua pergunta sobre estudo.', options: [opt('How often do you study English?', true, 'How often = pergunta frequência.'), opt('How many you study English?', false, 'How often.'), opt('How often you study English?', false, 'Falta do.')] },
      { speaker: 'Alex', promptEn: 'I always review vocabulary before bed.', promptPt: 'Alex descreve hábito fixo.', options: [opt('That\'s a good habit. I sometimes do that.', true, 'Resposta natural.'), opt('I always am review vocabulary.', false, 'I always review.'), opt('That good. I review always vocabulary before.', false, 'Posição errada.')] },
    ],
    phraseBlocks: [
      { titleEn: 'always · usually · sometimes · never', titlePt: 'always · usually · sometimes · never', introPt: 'Escala de frequência — do 100% ao 0%.', examples: [{ en: 'I always check my calendar.', pt: '100%' }, { en: 'I usually train in the morning.', pt: '~80%' }, { en: 'I sometimes work from home.', pt: '~40%' }, { en: 'I never skip breakfast.', pt: '0%' }] },
      { titleEn: 'Position — before main verb', titlePt: 'Posição — antes do verbo principal', introPt: 'Always/usually/sometimes/never ANTES do verbo principal.', examples: [{ en: 'I always eat breakfast.', pt: 'correto' }, { en: 'She usually works late.', pt: '3ª pessoa' }, { en: 'We sometimes travel for work.', pt: 'plural' }, { en: 'He never complains.', pt: 'never' }] },
      { titleEn: 'Position — with to be', titlePt: 'Posição — com to be', introPt: 'Com am/is/are: advérbio DEPOIS do to be.', examples: [{ en: 'I am always tired on Mondays.', pt: 'am + always' }, { en: 'She is usually on time.', pt: 'is + usually' }, { en: 'They are sometimes late.', pt: 'are + sometimes' }, { en: 'He is never angry.', pt: 'is + never' }] },
    ],
    comparison: { titleEn: 'Verb vs to be position', titlePt: 'Posição com verbo vs to be', left: { labelEn: 'MAIN VERB · before', exampleEn: 'I always eat. / She usually works.', notePt: 'Advérbio ANTES do verbo principal.' }, right: { labelEn: 'TO BE · after', exampleEn: 'I am always tired. / She is usually late.', notePt: 'Advérbio DEPOIS de am/is/are.' }, modelEn: 'I always eat breakfast. / I am always hungry in the morning.', modelPt: 'Duas posições — memorize os dois padrões.' },
    languageFocus: { titleEn: 'How often...?', titlePt: 'How often...?', items: [{ formalEn: 'How many times you train?', naturalEn: 'How often do you train?', notePt: 'How often = com que frequência.' }, { formalEn: 'I train always in morning.', naturalEn: 'I always train in the morning.', notePt: 'Posição do advérbio.' }], tipPt: 'How often + do/does + you/he + verbo base.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'I eat always breakfast. / I always am tired.', rightEn: 'I always eat breakfast. / I am always tired.', explanationPt: 'Com verbo normal: always ANTES. Com to be: always DEPOIS de am/is/are.' },
    review: [{ en: 'I always eat breakfast.', pt: 'before verb' }, { en: 'I am always tired.', pt: 'after to be' }, { en: 'I sometimes work from home.', pt: 'sometimes' }, { en: 'I never skip training.', pt: 'never' }, { en: 'How often do you train?', pt: 'pergunta' }],
    readRepeat: { phrases: ['How often do you train?', 'I usually train three times a week.', 'Do you ever skip breakfast?', 'Sometimes I skip it.', 'I never eat fast food.', 'I sometimes eat fast food.', 'How often do you study English?', 'I always review vocabulary before bed.', 'I am always tired on Mondays.', 'She is usually on time.'], dialogueEn: 'How often do you train? — I usually train three times a week. — Do you ever skip breakfast? — Sometimes I skip it. — I never eat fast food. — I sometimes eat fast food.' },
    mission: { headlineEn: 'You can talk about frequency naturally.', headlinePt: 'Você consegue falar de frequência naturalmente.', canDo: ['always / usually / sometimes / never', 'How often...?', 'adverb position'], production: { introPt: 'Descreva frequência de treino, estudo e um hábito com to be.', prompts: [{ speaker: 'Alex', questionEn: 'How often do you train?' }], fields: [{ id: 'train', labelPt: 'Treino (usually)', prefixEn: 'I usually', placeholderEn: 'train three times a week.' }, { id: 'sometimes', labelPt: 'Algo ocasional', prefixEn: 'I sometimes', placeholderEn: 'work from home.' }, { id: 'never', labelPt: 'Algo que nunca faz', prefixEn: 'I never', placeholderEn: 'skip breakfast.' }, { id: 'tobe', labelPt: 'Com to be', prefixEn: 'I am always', placeholderEn: 'tired on Mondays.' }], exampleEn: 'I usually train three times a week. I sometimes work from home. I never skip breakfast. I am always tired on Mondays.' } },
    practice: [
      pr('choice', 'Posição correta:', { options: [opt('I always eat breakfast.', true, 'Always antes do verbo.'), opt('I eat always breakfast.', false, 'Posição errada.'), opt('I always am eat breakfast.', false, 'Am eat errado.')] }),
      pr('fill_blank', 'To be + advérbio:', { templateEn: 'I am ___ tired on Mondays.', blankLabel: 'advérbio', options: [opt('always', true, 'Am always tired.'), opt('always am', false, 'I am always.'), opt('always tired am', false, 'Ordem errada.')] }),
      pr('reorder', 'Monte frequência:', { tokens: ['a week.', 'three times', 'train', 'usually', 'I'], correctOrder: ['I', 'usually', 'train', 'three times', 'a week.'], feedbackCorrectPt: 'I usually train three times a week.', feedbackWrongPt: 'I + usually + verbo + frequência.' }),
      pr('dialogue_complete', 'Alex: I never eat fast food.', { speaker: 'You', contextEn: 'Alex: I never eat fast food.', options: [opt('Really? I sometimes eat fast food.', true, 'Sometimes ocasional.'), opt('Really? I eat sometimes fast food.', false, 'Posição errada.'), opt('Really? I never sometimes eat.', false, 'Confuso.')] }),
      pr('choice', 'Pergunta frequência:', { options: [opt('How often do you train?', true, 'How often.'), opt('How many do you train?', false, 'How often/many times.'), opt('How often you train?', false, 'Falta do.')] }),
      pr('fill_blank', 'Never posição:', { templateEn: 'She ___ complains.', blankLabel: 'advérbio', options: [opt('never', true, 'She never complains.'), opt('complains never', false, 'Never antes do verbo.'), opt('is never', false, 'Never complains — verbo principal.')] }),
      pr('dialogue_complete', 'Sometimes:', { speaker: 'You', contextEn: 'Alex: Do you ever skip breakfast?', options: [opt('Sometimes I skip it, but I usually eat something.', true, 'Sometimes + usually.'), opt('I sometimes am skip.', false, 'Sometimes skip.'), opt('Sometimes I skipping.', false, 'Skip.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['English?', 'study', 'you', 'often', 'do', 'How'], correctOrder: ['How', 'often', 'do', 'you', 'study', 'English?'], feedbackCorrectPt: 'How often do you study English?', feedbackWrongPt: 'How often + do + you + verbo.' }),
      pr('choice', '3ª pessoa usually:', { options: [opt('She usually works late.', true, 'She usually works.'), opt('She usually work late.', false, 'Works.'), opt('She works usually late.', false, 'Posição errada.')] }),
      pr('fill_blank', 'Escala — 0%:', { templateEn: 'I ___ skip training.', blankLabel: 'advérbio', options: [opt('never', true, 'Never = 0%.'), opt('always', false, 'Always = 100%.'), opt('usually', false, 'Usually = ~80%.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l05-free-time',
    moduleNumber: 2,
    goalPt: 'Falar de tempo livre — In my free time..., hobbies combinados com rotina semanal.',
    intro: { titleEn: 'Free time', titlePt: 'Tempo livre', bodyPt: 'Conecte rotina e lazer — In my free time I..., after work, on weekends. Hobbies dentro do contexto de vida real.' },
    scenario: { settingEn: 'Park bench · After work', scenarioPt: 'Alex encontra você depois do expediente e pergunta o que faz no tempo livre.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'What do you do in your free time?', promptPt: 'Alex pergunta tempo livre — pergunta clássica.', options: [opt('In my free time, I usually play soccer and read.', true, 'In my free time + rotina lazer.'), opt('In my free time I am play soccer.', false, 'I play, não am play.'), opt('In the free time I playing soccer.', false, 'I play soccer.')] },
      { speaker: 'Alex', promptEn: 'Do you have much free time during the week?', promptPt: 'Alex pergunta disponibilidade.', options: [opt('Not really. I usually relax after work.', true, 'Honesto e natural.'), opt('Not really. I am relax after work.', false, 'I relax.'), opt('Not really. I relax always after the work.', false, 'Posição always errada.')] },
      { speaker: 'Alex', promptEn: 'I usually go hiking on weekends.', promptPt: 'Alex compartilha hobby.', options: [opt('That sounds great. I sometimes go to the gym.', true, 'Resposta + sometimes.'), opt('That sounds great. I go sometimes gym.', false, 'I sometimes go to the gym.'), opt('That sounds great. I am hiking usually.', false, 'Ordem errada.')] },
      { speaker: 'You', promptEn: 'What do you do after work?', promptPt: 'Sua pergunta sobre rotina pós-trabalho.', options: [opt('What do you do after work?', true, 'Pergunta natural.'), opt('What you do after work?', false, 'Falta do.'), opt('What do you after work do?', false, 'Ordem errada.')] },
      { speaker: 'Alex', promptEn: 'I never watch TV — I prefer podcasts.', promptPt: 'Alex contrasta hábitos de mídia.', options: [opt('Interesting. I sometimes watch TV, but I usually listen to music.', true, 'Contraste com sometimes/usually.'), opt('Interesting. I watch never TV.', false, 'I never watch TV.'), opt('Interesting. I am usually listen music.', false, 'I usually listen.')] },
    ],
    phraseBlocks: [
      { titleEn: 'In my free time...', titlePt: 'No meu tempo livre...', introPt: 'Frase abertura clássica para hobbies e lazer.', examples: [{ en: 'In my free time, I play guitar.', pt: 'abertura' }, { en: 'In my free time, I usually read and cook.', pt: 'duas atividades' }, { en: 'What do you do in your free time?', pt: 'pergunta' }, { en: 'Not much free time during the week.', pt: 'pouco tempo' }] },
      { titleEn: 'after work / on weekends', titlePt: 'depois do trabalho / nos fins de semana', introPt: 'Marcadores de tempo para lazer.', examples: [{ en: 'After work, I usually go to the gym.', pt: 'pós-expediente' }, { en: 'On weekends, I relax and see friends.', pt: 'fim de semana' }, { en: 'What do you do after work?', pt: 'pergunta' }, { en: 'I sometimes cook dinner with friends.', pt: 'social' }] },
      { titleEn: 'Hobbies + routine together', titlePt: 'Hobbies + rotina juntos', introPt: 'Combine Presente Simples de rotina com hobbies do Módulo 1.', examples: [{ en: 'I work on weekdays. On weekends, I hike.', pt: 'contraste' }, { en: "I'm into photography. In my free time, I take photos.", pt: 'into + free time' }, { en: 'I usually train in the morning. Evenings are for family.', pt: 'divisão do dia' }, { en: 'I never work on Sundays. I always relax.', pt: 'never + always' }] },
    ],
    languageFocus: { titleEn: 'Free time expressions', titlePt: 'Expressões de tempo livre', items: [{ formalEn: 'In the free times I play.', naturalEn: 'In my free time, I play soccer.', notePt: 'Free time singular + my.' }, { formalEn: 'After the work I relax.', naturalEn: 'After work, I relax.', notePt: 'After work — sem the.' }], tipPt: 'In my free time + vírgula + frase completa soa educado e claro.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'In the free time I am play soccer. / After the work I relaxing.', rightEn: 'In my free time, I play soccer. / After work, I relax.', explanationPt: 'My free time (possessivo). Verbo simples: I play, I relax — não am play nem relaxing sozinho.' },
    vocabulary: { titleEn: 'Leisure words', titlePt: 'Vocabulário lazer', words: [{ en: 'free time', pt: 'tempo livre', exampleEn: 'In my free time, I read.' }, { en: 'after work', pt: 'depois do trabalho', exampleEn: 'After work, I go to the gym.' }, { en: 'relax', pt: 'relaxar', exampleEn: 'I relax on weekends.' }, { en: 'hang out', pt: 'sair/encontrar amigos', exampleEn: 'I hang out with friends.' }] },
    review: [{ en: 'In my free time, I play soccer.', pt: 'free time' }, { en: 'After work, I relax.', pt: 'after work' }, { en: 'I usually go to the gym.', pt: 'usually' }, { en: 'On weekends, I see friends.', pt: 'weekends' }, { en: 'What do you do in your free time?', pt: 'pergunta' }],
    readRepeat: { phrases: ['What do you do in your free time?', 'In my free time, I usually play soccer and read.', 'Do you have much free time during the week?', 'Not really. I usually relax after work.', 'I usually go hiking on weekends.', 'I sometimes go to the gym.', 'What do you do after work?', 'I never watch TV. I prefer podcasts.', 'After work, I listen to music.', 'On weekends, I see friends and relax.'], dialogueEn: 'What do you do in your free time? — In my free time, I play soccer and read. — Do you have much free time? — Not really. I relax after work. — I usually go hiking on weekends. — That sounds great!' },
    mission: { headlineEn: 'You can talk about free time and hobbies.', headlinePt: 'Você consegue falar de tempo livre e hobbies.', canDo: ['In my free time...', 'after work', 'on weekends'], production: { introPt: 'Descreva tempo livre, pós-trabalho e fim de semana — hobbies incluídos.', prompts: [{ speaker: 'Alex', questionEn: 'What do you do in your free time?' }, { speaker: 'Alex', questionEn: 'What do you do after work?' }], fields: [{ id: 'freeTime', labelPt: 'Tempo livre', prefixEn: 'In my free time, I', placeholderEn: 'usually play soccer and read.' }, { id: 'afterWork', labelPt: 'Depois do trabalho', prefixEn: 'After work, I', placeholderEn: 'usually go to the gym.' }, { id: 'weekend', labelPt: 'Fim de semana', prefixEn: 'On weekends, I', placeholderEn: 'relax and see friends.' }, { id: 'ask', labelPt: 'Perguntar a Alex', prefixEn: '', placeholderEn: 'What do you do after work?' }], exampleEn: 'In my free time, I play soccer. After work, I go to the gym. On weekends, I see friends.' } },
    practice: [
      pr('choice', 'Tempo livre — abertura:', { options: [opt('In my free time, I play guitar.', true, 'In my free time.'), opt('In the free time I am play guitar.', false, 'My free time + I play.'), opt('In free times I playing guitar.', false, 'Incorreto.')] }),
      pr('fill_blank', 'After work:', { templateEn: 'After work, I usually ___ to the gym.', blankLabel: 'verbo', options: [opt('go', true, 'I go to the gym.'), opt('going', false, 'Go base form.'), opt('am go', false, 'I go.')] }),
      pr('reorder', 'Monte frase lazer:', { tokens: ['soccer.', 'play', 'I', 'time,', 'free', 'my', 'In'], correctOrder: ['In', 'my', 'free', 'time,', 'I', 'play', 'soccer.'], feedbackCorrectPt: 'In my free time, I play soccer.', feedbackWrongPt: 'In my free time + I + verbo.' }),
      pr('dialogue_complete', 'Alex: What do you do in your free time?', { speaker: 'You', contextEn: 'Alex: What do you do in your free time?', options: [opt('In my free time, I usually read and cook.', true, 'Resposta completa.'), opt('In my free time I am read.', false, 'I read.'), opt('I free time read books.', false, 'Incorreto.')] }),
      pr('choice', 'After work — correto:', { options: [opt('After work, I relax.', true, 'After work sem the.'), opt('After the work, I relax.', false, 'After work (US).'), opt('After work, I am relax.', false, 'I relax.')] }),
      pr('fill_blank', 'Sometimes + gym:', { templateEn: 'I ___ go to the gym on weekdays.', blankLabel: 'advérbio', options: [opt('sometimes', true, 'I sometimes go.'), opt('go sometimes', false, 'Posição errada.'), opt('am sometimes', false, 'I sometimes go.')] }),
      pr('dialogue_complete', 'Alex: I usually go hiking on weekends.', { speaker: 'You', contextEn: 'Alex: I usually go hiking on weekends.', options: [opt('That sounds great. I sometimes go to the gym.', true, 'Resposta natural.'), opt('That sounds great. I go gym sometimes.', false, 'Go to the gym.'), opt('That sounds great. I am hiking.', false, 'Resposta diferente ok mas less complete.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['work?', 'after', 'you', 'do', 'What'], correctOrder: ['What', 'do', 'you', 'do', 'after', 'work?'], feedbackCorrectPt: 'What do you do after work?', feedbackWrongPt: 'What do you do after work?' }),
      pr('choice', 'Integração hobby + rotina:', { options: [opt('I work on weekdays. On weekends, I hike.', true, 'Rotina + lazer.'), opt('I am work weekdays. Weekends hiking.', false, 'Incompleto.'), opt('I work and in free time always hiking I.', false, 'Ordem errada.')] }),
      pr('fill_blank', 'Never + TV:', { templateEn: 'I never ___ TV. I prefer podcasts.', blankLabel: 'verbo', options: [opt('watch', true, 'I never watch TV.'), opt('watches', false, 'I watch.'), opt('watching', false, 'Watch base.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l06-others-routines',
    moduleNumber: 2,
    goalPt: 'Perguntar sobre rotina de outros — What time does she...? Does he...? — terceira pessoa em perguntas.',
    intro: { titleEn: "Other people's routines", titlePt: 'Rotinas de outras pessoas', bodyPt: 'Pergunte sobre colegas e família — What time does she start? Does he train on weekends? Rotina de terceiros com does.' },
    scenario: { settingEn: 'Office · Scheduling chat', scenarioPt: 'Alex precisa coordenar horários com colegas — você pergunta e responde sobre rotinas de he/she.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'What time does Maria start work?', promptPt: 'Alex pergunta horário de Maria (she).', options: [opt('She starts at 9 a.m.', true, 'She starts — afirmativa -s.'), opt('She start at 9 a.m.', false, 'She start errado.'), opt('She does starts at 9.', false, 'Does starts redundante.')] },
      { speaker: 'Alex', promptEn: 'Does Tom train on weekends?', promptPt: 'Alex pergunta sobre Tom (he).', options: [opt('Yes, he usually trains on Saturdays.', true, 'He trains + usually.'), opt('Yes, he usually train on Saturdays.', false, 'He train errado.'), opt('Yes, he does trains on Saturdays.', false, 'Does trains errado.')] },
      { speaker: 'Alex', promptEn: 'What does Sarah do after work?', promptPt: 'What does + she + verbo base na pergunta.', options: [opt('She usually goes to the gym.', true, 'She goes — 3ª pessoa.'), opt('She usually go to the gym.', false, 'She goes.'), opt('She is usually go to the gym.', false, 'She goes.')] },
      { speaker: 'You', promptEn: 'Does Marco work from home on Fridays?', promptPt: 'Sua pergunta sobre colega.', options: [opt('Does Marco work from home on Fridays?', true, 'Does + base verb.'), opt('Do Marco work from home on Fridays?', false, 'Marco = he = does.'), opt('Does Marco works from home on Fridays?', false, 'Does + work base.')] },
      { speaker: 'Alex', promptEn: 'She never eats lunch at the office.', promptPt: 'Alex descreve hábito de colega.', options: [opt('Really? Where does she usually eat?', true, 'Follow-up com does.'), opt('Really? Where she usually eats?', false, 'Where does she eat.'), opt('Really? Where does she usually eats?', false, 'Does + eat base.')] },
    ],
    phraseBlocks: [
      { titleEn: 'What time does she...?', titlePt: 'What time does she...?', introPt: 'Perguntar horário de terceiros — does + he/she + base verb.', examples: [{ en: 'What time does she start work?', pt: 'horário início' }, { en: 'What time does he finish?', pt: 'horário fim' }, { en: 'She starts at 9. / He finishes at 6.', pt: 'respostas' }, { en: 'What time do you start?', pt: 'contraste you = do' }] },
      { titleEn: 'Does he/she...?', titlePt: 'Does he/she...?', introPt: 'Sim/não sobre rotina de terceiros.', examples: [{ en: 'Does he train on weekends?', pt: 'pergunta' }, { en: 'Does she work from home?', pt: 'pergunta' }, { en: 'Yes, he does. / No, she doesn\'t.', pt: 'respostas curtas' }, { en: 'Does he always eat breakfast?', pt: 'com always' }] },
      { titleEn: 'What does he/she do...?', titlePt: 'What does he/she do...?', introPt: 'Pergunta aberta sobre atividade.', examples: [{ en: 'What does she do after work?', pt: 'pós-trabalho' }, { en: 'What does he do on Sundays?', pt: 'domingo' }, { en: 'She usually relaxes. / He plays soccer.', pt: 'respostas' }, { en: 'What do they do on weekends?', pt: 'plural = do' }] },
    ],
    languageFocus: { titleEn: 'Do vs Does questions', titlePt: 'Do vs Does em perguntas', items: [{ formalEn: 'What time she starts?', naturalEn: 'What time does she start?', notePt: 'She = does.' }, { formalEn: 'Does he works on Monday?', naturalEn: 'Does he work on Monday?', notePt: 'Does + verbo base.' }], tipPt: 'I/you/we/they → Do. He/she/it/Marco/Sarah → Does.' },
    mistake: { titlePt: 'Erro comum de brasileiros', wrongEn: 'What time she starts? / Does he works on weekends?', rightEn: 'What time does she start? / Does he work on weekends?', explanationPt: 'Perguntas precisam de does com he/she. Does + verbo BASE (sem -s).' },
    review: [{ en: 'What time does she start work?', pt: 'horário' }, { en: 'Does he train on weekends?', pt: 'yes/no' }, { en: 'What does she do after work?', pt: 'aberta' }, { en: 'She usually goes to the gym.', pt: 'resposta -s' }, { en: 'Yes, he does.', pt: 'resposta curta' }],
    readRepeat: { phrases: ['What time does Maria start work?', 'She starts at 9 a.m.', 'Does Tom train on weekends?', 'Yes, he usually trains on Saturdays.', 'What does Sarah do after work?', 'She usually goes to the gym.', 'Does Marco work from home on Fridays?', 'Yes, he sometimes works from home.', 'Where does she usually eat lunch?', 'She never eats at the office.'], dialogueEn: 'What time does Maria start? — She starts at 9. — Does Tom train on weekends? — Yes, he usually trains on Saturdays. — What does Sarah do after work? — She usually goes to the gym.' },
    mission: { headlineEn: "You can ask about other people's routines.", headlinePt: 'Você consegue perguntar sobre rotinas de outras pessoas.', canDo: ['What time does she...?', 'Does he...?', 'What does she do...?'], production: { introPt: 'Descreva rotina de dois colegas (he/she) e faça duas perguntas com does.', prompts: [{ speaker: 'Alex', questionEn: 'Help me understand the team schedule.' }], fields: [{ id: 'maria', labelPt: 'Maria (she) — horário', prefixEn: 'She starts at', placeholderEn: '9 a.m.' }, { id: 'tom', labelPt: 'Tom (he) — fim de semana', prefixEn: 'He usually trains on', placeholderEn: 'Saturdays.' }, { id: 'q1', labelPt: 'Pergunta 1', prefixEn: '', placeholderEn: 'Does Marco work from home on Fridays?' }, { id: 'q2', labelPt: 'Pergunta 2', prefixEn: '', placeholderEn: 'What does Sarah do after work?' }, { id: 'answer', labelPt: 'Resposta sobre Sarah', prefixEn: 'She usually', placeholderEn: 'goes to the gym.' }], exampleEn: 'She starts at 9. He trains on Saturdays. Does Marco work from home? What does Sarah do after work? She goes to the gym.' } },
    practice: [
      pr('choice', 'Horário Maria (she):', { options: [opt('What time does she start work?', true, 'Does she start.'), opt('What time she starts work?', false, 'Falta does.'), opt('What time does she starts work?', false, 'Does + start base.')] }),
      pr('fill_blank', 'Does + base:', { templateEn: 'Does he ___ on weekends?', blankLabel: 'verbo', options: [opt('train', true, 'Does he train.'), opt('trains', false, 'Does + base.'), opt('training', false, 'Train base.')] }),
      pr('dialogue_complete', 'Alex: Does Tom train on weekends?', { speaker: 'You', contextEn: 'Alex: Does Tom train on weekends?', options: [opt('Yes, he usually trains on Saturdays.', true, 'He trains.'), opt('Yes, he usually train on Saturdays.', false, 'He train errado.'), opt('Yes, he does trains.', false, 'Does trains errado.')] }),
      pr('reorder', 'Monte pergunta:', { tokens: ['after work?', 'do', 'she', 'does', 'What'], correctOrder: ['What', 'does', 'she', 'do', 'after work?'], feedbackCorrectPt: 'What does she do after work?', feedbackWrongPt: 'What + does + she + do.' }),
      pr('choice', 'Resposta she goes:', { options: [opt('She usually goes to the gym.', true, 'She goes.'), opt('She usually go to the gym.', false, 'She goes.'), opt('She usually going to gym.', false, 'She goes.')] }),
      pr('fill_blank', 'Resposta curta:', { templateEn: 'Does he work from home? — Yes, he ___.', blankLabel: 'resposta', options: [opt('does', true, 'Yes, he does.'), opt('works', false, 'Short answer: does.'), opt('do', false, 'He does.')] }),
      pr('dialogue_complete', 'Follow-up:', { speaker: 'You', contextEn: 'Alex: She never eats lunch at the office.', options: [opt('Really? Where does she usually eat?', true, 'Where does she eat.'), opt('Really? Where she eats usually?', false, 'Where does she eat.'), opt('Really? Where does she eats?', false, 'Does + eat base.')] }),
      pr('reorder', 'Monte afirmativa:', { tokens: ['9 a.m.', 'at', 'starts', 'She'], correctOrder: ['She', 'starts', 'at', '9 a.m.'], feedbackCorrectPt: 'She starts at 9 a.m.', feedbackWrongPt: 'She + starts + at + time.' }),
      pr('choice', 'Do vs Does:', { options: [opt('Does Marco work from home?', true, 'Marco = he = does.'), opt('Do Marco work from home?', false, 'Does Marco.'), opt('Does Marco works from home?', false, 'Does + work.')] }),
      pr('fill_blank', 'Plural they:', { templateEn: 'What do they ___ on weekends?', blankLabel: 'verbo', options: [opt('do', true, 'What do they do.'), opt('does', false, 'They = do.'), opt('doing', false, 'Do base.')] }),
    ],
  },
  {
    contentKey: 'elem-m02-l07-my-life-challenge',
    moduleNumber: 2,
    challenge: true,
    goalPt: 'Desafio Módulo 2 — integrar Presente Simples expandido, terceira pessoa, rotina semanal, frequência, tempo livre e rotinas de outros.',
    intro: { titleEn: 'My Life Challenge', titlePt: 'Desafio — Minha vida', bodyPt: 'Junte tudo do Módulo 2 — sua rotina, hábitos, semana, tempo livre e rotinas de colegas — numa conversa completa com Alex.' },
    scenario: { settingEn: 'Team coffee chat · Full life overview', scenarioPt: 'Alex quer entender sua vida completa — rotina diária, semana, lazer e como funciona o time.' },
    ctxChoices: [
      { speaker: 'Alex', promptEn: 'What time do you usually wake up?', promptPt: 'Passo 1 — rotina matinal.', options: [opt('I usually wake up at 6:30.', true, 'Usually + rotina.'), opt('I wake up usually at 6:30.', false, 'Posição usually.'), opt('I am usually wake up.', false, 'I usually wake up.')] },
      { speaker: 'Alex', promptEn: 'Where does Marco work?', promptPt: 'Passo 2 — terceira pessoa.', options: [opt('He works in marketing.', true, 'He works.'), opt('He work in marketing.', false, 'He works.'), opt('He is work in marketing.', false, 'I work.')] },
      { speaker: 'Alex', promptEn: 'What do you do on Mondays?', promptPt: 'Passo 3 — rotina semanal.', options: [opt('On Mondays I usually have team meetings.', true, 'On Mondays.'), opt('In Mondays I have meetings.', false, 'On Mondays.'), opt('On Monday I am have meetings.', false, 'I have.')] },
      { speaker: 'Alex', promptEn: 'How often do you train?', promptPt: 'Passo 4 — frequência.', options: [opt('I usually train three times a week.', true, 'Usually + frequência.'), opt('I train usually three times.', false, 'Posição.'), opt('I am usually train.', false, 'I usually train.')] },
      { speaker: 'Alex', promptEn: 'What do you do in your free time?', promptPt: 'Passo 5 — tempo livre.', options: [opt('In my free time, I play soccer and read.', true, 'In my free time.'), opt('In the free time I am play.', false, 'I play.'), opt('Free time I playing soccer.', false, 'Incorreto.')] },
      { speaker: 'Alex', promptEn: 'Does Sarah work from home on Fridays?', promptPt: 'Passo 6 — rotina de outros.', options: [opt('Yes, she sometimes works from home on Fridays.', true, 'She works + sometimes.'), opt('Yes, she sometimes work from home.', false, 'She works.'), opt('Yes, she does works from home.', false, 'Does works errado.')] },
    ],
    reviewBlocks: [
      { titleEn: 'Step 1 — Daily habits', titlePt: 'Passo 1 — Hábitos diários', items: [{ en: 'I usually wake up at 6.', pt: 'usually' }, { en: 'I always have coffee first.', pt: 'always' }, { en: 'I am always tired on Mondays.', pt: 'to be + always' }] },
      { titleEn: 'Step 2 — Third person', titlePt: 'Passo 2 — Terceira pessoa', items: [{ en: 'He works in marketing.', pt: 'he + -s' }, { en: 'She trains every morning.', pt: 'she + -s' }, { en: 'Does he work here?', pt: 'does + base' }] },
      { titleEn: 'Step 3 — Weekly & frequency', titlePt: 'Passo 3 — Semana e frequência', items: [{ en: 'On Mondays I have meetings.', pt: 'on + dia' }, { en: 'I relax on weekends.', pt: 'weekend' }, { en: 'I sometimes work from home.', pt: 'sometimes' }, { en: 'I never skip breakfast.', pt: 'never' }] },
      { titleEn: 'Step 4 — Free time & others', titlePt: 'Passo 4 — Tempo livre e outros', items: [{ en: 'In my free time, I play soccer.', pt: 'free time' }, { en: 'After work, I relax.', pt: 'after work' }, { en: 'What time does she start?', pt: 'pergunta horário' }, { en: 'Does he train on weekends?', pt: 'pergunta yes/no' }] },
    ],
    comparison: { titleEn: 'My life — full picture', titlePt: 'Minha vida — visão completa', left: { labelEn: 'MY ROUTINE · I', exampleEn: 'I usually... / On Mondays... / In my free time...', notePt: 'Sua vida — primeira pessoa.' }, right: { labelEn: 'THE TEAM · he/she', exampleEn: 'He works... / Does she...? / She usually...', notePt: 'Colegas — terceira pessoa + does.' }, modelEn: 'My morning → My week → My free time → Team schedules', modelPt: 'Conversa natural cobre você e o time.' },
    languageFocus: { titleEn: 'Challenge reminders', titlePt: 'Lembretes do desafio', items: [{ formalEn: 'He work. / I eat always breakfast.', naturalEn: 'He works. / I always eat breakfast.', notePt: '3ª pessoa -s + posição advérbio.' }, { formalEn: 'In Mondays / Does he works?', naturalEn: 'On Mondays / Does he work?', notePt: 'On + dia. Does + base.' }], tipPt: 'Alterne I (sua vida) com he/she (colegas) — conversa real sobre rotina de time.' },
    readRepeat: { phrases: ['What time do you usually wake up?', 'I usually wake up at 6:30.', 'Where does Marco work?', 'He works in marketing.', 'What do you do on Mondays?', 'On Mondays I have team meetings.', 'How often do you train?', 'I usually train three times a week.', 'What do you do in your free time?', 'In my free time, I play soccer.', 'Does Sarah work from home on Fridays?', 'Yes, she sometimes works from home.'], dialogueEn: 'What time do you usually wake up? — At 6:30. — Where does Marco work? — He works in marketing. — What do you do on Mondays? — Team meetings. — How often do you train? — Three times a week. — Free time? — I play soccer. — Does Sarah work from home? — Yes, sometimes on Fridays.' },
    mission: { headlineEn: 'Full Module 2 — your life and routines.', headlinePt: 'Módulo 2 completo — sua vida e rotinas.', canDo: ['I usually...', 'He/she works', 'On Mondays...', 'How often...', 'In my free time...', 'Does she...?'], production: { introPt: 'Monte visão completa da sua vida e rotinas do time — use apenas Módulo 2.', prompts: [{ speaker: 'Alex', questionEn: "Walk me through your life — routine, week, free time, and the team." }], fields: [{ id: 'morning', labelPt: 'Rotina matinal', prefixEn: 'I usually', placeholderEn: 'wake up at 6:30 and always have coffee.' }, { id: 'week', labelPt: 'Semana', prefixEn: 'On Mondays I', placeholderEn: 'have meetings. On weekends I relax.' }, { id: 'frequency', labelPt: 'Frequência', prefixEn: 'I usually', placeholderEn: 'train three times a week.' }, { id: 'freeTime', labelPt: 'Tempo livre', prefixEn: 'In my free time, I', placeholderEn: 'play soccer and read.' }, { id: 'team', labelPt: 'Colega (he/she) + pergunta', prefixEn: '', placeholderEn: 'Marco works in marketing. Does Sarah work from home on Fridays?' }], exampleEn: 'I usually wake up at 6:30. On Mondays I have meetings. I train three times a week. In my free time, I play soccer. Marco works in marketing. Does Sarah work from home?' } },
    practice: [
      pr('choice', 'Passo 1 — usually wake up:', { options: [opt('I usually wake up at 6:30.', true, 'Correto.'), opt('I wake up usually at 6:30.', false, 'Posição.'), opt('I am usually wake up.', false, 'Errado.')] }),
      pr('dialogue_complete', 'Passo 2 — Marco:', { speaker: 'You', contextEn: 'Alex: Where does Marco work?', options: [opt('He works in marketing.', true, 'He works.'), opt('He work in marketing.', false, 'He works.'), opt('He is work in marketing.', false, 'Errado.')] }),
      pr('fill_blank', 'Passo 3 — segunda:', { templateEn: '___ Mondays I have team meetings.', blankLabel: 'preposição', options: [opt('On', true, 'On Mondays.'), opt('In', false, 'On.'), opt('At', false, 'On.')] }),
      pr('dialogue_complete', 'Passo 4 — frequência:', { speaker: 'You', contextEn: 'Alex: How often do you train?', options: [opt('I usually train three times a week.', true, 'Usually + frequência.'), opt('I train usually three times.', false, 'Posição.'), opt('I am usually train.', false, 'Errado.')] }),
      pr('reorder', 'Passo 5 — free time:', { tokens: ['soccer.', 'play', 'I', 'time,', 'free', 'my', 'In'], correctOrder: ['In', 'my', 'free', 'time,', 'I', 'play', 'soccer.'], feedbackCorrectPt: 'In my free time, I play soccer.', feedbackWrongPt: 'In my free time + I + verbo.' }),
      pr('choice', 'Passo 6 — Sarah:', { options: [opt('Yes, she sometimes works from home.', true, 'She works.'), opt('Yes, she sometimes work from home.', false, 'She works.'), opt('Yes, she does works from home.', false, 'Does works errado.')] }),
      pr('fill_blank', 'Always posição:', { templateEn: 'I ___ have coffee first.', blankLabel: 'advérbio', options: [opt('always', true, 'I always have.'), opt('have always', false, 'Posição.'), opt('am always', false, 'I always have.')] }),
      pr('dialogue_complete', 'Pergunta does:', { speaker: 'You', contextEn: 'Ask about Tom training.', options: [opt('Does Tom train on weekends?', true, 'Does he train.'), opt('Do Tom train on weekends?', false, 'Does Tom.'), opt('Does Tom trains on weekends?', false, 'Does + train.')] }),
      pr('reorder', 'Monte: she starts', { tokens: ['9 a.m.', 'at', 'starts', 'She'], correctOrder: ['She', 'starts', 'at', '9 a.m.'], feedbackCorrectPt: 'She starts at 9 a.m.', feedbackWrongPt: 'She + starts + at + time.' }),
      pr('choice', 'Integração I vs He:', { options: [opt('I work every day. He works in marketing.', true, 'I base, he -s.'), opt('I works every day. He work in marketing.', false, 'Ambos errados.'), opt('I work. He work.', false, 'He works.')] }),
      pr('fill_blank', 'To be + always:', { templateEn: 'I am ___ tired on Mondays.', blankLabel: 'advérbio', options: [opt('always', true, 'Am always tired.'), opt('always am', false, 'Ordem.'), opt('never am', false, 'Am never tired — possível mas less common here.')] }),
      pr('dialogue_complete', 'Encerramento:', { speaker: 'You', contextEn: 'Alex: Great talking about your routine!', options: [opt('You too! Have a good week.', true, 'Encerramento.'), opt('What time does she start?', false, 'Reabre.'), opt('I am usually wake up.', false, 'Errado.')] }),
    ],
  },
);

mkdirSync(OUT, { recursive: true });

const results = [];
for (const def of LESSONS) {
  const player = buildPlayer(def);
  const { _meta, ...output } = player;
  const filename = `${def.contentKey}.json`;
  const filepath = join(OUT, filename);
  writeFileSync(filepath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const learnCount = output.stepScreens.learn.length;
  const practiceCount = output.practiceInteractions.length;
  const ctxCount = output.stepScreens.context.filter((s) => s.type === 'dialogue_choice').length;
  const rrPhrases = output.stepScreens.imitate[0]?.phrases?.length ?? 0;
  const hasAudioKey = JSON.stringify(output).includes('audioKey');
  const learnOk = learnCount >= 6 && learnCount <= 9;
  const practiceOk = def.challenge
    ? practiceCount === 12
    : practiceCount >= 8 && practiceCount <= 10;
  const ctxOk = ctxCount >= 4 && ctxCount <= 6;
  const rrOk = rrPhrases >= 7 && rrPhrases <= 12;

  let parsed = null;
  try {
    parsed = JSON.parse(JSON.stringify(output));
  } catch {
    parsed = null;
  }

  results.push({
    filename,
    learnCount,
    practiceCount,
    ctxCount,
    rrPhrases,
    learnOk,
    practiceOk,
    ctxOk,
    rrOk,
    validJson: parsed !== null,
    noAudioKey: !hasAudioKey,
    hasMeta: '_meta' in output,
  });
}

console.log('\n=== Elementary M1 & M2 — Player v2 generated ===\n');
for (const r of results) {
  const flags = [
    r.validJson ? 'JSON OK' : 'JSON FAIL',
    r.learnOk ? `learn ${r.learnCount} OK` : `learn ${r.learnCount} OUT OF RANGE`,
    r.practiceOk ? `practice ${r.practiceCount} OK` : `practice ${r.practiceCount} OUT OF RANGE`,
    r.ctxOk ? `ctx ${r.ctxCount} OK` : `ctx ${r.ctxCount} OUT OF RANGE`,
    r.rrOk ? `RR ${r.rrPhrases} OK` : `RR ${r.rrPhrases} OUT OF RANGE`,
    r.noAudioKey ? 'no audioKey' : 'HAS audioKey',
    r.hasMeta ? 'HAS _meta' : 'no _meta',
  ].join(' | ');
  console.log(`${r.filename}: ${flags}`);
}
console.log(`\nTotal: ${results.length} files → ${OUT}\n`);
