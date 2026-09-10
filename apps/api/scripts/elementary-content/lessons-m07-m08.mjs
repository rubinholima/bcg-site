/** Lesson definitions — Elementary Modules 7–8 */

export const LESSONS = [
  // ── MODULE 7 — Food, Health & Well-Being ──────────────────────────────
  {
    contentKey: 'elem-m07-l01-food-preferences',
    moduleNumber: 7,
    goalPt: 'Expressar preferências alimentares com mais detalhe — love, like, prefer, dislike, allergic to, vegetarian.',
    intro: {
      titleEn: 'Food preferences — detail',
      titlePt: 'Preferências alimentares — detalhe',
      bodyPt: 'No START você aprendeu I like coffee. Agora você descreve o que ama, prefere, evita ou não pode comer — com mais precisão.',
    },
    scenario: {
      settingEn: 'Team lunch · New restaurant',
      scenarioPt: 'Almoço com colegas internacionais. Cada um fala o que gosta, prefere e o que não come.',
    },
    ctxChoices: [
      {
        speaker: 'Colleague',
        promptEn: 'What do you usually eat for lunch?',
        promptPt: 'Colega pergunta sobre almoço.',
        options: [
          { labelEn: 'I usually have a salad or grilled chicken.', correct: true, feedbackPt: 'Resposta natural com preferência.' },
          { labelEn: 'I am lunch every day.', correct: false, feedbackPt: 'Verbo errado — use have ou eat.' },
          { labelEn: 'Lunch is my name.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
      {
        speaker: 'Waiter',
        promptEn: 'Do you have any dietary restrictions?',
        promptPt: 'Garçom pergunta restrições alimentares.',
        options: [
          { labelEn: "I'm vegetarian, so no meat, please.", correct: true, feedbackPt: 'Vegetarian + pedido claro.' },
          { labelEn: 'I restriction food.', correct: false, feedbackPt: 'Gramática incorreta.' },
          { labelEn: 'Yes, I am airport.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
      {
        speaker: 'Colleague',
        promptEn: 'Do you like spicy food?',
        promptPt: 'Pergunta sobre comida picante.',
        options: [
          { labelEn: "I love it! But my colleague can't eat spicy food.", correct: true, feedbackPt: 'Love + terceira pessoa.' },
          { labelEn: 'Spicy is my flight.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'I like to spicy.', correct: false, feedbackPt: 'Like + substantivo, não infinitivo.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Love / Like / Dislike / Hate',
        titlePt: 'Love / Like / Dislike / Hate',
        introPt: 'Escala de preferência — do mais forte ao mais fraco.',
        examples: [
          { en: 'I love pasta.', pt: 'Adoro massa.' },
          { en: 'I like fresh fruit.', pt: 'Gosto de fruta fresca.' },
          { en: "I don't like olives.", pt: 'Não gosto de azeitonas.' },
          { en: 'I hate cilantro.', pt: 'Odeio coentro.' },
        ],
      },
      {
        titleEn: 'Prefer & Would rather',
        titlePt: 'Preferir',
        introPt: 'Quando há escolha entre duas opções.',
        examples: [
          { en: 'I prefer tea to coffee.', pt: 'Prefiro chá a café.' },
          { en: "I'd rather have soup.", pt: 'Prefiro sopa.' },
          { en: 'She prefers fish over meat.', pt: 'Ela prefere peixe a carne.' },
        ],
      },
      {
        titleEn: 'Allergies & restrictions',
        titlePt: 'Alergias e restrições',
        introPt: 'Informações importantes em restaurantes e viagens.',
        examples: [
          { en: "I'm allergic to peanuts.", pt: 'Sou alérgico a amendoim.' },
          { en: "I can't eat dairy.", pt: 'Não posso comer laticínios.' },
          { en: "I'm vegetarian / vegan.", pt: 'Vegetariano / vegano.' },
          { en: 'No gluten, please.', pt: 'Sem glúten, por favor.' },
        ],
      },
    ],
    comparison: {
      titleEn: 'Like vs Would like',
      titlePt: 'Like vs Would like',
      left: { labelEn: 'LIKE · preferência geral', exampleEn: 'I like coffee.', notePt: 'Gosto em geral — hábito.' },
      right: { labelEn: "I'D LIKE · pedido agora", exampleEn: "I'd like a coffee, please.", notePt: 'Pedido no momento — restaurante.' },
      modelEn: 'I like... (general) · I\'d like... (order now)',
      modelPt: 'Like = gosto; Would like = quero agora.',
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I have allergy with shrimp.',
      rightEn: "I'm allergic to shrimp.",
      explanationPt: 'Alergia usa allergic to, não allergy with. I\'m allergic to + alimento.',
    },
    review: [
      { en: 'I love / like / dislike', pt: 'escala de preferência' },
      { en: 'I prefer... to...', pt: 'preferir entre opções' },
      { en: "I'm allergic to...", pt: 'alergia' },
      { en: "I'm vegetarian.", pt: 'restrição alimentar' },
    ],
    readRepeat: {
      phrases: [
        'I love Italian food.',
        "I don't like very spicy dishes.",
        'I prefer salad to fries.',
        "I'm allergic to shellfish.",
        "I'm vegetarian, so no meat, please.",
        'Do you have any vegetarian options?',
      ],
      dialogueEn:
        'What do you usually eat? — I love fresh salads. I prefer chicken to beef. — Any restrictions? — I\'m allergic to nuts. — Do you have vegetarian options? — Yes, we do!',
    },
    mission: {
      headlineEn: 'You can talk about food preferences.',
      headlinePt: 'Você consegue falar sobre preferências alimentares.',
      canDo: ['I love...', 'I prefer... to...', "I'm allergic to...", "I'm vegetarian."],
      production: {
        introPt: 'Descreva suas preferências alimentares: o que ama, prefere e alguma restrição.',
        prompts: [{ speaker: 'Colleague', questionEn: 'Tell me about your food preferences.' }],
        fields: [
          { id: 'like', labelPt: 'O que você ama/gosta', prefixEn: 'I love', placeholderEn: 'fresh fruit and grilled fish' },
          { id: 'restrict', labelPt: 'Restrição ou preferência', prefixEn: '', placeholderEn: "I'm allergic to peanuts. I prefer tea to coffee." },
        ],
        exampleEn: "I love fresh fruit. I prefer fish to red meat. I'm allergic to peanuts.",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Forma correta para alergia:', options: [
        { labelEn: "I'm allergic to peanuts.", correct: true, feedbackPt: 'Allergic to — padrão fixo.' },
        { labelEn: 'I have allergy with peanuts.', correct: false, feedbackPt: 'Preposição errada.' },
        { labelEn: 'I allergic peanuts.', correct: false, feedbackPt: 'Falta verbo to be.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Prefiro chá a café.', templateEn: 'I ___ tea to coffee.', blankLabel: 'verbo', options: [
        { labelEn: 'prefer', correct: true, feedbackPt: 'Prefer X to Y.' },
        { labelEn: 'like', correct: false, feedbackPt: 'Like não usa to para comparar.' },
        { labelEn: 'want', correct: false, feedbackPt: 'Want não compara preferências.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Não gosto de azeitonas.', tokens: ["olives.", "like", "don't", "I"], correctOrder: ['I', "don't", 'like', 'olives.'], feedbackCorrectPt: "I don't like olives.", feedbackWrongPt: "I don't + like + food." },
      { type: 'dialogue_complete', promptPt: 'Waiter: Any dietary restrictions?', speaker: 'You', contextEn: 'Waiter: Any dietary restrictions?', options: [
        { labelEn: "I'm vegetarian, so no meat, please.", correct: true, feedbackPt: 'Restrição clara.' },
        { labelEn: 'I am very hungry.', correct: false, feedbackPt: 'Não responde restrições.' },
        { labelEn: 'The check, please.', correct: false, feedbackPt: 'Conta — contexto errado.' },
      ]},
      { type: 'choice', promptPt: 'I love pasta significa:', options: [
        { labelEn: 'I really enjoy pasta.', correct: true, feedbackPt: 'Love = adoro.' },
        { labelEn: 'I want pasta now.', correct: false, feedbackPt: 'Isso seria I\'d like pasta.' },
        { labelEn: 'I am pasta.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Adoro comida italiana.', templateEn: 'I ___ Italian food.', blankLabel: 'verbo', options: [
        { labelEn: 'love', correct: true, feedbackPt: 'Love = adoro.' },
        { labelEn: 'am', correct: false, feedbackPt: 'I am Italian food — errado.' },
        { labelEn: 'have', correct: false, feedbackPt: 'Have não expressa preferência forte.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Colleague: Do you like spicy food?', speaker: 'You', contextEn: 'Colleague: Do you like spicy food?', options: [
        { labelEn: "Yes, I love it! But I can't eat too much.", correct: true, feedbackPt: 'Resposta natural.' },
        { labelEn: 'I prefer gate B12.', correct: false, feedbackPt: 'Aeroporto — contexto errado.' },
        { labelEn: 'Spicy is my reservation.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Sou alérgico a amendoim.', tokens: ['peanuts.', 'to', 'allergic', "I'm"], correctOrder: ["I'm", 'allergic', 'to', 'peanuts.'], feedbackCorrectPt: "I'm allergic to peanuts.", feedbackWrongPt: "I'm allergic to + food." },
      { type: 'choice', promptPt: 'Like vs Would like — pedido no restaurante:', options: [
        { labelEn: "I'd like the salmon, please.", correct: true, feedbackPt: 'Would like = pedido agora.' },
        { labelEn: 'I like the salmon, please.', correct: false, feedbackPt: 'Like = preferência geral, não pedido.' },
        { labelEn: 'I am like salmon.', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Waiter: Do you have vegetarian options?', speaker: 'You', contextEn: 'Waiter: Do you have vegetarian options?', options: [
        { labelEn: 'Yes, please — what do you recommend?', correct: true, feedbackPt: 'Resposta educada e útil.' },
        { labelEn: 'I hate everything.', correct: false, feedbackPt: 'Rude e não ajuda.' },
        { labelEn: 'My flight is delayed.', correct: false, feedbackPt: 'Viagem — contexto errado.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m07-l02-ordering-detail',
    moduleNumber: 7,
    goalPt: 'Fazer pedidos com modificações — without, extra, on the side, well-done, rare, allergies no pedido.',
    intro: {
      titleEn: 'Ordering with detail',
      titlePt: 'Pedidos com detalhe',
      bodyPt: 'Além de I\'d like..., você especifica como quer a comida — sem cebola, extra molho, ponto da carne, porção separada.',
    },
    scenario: {
      settingEn: 'Business dinner · Steakhouse',
      scenarioPt: 'Jantar de negócios. Você faz um pedido detalhado respeitando preferências e alergias.',
    },
    ctxChoices: [
      {
        speaker: 'Waiter',
        promptEn: 'How would you like your steak cooked?',
        promptPt: 'Garçom pergunta ponto da carne.',
        options: [
          { labelEn: 'Medium, please.', correct: true, feedbackPt: 'Medium = ao ponto.' },
          { labelEn: 'Medium flight, please.', correct: false, feedbackPt: 'Flight = voo.' },
          { labelEn: 'I am medium.', correct: false, feedbackPt: 'Pessoa não é medium.' },
        ],
      },
      {
        speaker: 'You',
        promptEn: 'Ordering with modifications',
        promptPt: 'Pedido com modificações.',
        options: [
          { labelEn: "I'd like the burger without onions, please.", correct: true, feedbackPt: 'Without = sem.' },
          { labelEn: "I'd like the burger no onionsing.", correct: false, feedbackPt: 'No onionsing não existe.' },
          { labelEn: 'Onions without burger.', correct: false, feedbackPt: 'Ordem invertida.' },
        ],
      },
      {
        speaker: 'Waiter',
        promptEn: 'Any allergies I should know about?',
        promptPt: 'Garçom pergunta alergias.',
        options: [
          { labelEn: "Yes, no nuts in my dish, please — I'm allergic.", correct: true, feedbackPt: 'Alergia + pedido claro.' },
          { labelEn: 'Yes, I am nuts.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'Allergic please menu.', correct: false, feedbackPt: 'Frase incompleta.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Modifications — without / extra / on the side',
        titlePt: 'Modificações no pedido',
        introPt: 'Peça exatamente como quer.',
        examples: [
          { en: 'Without cheese, please.', pt: 'Sem queijo.' },
          { en: 'Extra sauce on the side.', pt: 'Molho extra à parte.' },
          { en: 'No ice, please.', pt: 'Sem gelo.' },
          { en: 'Can I swap fries for salad?', pt: 'Trocar batata por salada?' },
        ],
      },
      {
        titleEn: 'How would you like it cooked?',
        titlePt: 'Ponto da carne',
        introPt: 'Comum em churrascarias e steakhouses.',
        examples: [
          { en: 'Rare / medium-rare / medium / well-done', pt: 'mal passada → bem passada' },
          { en: 'Medium, please.', pt: 'Ao ponto, por favor.' },
          { en: 'Well-done, no pink inside.', pt: 'Bem passada.' },
        ],
      },
      {
        titleEn: 'Special requests',
        titlePt: 'Pedidos especiais',
        introPt: 'Frases educadas para personalizar.',
        examples: [
          { en: 'Could I have the dressing on the side?', pt: 'Molho à parte?' },
          { en: 'Is this dish spicy?', pt: 'Este prato é picante?' },
          { en: 'Does this contain nuts?', pt: 'Contém amendoim/nozes?' },
          { en: 'Could you recommend something light?', pt: 'Algo leve?' },
        ],
      },
    ],
    languageFocus: {
      titleEn: 'On the side',
      titlePt: 'On the side — à parte',
      items: [
        { formalEn: 'Please serve the sauce separately.', naturalEn: 'Sauce on the side, please.', notePt: 'On the side = servido à parte.' },
        { formalEn: 'I would like extra vegetables.', naturalEn: 'Extra veggies, please.', notePt: 'Extra = adicional.' },
      ],
      tipPt: 'On the side é muito comum — molho, salada, batatas servidos separados do prato principal.',
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I want the steak medium rare well.',
      rightEn: 'Medium-rare, please.',
      explanationPt: 'Escolha um ponto: rare, medium-rare, medium ou well-done. Não combine todos.',
    },
    review: [
      { en: 'without / extra / on the side', pt: 'modificações' },
      { en: 'medium / well-done', pt: 'ponto da carne' },
      { en: 'Does this contain...?', pt: 'perguntar ingredientes' },
      { en: 'No nuts, please.', pt: 'alergia no pedido' },
    ],
    readRepeat: {
      phrases: [
        "I'd like the steak, medium, please.",
        'Without onions, please.',
        'Extra vegetables on the side.',
        'Does this contain dairy?',
        'Could I have the sauce on the side?',
        'No nuts in my dish, please.',
      ],
      dialogueEn:
        'Are you ready to order? — I\'d like the steak, medium, please. Without onions. — Sauce on the side? — Yes, please. — Any allergies? — No nuts, please. — Perfect!',
    },
    mission: {
      headlineEn: 'You can order with specific details.',
      headlinePt: 'Você consegue pedir com detalhes específicos.',
      canDo: ['Without..., please.', 'Medium / well-done.', 'On the side.', 'Does this contain...?'],
      production: {
        introPt: 'Faça um pedido completo com pelo menos duas modificações.',
        prompts: [{ speaker: 'Waiter', questionEn: 'What can I get for you?' }],
        fields: [
          { id: 'order', labelPt: 'Pedido principal', prefixEn: "I'd like", placeholderEn: 'the grilled chicken, medium, please' },
          { id: 'mods', labelPt: 'Modificações', prefixEn: '', placeholderEn: 'Without cheese. Extra vegetables on the side. No nuts, please.' },
        ],
        exampleEn: "I'd like the grilled chicken, please. Without cheese. Extra vegetables on the side. No nuts, please.",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Sem cebola no pedido:', options: [
        { labelEn: 'Without onions, please.', correct: true, feedbackPt: 'Without + ingrediente.' },
        { labelEn: 'No onioning please.', correct: false, feedbackPt: 'Forma incorreta.' },
        { labelEn: 'Onions without me.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Ao ponto, por favor.', templateEn: '___, please.', blankLabel: 'ponto', options: [
        { labelEn: 'Medium', correct: true, feedbackPt: 'Medium = ao ponto.' },
        { labelEn: 'Middle', correct: false, feedbackPt: 'Middle não é ponto de carne.' },
        { labelEn: 'Center', correct: false, feedbackPt: 'Center = centro.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Molho à parte, por favor.', tokens: ['please.', 'side,', 'the', 'on', 'Sauce'], correctOrder: ['Sauce', 'on', 'the', 'side,', 'please.'], feedbackCorrectPt: 'Sauce on the side, please.', feedbackWrongPt: 'On the side = à parte.' },
      { type: 'dialogue_complete', promptPt: 'Waiter: How would you like your steak?', speaker: 'You', contextEn: 'Waiter: How would you like your steak cooked?', options: [
        { labelEn: 'Medium-rare, please.', correct: true, feedbackPt: 'Ponto válido.' },
        { labelEn: 'Airport B12, please.', correct: false, feedbackPt: 'Aeroporto — contexto errado.' },
        { labelEn: 'I am reservation.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'choice', promptPt: 'Perguntar se contém amendoim:', options: [
        { labelEn: 'Does this contain nuts?', correct: true, feedbackPt: 'Does this contain...?' },
        { labelEn: 'Is this nuts have?', correct: false, feedbackPt: 'Gramática incorreta.' },
        { labelEn: 'Nuts is here?', correct: false, feedbackPt: 'Forma não natural.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Batatas extra, por favor.', templateEn: '___ fries, please.', blankLabel: 'extra', options: [
        { labelEn: 'Extra', correct: true, feedbackPt: 'Extra = adicional.' },
        { labelEn: 'Morely', correct: false, feedbackPt: 'Morely não existe.' },
        { labelEn: 'Addition', correct: false, feedbackPt: 'Addition soa formal demais aqui.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Waiter: Any allergies?', speaker: 'You', contextEn: 'Waiter: Any allergies I should know about?', options: [
        { labelEn: "Yes — no nuts in my dish, please. I'm allergic.", correct: true, feedbackPt: 'Alergia + pedido.' },
        { labelEn: 'Yes, I am well-done.', correct: false, feedbackPt: 'Sem sentido.' },
        { labelEn: 'Medium on the side.', correct: false, feedbackPt: 'Mistura conceitos.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Sem queijo, por favor.', tokens: ['please.', 'cheese,', 'Without'], correctOrder: ['Without', 'cheese,', 'please.'], feedbackCorrectPt: 'Without cheese, please.', feedbackWrongPt: 'Without + ingredient.' },
      { type: 'choice', promptPt: 'On the side significa:', options: [
        { labelEn: 'Served separately.', correct: true, feedbackPt: 'À parte do prato principal.' },
        { labelEn: 'On the left side of the table.', correct: false, feedbackPt: 'Não é posição na mesa.' },
        { labelEn: 'Outside the restaurant.', correct: false, feedbackPt: 'Não é localização.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Waiter: What can I get for you?', speaker: 'You', contextEn: 'Waiter: What can I get for you?', options: [
        { labelEn: "I'd like the salmon with extra vegetables. Sauce on the side, please.", correct: true, feedbackPt: 'Pedido detalhado completo.' },
        { labelEn: 'Where is my gate?', correct: false, feedbackPt: 'Aeroporto — contexto errado.' },
        { labelEn: 'I hate traveling.', correct: false, feedbackPt: 'Fora de contexto.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m07-l03-healthy-habits',
    moduleNumber: 7,
    goalPt: 'Falar sobre hábitos saudáveis — exercise, sleep, drink water, eat vegetables, avoid junk food.',
    intro: {
      titleEn: 'Healthy habits',
      titlePt: 'Hábitos saudáveis',
      bodyPt: 'Conversas do dia a dia sobre rotina saudável — não é conselho médico, é vocabulário para falar sobre bem-estar.',
    },
    scenario: {
      settingEn: 'Office wellness chat · Monday morning',
      scenarioPt: 'Colegas conversam sobre rotina saudável depois do fim de semana.',
    },
    ctxChoices: [
      {
        speaker: 'Colleague',
        promptEn: 'How do you stay healthy during the week?',
        promptPt: 'Colega pergunta sobre saúde na semana.',
        options: [
          { labelEn: 'I try to exercise three times a week and sleep eight hours.', correct: true, feedbackPt: 'Hábitos concretos.' },
          { labelEn: 'I healthy every day am.', correct: false, feedbackPt: 'Ordem e verbo errados.' },
          { labelEn: 'Health is my reservation.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
      {
        speaker: 'You',
        promptEn: 'Talking about diet',
        promptPt: 'Falando sobre alimentação.',
        options: [
          { labelEn: 'I eat more vegetables and try to avoid junk food.', correct: true, feedbackPt: 'Eat + avoid — padrão natural.' },
          { labelEn: 'I eat junk food every day more.', correct: false, feedbackPt: 'Ordem estranha — mas o erro principal é não usar avoid.' },
          { labelEn: 'Vegetables is my flight.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Exercise & activity',
        titlePt: 'Exercício e atividade',
        introPt: 'Verbos comuns para rotina física.',
        examples: [
          { en: 'I exercise three times a week.', pt: 'Me exercito 3x por semana.' },
          { en: 'I go for a walk after lunch.', pt: 'Caminho depois do almoço.' },
          { en: 'I try to stay active.', pt: 'Tento me manter ativo.' },
        ],
      },
      {
        titleEn: 'Sleep & rest',
        titlePt: 'Sono e descanso',
        introPt: 'Falar sobre descanso.',
        examples: [
          { en: 'I sleep about eight hours.', pt: 'Durmo cerca de 8 horas.' },
          { en: 'I need more rest.', pt: 'Preciso descansar mais.' },
          { en: 'I feel better when I sleep well.', pt: 'Me sinto melhor quando durmo bem.' },
        ],
      },
      {
        titleEn: 'Food & drink habits',
        titlePt: 'Hábitos alimentares',
        introPt: 'Escolhas do dia a dia.',
        examples: [
          { en: 'I drink a lot of water.', pt: 'Bebo muita água.' },
          { en: 'I eat more fruit and vegetables.', pt: 'Como mais frutas e vegetais.' },
          { en: 'I try to avoid junk food.', pt: 'Evito fast food.' },
          { en: 'I cut down on sugar.', pt: 'Reduzi açúcar.' },
        ],
      },
    ],
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I make gym every day.',
      rightEn: 'I go to the gym every day. / I work out every day.',
      explanationPt: 'Make gym não existe. Go to the gym ou work out.',
    },
    review: [
      { en: 'I exercise / go for a walk', pt: 'atividade física' },
      { en: 'I sleep eight hours.', pt: 'sono' },
      { en: 'I drink a lot of water.', pt: 'hidratação' },
      { en: 'I try to avoid junk food.', pt: 'evitar fast food' },
    ],
    readRepeat: {
      phrases: [
        'I exercise three times a week.',
        'I try to sleep eight hours.',
        'I drink a lot of water every day.',
        'I eat more vegetables.',
        'I try to avoid junk food.',
        'I feel better when I have healthy habits.',
      ],
      dialogueEn:
        'How do you stay healthy? — I exercise regularly and drink lots of water. — What about food? — I eat more vegetables and try to avoid junk food. — Good habits!',
    },
    mission: {
      headlineEn: 'You can talk about healthy habits.',
      headlinePt: 'Você consegue falar sobre hábitos saudáveis.',
      canDo: ['I exercise...', 'I sleep...', 'I drink...', 'I try to avoid...'],
      production: {
        introPt: 'Descreva dois hábitos saudados que você tem ou quer ter.',
        prompts: [{ speaker: 'Colleague', questionEn: 'What healthy habits do you have?' }],
        fields: [
          { id: 'activity', labelPt: 'Atividade / exercício', prefixEn: 'I', placeholderEn: 'exercise three times a week and go for walks' },
          { id: 'food', labelPt: 'Alimentação / sono', prefixEn: 'I', placeholderEn: 'drink a lot of water and try to avoid junk food' },
        ],
        exampleEn: 'I exercise three times a week. I drink a lot of water and eat more vegetables. I try to avoid junk food.',
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Forma natural para academia:', options: [
        { labelEn: 'I go to the gym twice a week.', correct: true, feedbackPt: 'Go to the gym — padrão.' },
        { labelEn: 'I make gym twice a week.', correct: false, feedbackPt: 'Make gym não existe.' },
        { labelEn: 'I do gyming.', correct: false, feedbackPt: 'Forma incorreta.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Evito fast food.', templateEn: 'I try to ___ junk food.', blankLabel: 'verbo', options: [
        { labelEn: 'avoid', correct: true, feedbackPt: 'Avoid = evitar.' },
        { labelEn: 'escape', correct: false, feedbackPt: 'Escape é fugir — menos natural aqui.' },
        { labelEn: 'leave', correct: false, feedbackPt: 'Leave junk food — estranho.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Bebo muita água.', tokens: ['water.', 'of', 'lot', 'a', 'drink', 'I'], correctOrder: ['I', 'drink', 'a', 'lot', 'of', 'water.'], feedbackCorrectPt: 'I drink a lot of water.', feedbackWrongPt: 'A lot of + líquido.' },
      { type: 'dialogue_complete', promptPt: 'Colleague: How much do you sleep?', speaker: 'You', contextEn: 'Colleague: How much do you sleep?', options: [
        { labelEn: 'About eight hours, usually.', correct: true, feedbackPt: 'Resposta natural.' },
        { labelEn: 'I sleep the airport.', correct: false, feedbackPt: 'Sem sentido.' },
        { labelEn: 'Sleep is my check.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'choice', promptPt: 'I cut down on sugar significa:', options: [
        { labelEn: 'I reduced sugar.', correct: true, feedbackPt: 'Cut down on = reduzir.' },
        { labelEn: 'I cut sugar with scissors.', correct: false, feedbackPt: 'Interpretação literal errada.' },
        { labelEn: 'I eat more sugar.', correct: false, feedbackPt: 'Oposto.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Como mais vegetais.', templateEn: 'I eat ___ vegetables.', blankLabel: 'quantificador', options: [
        { labelEn: 'more', correct: true, feedbackPt: 'More = mais.' },
        { labelEn: 'many', correct: false, feedbackPt: 'Many vegetables ok, mas more é comparativo natural.' },
        { labelEn: 'much', correct: false, feedbackPt: 'Much com vegetables — menos comum.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Caminho depois do almoço.', tokens: ['lunch.', 'after', 'walk', 'a', 'for', 'go', 'I'], correctOrder: ['I', 'go', 'for', 'a', 'walk', 'after', 'lunch.'], feedbackCorrectPt: 'I go for a walk after lunch.', feedbackWrongPt: 'Go for a walk = caminhar.' },
      { type: 'dialogue_complete', promptPt: 'Colleague: Do you exercise?', speaker: 'You', contextEn: 'Colleague: Do you exercise regularly?', options: [
        { labelEn: 'Yes, I try to stay active — I walk and go to the gym.', correct: true, feedbackPt: 'Resposta completa.' },
        { labelEn: 'I am exercise.', correct: false, feedbackPt: 'Gramática incorreta.' },
        { labelEn: 'Exercise is delayed.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'choice', promptPt: 'Stay active significa:', options: [
        { labelEn: 'Keep moving / be physically active.', correct: true, feedbackPt: 'Manter-se ativo.' },
        { labelEn: 'Stay at the activity room forever.', correct: false, feedbackPt: 'Interpretação errada.' },
        { labelEn: 'Activate your phone.', correct: false, feedbackPt: 'Contexto errado.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Colleague: Any tips for eating better?', speaker: 'You', contextEn: 'Colleague: Any tips for eating better?', options: [
        { labelEn: 'I eat more fruit and try to avoid junk food.', correct: true, feedbackPt: 'Dica prática e natural.' },
        { labelEn: 'I cancel my reservation.', correct: false, feedbackPt: 'Viagem — contexto errado.' },
        { labelEn: 'Gate B12, please.', correct: false, feedbackPt: 'Aeroporto — contexto errado.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m07-l04-feel-symptoms',
    moduleNumber: 7,
    goalPt: 'Dizer como se sente e pedir ajuda básica na farmácia — I don\'t feel well, headache, sore throat. SEM conselho médico.',
    intro: {
      titleEn: 'How you feel & pharmacy basics',
      titlePt: 'Como você se sente e farmácia',
      bodyPt: 'Você aprende a dizer que não está bem e pedir produtos comuns na farmácia. Isso NÃO substitui médico — é só comunicação do dia a dia.',
    },
    scenario: {
      settingEn: 'Pharmacy · Feeling unwell',
      scenarioPt: 'Você não está se sentindo bem durante uma viagem e vai à farmácia pedir algo básico.',
    },
    ctxChoices: [
      {
        speaker: 'Pharmacist',
        promptEn: 'How can I help you?',
        promptPt: 'Farmacêutico pergunta como ajudar.',
        options: [
          { labelEn: "I don't feel well. I have a headache.", correct: true, feedbackPt: 'Sintoma claro — não pede diagnóstico.' },
          { labelEn: 'I am doctor now please.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'Prescribe me surgery.', correct: false, feedbackPt: 'Fora do escopo — farmácia básica.' },
        ],
      },
      {
        speaker: 'Colleague',
        promptEn: 'You look tired. Are you OK?',
        promptPt: 'Colega percebe que você não está bem.',
        options: [
          { labelEn: "Not really — I have a sore throat and I feel tired.", correct: true, feedbackPt: 'Descreve sintomas simples.' },
          { labelEn: 'I am OK because I am hospital.', correct: false, feedbackPt: 'Gramática incorreta.' },
          { labelEn: 'Yes, I am gate B12.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
      {
        speaker: 'Pharmacist',
        promptEn: 'Do you need anything for pain?',
        promptPt: 'Farmacêutico pergunta sobre dor.',
        options: [
          { labelEn: 'Something for a headache, please.', correct: true, feedbackPt: 'Pedido básico na farmácia.' },
          { labelEn: 'I need a new passport.', correct: false, feedbackPt: 'Passaporte — contexto errado.' },
          { labelEn: 'Pain is my hotel.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: "I don't feel well",
        titlePt: 'Não me sinto bem',
        introPt: 'Frases para dizer que algo não está ok — sem dramatizar.',
        examples: [
          { en: "I don't feel well.", pt: 'Não me sinto bem.' },
          { en: 'I feel sick.', pt: 'Me sinto mal/enjoado.' },
          { en: 'I feel tired / dizzy.', pt: 'Cansado / tonto.' },
          { en: 'I think I have a cold.', pt: 'Acho que estou resfriado.' },
        ],
      },
      {
        titleEn: 'Common symptoms — vocabulary only',
        titlePt: 'Sintomas comuns — só vocabulário',
        introPt: 'Palavras para descrever — não é diagnóstico.',
        examples: [
          { en: 'headache', pt: 'dor de cabeça' },
          { en: 'sore throat', pt: 'garganta inflamada' },
          { en: 'runny nose / cough', pt: 'nariz escorrendo / tosse' },
          { en: 'stomachache', pt: 'dor de estômago' },
        ],
      },
      {
        titleEn: 'At the pharmacy',
        titlePt: 'Na farmácia',
        introPt: 'Pedidos básicos — produtos comuns de balcão.',
        examples: [
          { en: 'Something for a headache, please.', pt: 'Algo para dor de cabeça.' },
          { en: 'Do you have cough drops?', pt: 'Tem pastilha para tosse?' },
          { en: 'I need bandages.', pt: 'Preciso de curativos.' },
          { en: 'How do I take this?', pt: 'Como tomar/usar?' },
        ],
      },
    ],
    languageFocus: {
      titleEn: 'Have vs Feel',
      titlePt: 'Have vs Feel com sintomas',
      items: [
        { formalEn: 'I am experiencing a headache.', naturalEn: 'I have a headache.', notePt: 'Have a headache — muito comum.' },
        { formalEn: 'I feel unwell in general.', naturalEn: "I don't feel well.", notePt: 'Feel well/unwell = estado geral.' },
      ],
      tipPt: 'Have a + sintoma (have a headache). Feel + adjetivo (feel tired, feel sick).',
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I am with headache.',
      rightEn: 'I have a headache.',
      explanationPt: 'Em inglês: I have a headache / a sore throat. Não I am with headache.',
    },
    review: [
      { en: "I don't feel well.", pt: 'não estou bem' },
      { en: 'I have a headache.', pt: 'dor de cabeça' },
      { en: 'sore throat / cough', pt: 'garganta / tosse' },
      { en: 'Something for..., please.', pt: 'pedido na farmácia' },
    ],
    readRepeat: {
      phrases: [
        "I don't feel well today.",
        'I have a headache.',
        'My throat is sore.',
        'I think I have a cold.',
        'Something for a headache, please.',
        'How do I take this?',
      ],
      dialogueEn:
        'How can I help? — I don\'t feel well. I have a headache. — Something for pain? — Yes, please. — Here you go. Take with water. — Thank you!',
    },
    mission: {
      headlineEn: 'You can describe how you feel and ask at a pharmacy.',
      headlinePt: 'Você consegue dizer como se sente e pedir na farmácia.',
      canDo: ["I don't feel well.", 'I have a headache.', 'Something for..., please.', 'How do I take this?'],
      production: {
        introPt: 'Simule: diga que não está bem e peça algo básico na farmácia. Sem pedir diagnóstico médico.',
        prompts: [
          { speaker: 'Colleague', questionEn: 'Are you OK? You look tired.' },
          { speaker: 'Pharmacist', questionEn: 'How can I help you?' },
        ],
        fields: [
          { id: 'feel', labelPt: 'Como se sente', prefixEn: '', placeholderEn: "I don't feel well. I have a headache and I feel tired." },
          { id: 'pharmacy', labelPt: 'Pedido na farmácia', prefixEn: '', placeholderEn: 'Something for a headache, please. How do I take this?' },
        ],
        exampleEn: "I don't feel well — I have a headache. Something for a headache, please. How do I take this?",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Dor de cabeça em inglês:', options: [
        { labelEn: 'I have a headache.', correct: true, feedbackPt: 'Have a headache — padrão.' },
        { labelEn: 'I am with headache.', correct: false, feedbackPt: 'With headache — erro comum BR.' },
        { labelEn: 'My head is head.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Não me sinto bem.', templateEn: "I don't ___ well.", blankLabel: 'verbo', options: [
        { labelEn: 'feel', correct: true, feedbackPt: 'Feel well = sentir-se bem.' },
        { labelEn: 'am', correct: false, feedbackPt: "I don't am — incorreto." },
        { labelEn: 'have', correct: false, feedbackPt: 'Have well não funciona aqui.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Algo para dor de cabeça, por favor.', tokens: ['please.', 'headache,', 'a', 'for', 'Something'], correctOrder: ['Something', 'for', 'a', 'headache,', 'please.'], feedbackCorrectPt: 'Something for a headache, please.', feedbackWrongPt: 'Something for a + symptom.' },
      { type: 'dialogue_complete', promptPt: 'Pharmacist: How can I help?', speaker: 'You', contextEn: 'Pharmacist: How can I help you?', options: [
        { labelEn: "I don't feel well. I have a sore throat.", correct: true, feedbackPt: 'Sintoma + pedido implícito.' },
        { labelEn: 'I need surgery now.', correct: false, feedbackPt: 'Fora do escopo farmácia básica.' },
        { labelEn: 'My gate is B12.', correct: false, feedbackPt: 'Aeroporto — contexto errado.' },
      ]},
      { type: 'choice', promptPt: 'Sore throat significa:', options: [
        { labelEn: 'Painful / irritated throat.', correct: true, feedbackPt: 'Garganta inflamada/dolorida.' },
        { labelEn: 'A throat that is angry.', correct: false, feedbackPt: 'Interpretação errada.' },
        { labelEn: 'A soft throat.', correct: false, feedbackPt: 'Sore = dolorido, não macio.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Acho que estou resfriado.', templateEn: 'I think I ___ a cold.', blankLabel: 'verbo', options: [
        { labelEn: 'have', correct: true, feedbackPt: 'Have a cold — padrão.' },
        { labelEn: 'am', correct: false, feedbackPt: 'I am a cold — errado.' },
        { labelEn: 'make', correct: false, feedbackPt: 'Make a cold — errado.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Colleague: Are you OK?', speaker: 'You', contextEn: 'Colleague: You look tired. Are you OK?', options: [
        { labelEn: "Not really — I don't feel well. I think I have a cold.", correct: true, feedbackPt: 'Resposta honesta e clara.' },
        { labelEn: 'Yes, I am pharmacy.', correct: false, feedbackPt: 'Sem sentido.' },
        { labelEn: 'I prefer tea to coffee.', correct: false, feedbackPt: 'Preferências — contexto errado.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Como tomar isso?', tokens: ['this?', 'take', 'I', 'do', 'How'], correctOrder: ['How', 'do', 'I', 'take', 'this?'], feedbackCorrectPt: 'How do I take this?', feedbackWrongPt: 'How do I take this?' },
      { type: 'choice', promptPt: 'Esta lição NÃO ensina:', options: [
        { labelEn: 'Medical diagnosis or treatment advice.', correct: true, feedbackPt: 'Correto — só comunicação básica.' },
        { labelEn: 'How to say I have a headache.', correct: false, feedbackPt: 'Isso ensinamos sim.' },
        { labelEn: 'Pharmacy requests.', correct: false, feedbackPt: 'Isso ensinamos sim.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Pharmacist: Do you need anything for pain?', speaker: 'You', contextEn: 'Pharmacist: Do you need anything for pain?', options: [
        { labelEn: 'Something for a headache, please.', correct: true, feedbackPt: 'Pedido básico.' },
        { labelEn: 'I want a hotel room.', correct: false, feedbackPt: 'Hotel — contexto errado.' },
        { labelEn: 'Cancel my flight.', correct: false, feedbackPt: 'Viagem — contexto errado.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m07-l05-should-advice',
    moduleNumber: 7,
    goalPt: 'Dar e receber conselhos do dia a dia com should / shouldn\'t — rotina, descanso, hábitos. Não é conselho médico.',
    intro: {
      titleEn: "Should / shouldn't — everyday advice",
      titlePt: 'Should / shouldn\'t — conselhos do dia a dia',
      bodyPt: 'Should e shouldn\'t para sugestões simples — descansar, beber água, não exagerar. Conselhos cotidianos entre amigos e colegas.',
    },
    scenario: {
      settingEn: 'Friend chat · After a long week',
      scenarioPt: 'Um amigo parece exausto. Vocês trocam conselhos simples sobre descanso e hábitos.',
    },
    ctxChoices: [
      {
        speaker: 'Friend',
        promptEn: "I'm so tired. I worked late every night this week.",
        promptPt: 'Amigo reclama de cansaço.',
        options: [
          { labelEn: 'You should get more rest this weekend.', correct: true, feedbackPt: 'Should + verbo base — conselho.' },
          { labelEn: 'You should to rest more.', correct: false, feedbackPt: 'Should + base, sem to.' },
          { labelEn: 'You should resting now.', correct: false, feedbackPt: 'Should + base, não -ing.' },
        ],
      },
      {
        speaker: 'You',
        promptEn: 'Giving friendly advice',
        promptPt: 'Dando conselho amigável.',
        options: [
          { labelEn: "You shouldn't skip meals — you should eat regularly.", correct: true, feedbackPt: "Shouldn't + should — contraste." },
          { labelEn: "You shouldn't to skip meals.", correct: false, feedbackPt: 'Shouldn\'t + base, sem to.' },
          { labelEn: 'You should not eating.', correct: false, feedbackPt: 'Not + -ing — errado após should.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Should — soft advice',
        titlePt: 'Should — conselho suave',
        introPt: 'Mais suave que must — sugestão, não ordem.',
        examples: [
          { en: 'You should rest more.', pt: 'Você deveria descansar mais.' },
          { en: 'You should drink more water.', pt: 'Deveria beber mais água.' },
          { en: 'I think you should take a break.', pt: 'Acho que deveria pausar.' },
        ],
      },
      {
        titleEn: "Shouldn't — what to avoid",
        titlePt: "Shouldn't — o que evitar",
        introPt: 'Conselho negativo — hábitos ruins.',
        examples: [
          { en: "You shouldn't work every weekend.", pt: 'Não deveria trabalhar todo fim de semana.' },
          { en: "You shouldn't skip breakfast.", pt: 'Não pule o café da manhã.' },
          { en: "You shouldn't stay up so late.", pt: 'Não deveria dormir tão tarde.' },
        ],
      },
      {
        titleEn: 'Asking for & responding to advice',
        titlePt: 'Pedir e responder conselhos',
        introPt: 'Frases úteis em conversa.',
        examples: [
          { en: 'What should I do?', pt: 'O que devo fazer?' },
          { en: 'Do you think I should...?', pt: 'Acha que eu deveria...?' },
          { en: "That's a good idea.", pt: 'Boa ideia.' },
          { en: "Maybe you're right.", pt: 'Talvez você tenha razão.' },
        ],
      },
    ],
    comparison: {
      titleEn: 'Should vs Must',
      titlePt: 'Should vs Must',
      left: { labelEn: 'SHOULD · conselho', exampleEn: 'You should rest.', notePt: 'Sugestão — pode ignorar.' },
      right: { labelEn: 'MUST · obrigação forte', exampleEn: 'You must wear a seatbelt.', notePt: 'Regra/obrigação — mais forte.' },
      modelEn: 'should (advice) · must (rule/requirement)',
      modelPt: 'Should = conselho amigável. Must = regra ou exigência.',
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'You should to drink water.',
      rightEn: 'You should drink water.',
      explanationPt: 'Should + verbo base (drink, rest, eat). Nunca should to.',
    },
    review: [
      { en: 'You should rest.', pt: 'conselho positivo' },
      { en: "You shouldn't skip meals.", pt: 'conselho negativo' },
      { en: 'What should I do?', pt: 'pedir conselho' },
      { en: "That's a good idea.", pt: 'aceitar conselho' },
    ],
    readRepeat: {
      phrases: [
        'You should get more rest.',
        "You shouldn't work so late.",
        'You should drink more water.',
        "You shouldn't skip breakfast.",
        'What should I do?',
        "That's a good idea — maybe you're right.",
      ],
      dialogueEn:
        "I'm exhausted. — You should rest this weekend. You shouldn't work every night. — What should I do? — Take a break. Drink more water. — That's a good idea. Thanks!",
    },
    mission: {
      headlineEn: 'You can give and receive everyday advice.',
      headlinePt: 'Você consegue dar e receber conselhos do dia a dia.',
      canDo: ['You should...', "You shouldn't...", 'What should I do?', "That's a good idea."],
      production: {
        introPt: 'Dê dois conselhos amigáveis a alguém cansado — um should e um shouldn\'t.',
        prompts: [{ speaker: 'Friend', questionEn: "I'm exhausted. What should I do?" }],
        fields: [
          { id: 'should', labelPt: 'Conselho positivo (should)', prefixEn: 'You should', placeholderEn: 'get more rest and drink more water' },
          { id: 'shouldnt', labelPt: 'Conselho negativo (shouldn\'t)', prefixEn: "You shouldn't", placeholderEn: 'stay up so late every night' },
        ],
        exampleEn: "You should get more rest and drink water. You shouldn't work late every night.",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Forma correta após should:', options: [
        { labelEn: 'You should drink water.', correct: true, feedbackPt: 'Should + base.' },
        { labelEn: 'You should to drink water.', correct: false, feedbackPt: 'Sem to após should.' },
        { labelEn: 'You should drinking water.', correct: false, feedbackPt: 'Sem -ing após should.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Você deveria descansar mais.', templateEn: 'You should ___ more.', blankLabel: 'verbo', options: [
        { labelEn: 'rest', correct: true, feedbackPt: 'Rest = descansar.' },
        { labelEn: 'to rest', correct: false, feedbackPt: 'Sem to.' },
        { labelEn: 'resting', correct: false, feedbackPt: 'Sem -ing.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Não deveria dormir tão tarde.', tokens: ['late.', 'so', 'up', 'stay', "shouldn't", 'You'], correctOrder: ['You', "shouldn't", 'stay', 'up', 'so', 'late.'], feedbackCorrectPt: "You shouldn't stay up so late.", feedbackWrongPt: "Shouldn't + base verb." },
      { type: 'dialogue_complete', promptPt: 'Friend: What should I do?', speaker: 'You', contextEn: "Friend: I'm tired. What should I do?", options: [
        { labelEn: 'You should take a break and get some rest.', correct: true, feedbackPt: 'Conselho prático.' },
        { labelEn: 'You must is rest.', correct: false, feedbackPt: 'Gramática incorreta.' },
        { labelEn: 'You should to the airport.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'choice', promptPt: 'Should vs Must — conselho amigável:', options: [
        { labelEn: 'You should try to sleep earlier.', correct: true, feedbackPt: 'Should = sugestão.' },
        { labelEn: 'You must try to sleep earlier.', correct: false, feedbackPt: 'Must soa como ordem — menos amigável.' },
        { labelEn: 'You should must sleep.', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Não pule o café da manhã.', templateEn: "You shouldn't ___ breakfast.", blankLabel: 'verbo', options: [
        { labelEn: 'skip', correct: true, feedbackPt: 'Skip = pular.' },
        { labelEn: 'skipping', correct: false, feedbackPt: 'Base form after shouldn\'t.' },
        { labelEn: 'to skip', correct: false, feedbackPt: 'Sem to.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Friend gives advice. You agree:', speaker: 'You', contextEn: 'Friend: You should drink more water.', options: [
        { labelEn: "That's a good idea. Maybe you're right.", correct: true, feedbackPt: 'Aceitar conselho naturalmente.' },
        { labelEn: 'You should my gate.', correct: false, feedbackPt: 'Sem sentido.' },
        { labelEn: 'I am water.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: O que devo fazer?', tokens: ['do?', 'I', 'should', 'What'], correctOrder: ['What', 'should', 'I', 'do?'], feedbackCorrectPt: 'What should I do?', feedbackWrongPt: 'What should I do?' },
      { type: 'choice', promptPt: "Shouldn't significa:", options: [
        { labelEn: 'It is not a good idea to...', correct: true, feedbackPt: 'Conselho negativo.' },
        { labelEn: 'You must do it.', correct: false, feedbackPt: 'Oposto.' },
        { labelEn: 'You already did it.', correct: false, feedbackPt: 'Não é passado.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Friend: I work late every night.', speaker: 'You', contextEn: 'Friend: I work late every night.', options: [
        { labelEn: "You shouldn't do that every night. You should rest more.", correct: true, feedbackPt: 'Shouldn\'t + should — conselho completo.' },
        { labelEn: 'You should to gate B12.', correct: false, feedbackPt: 'Sem sentido.' },
        { labelEn: 'I have a reservation.', correct: false, feedbackPt: 'Hotel — contexto errado.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m07-l06-wellbeing-challenge',
    moduleNumber: 7,
    challenge: true,
    goalPt: 'Desafio cumulativo — preferências, pedidos detalhados, hábitos, sintomas básicos e conselhos should/shouldn\'t.',
    intro: {
      titleEn: 'Everyday Well-Being Challenge',
      titlePt: 'Desafio Bem-Estar do Dia a Dia',
      bodyPt: 'Junte tudo do Módulo 7: almoço com restrições, conversa sobre hábitos, farmácia e conselho a um amigo cansado.',
    },
    scenario: {
      settingEn: 'Full day · Restaurant → pharmacy → friend chat',
      scenarioPt: 'Dia completo: almoço de equipe, parada na farmácia, conselho a colega exausto.',
    },
    ctxChoices: [
      {
        speaker: 'Waiter',
        promptEn: 'Any dietary restrictions?',
        promptPt: 'Passo 1 — restaurante.',
        options: [
          { labelEn: "I'm allergic to nuts. I'd like the salad without cheese, please.", correct: true, feedbackPt: 'Alergia + pedido detalhado.' },
          { labelEn: 'I am gate B12.', correct: false, feedbackPt: 'Aeroporto — contexto errado.' },
          { labelEn: 'Cancel my reservation.', correct: false, feedbackPt: 'Hotel — contexto errado.' },
        ],
      },
      {
        speaker: 'Colleague',
        promptEn: 'How do you stay healthy?',
        promptPt: 'Passo 2 — hábitos.',
        options: [
          { labelEn: 'I exercise regularly and try to avoid junk food.', correct: true, feedbackPt: 'Hábitos saudáveis.' },
          { labelEn: 'I prefer gate to hotel.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'I rent a car daily.', correct: false, feedbackPt: 'Transporte — M8.' },
        ],
      },
      {
        speaker: 'Pharmacist',
        promptEn: 'How can I help?',
        promptPt: 'Passo 3 — farmácia.',
        options: [
          { labelEn: "I don't feel well. Something for a headache, please.", correct: true, feedbackPt: 'Sintoma + pedido básico.' },
          { labelEn: 'I need surgery.', correct: false, feedbackPt: 'Fora do escopo.' },
          { labelEn: 'Window or aisle?', correct: false, feedbackPt: 'Avião — contexto errado.' },
        ],
      },
      {
        speaker: 'Friend',
        promptEn: "I'm exhausted. What should I do?",
        promptPt: 'Passo 4 — conselho.',
        options: [
          { labelEn: "You should rest more. You shouldn't work so late.", correct: true, feedbackPt: 'Should + shouldn\'t.' },
          { labelEn: 'You should to fly tomorrow.', correct: false, feedbackPt: 'Should + to — errado.' },
          { labelEn: 'I hate cilantro.', correct: false, feedbackPt: 'Preferência — passo anterior.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Module 7 review',
        titlePt: 'Revisão Módulo 7',
        introPt: 'Tudo que você praticou neste módulo.',
        examples: [
          { en: 'I prefer... / I\'m allergic to...', pt: 'preferências' },
          { en: 'Without..., on the side', pt: 'pedidos detalhados' },
          { en: 'I exercise / I try to avoid...', pt: 'hábitos' },
          { en: "I don't feel well / I have a headache", pt: 'sintomas' },
          { en: 'You should... / You shouldn\'t...', pt: 'conselhos' },
        ],
      },
    ],
    review: [
      { en: 'Food preferences & ordering', pt: 'L01–L02' },
      { en: 'Healthy habits', pt: 'L03' },
      { en: 'Feel & pharmacy', pt: 'L04' },
      { en: 'Should advice', pt: 'L05' },
    ],
    readRepeat: {
      phrases: [
        "I'm allergic to nuts — no cheese, please.",
        'I exercise and drink lots of water.',
        "I don't feel well. Something for a headache, please.",
        "You should rest. You shouldn't work so late.",
      ],
      dialogueEn:
        'Any restrictions? — I\'m allergic to nuts. Salad without cheese, please. — How do you stay healthy? — I exercise and avoid junk food. — Not feeling well? — I have a headache. Something for pain, please. — Friend: I\'m exhausted! — You should rest more!',
    },
    mission: {
      headlineEn: 'Complete the well-being scenario.',
      headlinePt: 'Complete o cenário de bem-estar.',
      bodyPt: 'Use vocabulário do Módulo 7 em sequência: restaurante → hábitos → farmácia → conselho.',
      canDo: ['Allergies & detailed orders', 'Healthy habits', 'Pharmacy basics', 'Should advice'],
      production: {
        introPt: 'Simule os 4 momentos do desafio em inglês — frases curtas para cada etapa.',
        prompts: [
          { speaker: 'Waiter', questionEn: 'Any dietary restrictions?' },
          { speaker: 'Colleague', questionEn: 'How do you stay healthy?' },
          { speaker: 'Pharmacist', questionEn: 'How can I help?' },
          { speaker: 'Friend', questionEn: "I'm exhausted. What should I do?" },
        ],
        fields: [
          { id: 'restaurant', labelPt: 'Restaurante', prefixEn: '', placeholderEn: "I'm allergic to nuts. Salad without cheese, please." },
          { id: 'wellbeing', labelPt: 'Hábitos + farmácia + conselho', prefixEn: '', placeholderEn: "I exercise regularly. I don't feel well — something for a headache. You should rest more!" },
        ],
        exampleEn: "I'm allergic to nuts. Without cheese, please. I exercise and drink water. I don't feel well — headache, please. You should rest — you shouldn't work so late!",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Desafio M7 — restaurante com alergia:', options: [
        { labelEn: "I'm allergic to nuts. No nuts, please.", correct: true, feedbackPt: 'Alergia no pedido.' },
        { labelEn: 'I am nuts allergic.', correct: false, feedbackPt: 'Ordem errada.' },
        { labelEn: 'Gate B12, please.', correct: false, feedbackPt: 'Contexto errado.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Pedido com modificação:', speaker: 'You', contextEn: 'Waiter: What can I get for you?', options: [
        { labelEn: "I'd like the chicken, medium, without onions. Sauce on the side.", correct: true, feedbackPt: 'L02 — pedido detalhado.' },
        { labelEn: 'Where is my gate?', correct: false, feedbackPt: 'M8.' },
        { labelEn: 'I worked yesterday.', correct: false, feedbackPt: 'M4.' },
      ]},
      { type: 'fill_blank', promptPt: 'Hábito saudável:', templateEn: 'I try to ___ junk food.', blankLabel: 'verbo', options: [
        { labelEn: 'avoid', correct: true, feedbackPt: 'L03.' },
        { labelEn: 'eat', correct: false, feedbackPt: 'Oposto do hábito saudável aqui.' },
        { labelEn: 'fly', correct: false, feedbackPt: 'M8.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Farmácia:', speaker: 'You', contextEn: 'Pharmacist: How can I help?', options: [
        { labelEn: "I don't feel well. Something for a sore throat, please.", correct: true, feedbackPt: 'L04.' },
        { labelEn: 'I need a rental car.', correct: false, feedbackPt: 'M8.' },
        { labelEn: 'You should to rest.', correct: false, feedbackPt: 'Should + to — errado.' },
      ]},
      { type: 'reorder', promptPt: 'Conselho:', tokens: ['rest.', 'more', 'should', 'You'], correctOrder: ['You', 'should', 'rest', 'more.'], feedbackCorrectPt: 'You should rest more.', feedbackWrongPt: 'L05 — should + base.' },
      { type: 'choice', promptPt: 'Preferência vs pedido:', options: [
        { labelEn: "I prefer tea. / I'd like tea, please.", correct: true, feedbackPt: 'L01 — like vs would like.' },
        { labelEn: 'I prefer tea please order.', correct: false, feedbackPt: 'Gramática incorreta.' },
        { labelEn: 'Tea is my flight.', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Conselho a amigo:', speaker: 'You', contextEn: "Friend: I work late every night.", options: [
        { labelEn: "You shouldn't do that. You should get more rest.", correct: true, feedbackPt: 'L05 completo.' },
        { labelEn: 'Medium-rare, please.', correct: false, feedbackPt: 'Restaurante — já passou.' },
        { labelEn: 'I cancel my booking.', correct: false, feedbackPt: 'M8.' },
      ]},
      { type: 'fill_blank', promptPt: 'Sintoma:', templateEn: 'I have a ___.', blankLabel: 'sintoma', options: [
        { labelEn: 'headache', correct: true, feedbackPt: 'L04.' },
        { labelEn: 'reservation', correct: false, feedbackPt: 'Hotel.' },
        { labelEn: 'boarding', correct: false, feedbackPt: 'Avião.' },
      ]},
      { type: 'choice', promptPt: 'Esta lição é um:', options: [
        { labelEn: 'Module challenge — cumulative review.', correct: true, feedbackPt: 'Desafio M7.' },
        { labelEn: 'Medical certification course.', correct: false, feedbackPt: 'Não — comunicação básica.' },
        { labelEn: 'START level lesson.', correct: false, feedbackPt: 'ELEMENTARY.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Cenário completo — primeiro passo:', speaker: 'You', contextEn: 'Team lunch. Waiter asks about restrictions.', options: [
        { labelEn: "I'm vegetarian and allergic to shellfish. I'd like the pasta without cheese.", correct: true, feedbackPt: 'Integra L01 + L02 perfeitamente.' },
        { labelEn: 'I rent a car at the airport.', correct: false, feedbackPt: 'M8.' },
        { labelEn: 'I did yoga yesterday.', correct: false, feedbackPt: 'Passado — M4.' },
      ]},
    ],
  },

  // ── MODULE 8 — Travel & Services ──────────────────────────────────────
  {
    contentKey: 'elem-m08-l01-airport-expanded',
    moduleNumber: 8,
    goalPt: 'Aeroporto expandido — layover, connecting flight, customs, baggage claim, lost luggage, oversized bag.',
    intro: {
      titleEn: 'Airport — expanded',
      titlePt: 'Aeroporto — expandido',
      bodyPt: 'Além de gate e boarding pass: conexões, imigração, retirada de bagagem e problemas comuns.',
    },
    scenario: {
      settingEn: 'International airport · Connecting flight',
      scenarioPt: 'Você chega de um voo e precisa pegar conexão — customs, baggage claim, novo gate.',
    },
    ctxChoices: [
      {
        speaker: 'Agent',
        promptEn: 'Do you have a connecting flight?',
        promptPt: 'Agente pergunta sobre conexão.',
        options: [
          { labelEn: 'Yes, I have a connecting flight to Miami at gate C8.', correct: true, feedbackPt: 'Connecting flight = conexão.' },
          { labelEn: 'Yes, I have a connectioning fly.', correct: false, feedbackPt: 'Connecting flight — forma fixa.' },
          { labelEn: 'I am layover hotel.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
      {
        speaker: 'Staff',
        promptEn: 'Where are you flying to?',
        promptPt: 'Imigração / balcão.',
        options: [
          { labelEn: 'I\'m traveling to the US for a business meeting.', correct: true, feedbackPt: 'Customs — destino claro.' },
          { labelEn: 'I am flying to the menu.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'I prefer medium-rare.', correct: false, feedbackPt: 'Restaurante — M7.' },
        ],
      },
      {
        speaker: 'You',
        promptEn: 'Baggage claim problem',
        promptPt: 'Problema na bagagem.',
        options: [
          { labelEn: 'Excuse me, my bag didn\'t arrive. Where is baggage claim?', correct: true, feedbackPt: 'Lost bag + baggage claim.' },
          { labelEn: 'My bag is delicious.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'Baggage is my headache.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Connecting flights & layovers',
        titlePt: 'Conexões e escalas',
        introPt: 'Vocabulário para voos com parada.',
        examples: [
          { en: 'I have a connecting flight.', pt: 'Tenho conexão.' },
          { en: 'My layover is two hours.', pt: 'Escala de 2 horas.' },
          { en: 'Which gate for the connection?', pt: 'Qual portão da conexão?' },
          { en: 'I need to change terminals.', pt: 'Preciso trocar de terminal.' },
        ],
      },
      {
        titleEn: 'Customs & immigration',
        titlePt: 'Imigração e alfândega',
        introPt: 'Frases básicas na fronteira.',
        examples: [
          { en: 'Passport control / customs', pt: 'controle de passaporte / alfândega' },
          { en: 'Purpose of visit: business / tourism', pt: 'motivo da viagem' },
          { en: 'Nothing to declare.', pt: 'Nada a declarar.' },
          { en: 'How long will you stay?', pt: 'Quanto tempo ficará?' },
        ],
      },
      {
        titleEn: 'Baggage claim & problems',
        titlePt: 'Bagagem — retirada e problemas',
        introPt: 'Esteira e bagagem extraviada.',
        examples: [
          { en: 'baggage claim / carousel', pt: 'retirada de bagagem / esteira' },
          { en: 'My bag didn\'t arrive.', pt: 'Minha mala não chegou.' },
          { en: 'I need to report lost luggage.', pt: 'Registrar bagagem extraviada.' },
          { en: 'Is this bag oversized?', pt: 'Esta mala é oversized?' },
        ],
      },
    ],
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'Where is the disembarkation of bags?',
      rightEn: 'Where is baggage claim?',
      explanationPt: 'Baggage claim = retirada de bagagem. Disembarkation of bags não se usa.',
    },
    review: [
      { en: 'connecting flight / layover', pt: 'conexão / escala' },
      { en: 'customs / nothing to declare', pt: 'alfândega' },
      { en: 'baggage claim', pt: 'retirada bagagem' },
      { en: 'My bag didn\'t arrive.', pt: 'bagagem extraviada' },
    ],
    readRepeat: {
      phrases: [
        'I have a connecting flight to Miami.',
        'My layover is ninety minutes.',
        'Nothing to declare.',
        'Where is baggage claim?',
        'My bag didn\'t arrive — I need to report it.',
        'Which gate for the connection?',
      ],
      dialogueEn:
        'Connecting flight? — Yes, to Miami, gate C8. Layover is 90 minutes. — Customs: purpose of visit? — Business meeting. Nothing to declare. — Where\'s baggage claim? — Carousel 4. — My bag didn\'t arrive! — Go to the lost luggage desk.',
    },
    mission: {
      headlineEn: 'You can handle an expanded airport scenario.',
      headlinePt: 'Você consegue lidar com aeroporto expandido.',
      canDo: ['Connecting flight', 'Customs basics', 'Baggage claim', 'Lost luggage'],
      production: {
        introPt: 'Simule: conexão + customs + problema de bagagem.',
        prompts: [
          { speaker: 'Agent', questionEn: 'Do you have a connecting flight?' },
          { speaker: 'Officer', questionEn: 'Purpose of visit?' },
          { speaker: 'Staff', questionEn: 'Can I help you?' },
        ],
        fields: [
          { id: 'connection', labelPt: 'Conexão', prefixEn: '', placeholderEn: 'Yes — connecting flight to Miami, gate C8. Two-hour layover.' },
          { id: 'baggage', labelPt: 'Bagagem', prefixEn: '', placeholderEn: 'Nothing to declare. My bag didn\'t arrive — where is baggage claim?' },
        ],
        exampleEn: 'Connecting flight to Miami, gate C8. Business trip — nothing to declare. My bag didn\'t arrive. Where is baggage claim?',
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Conexão em inglês:', options: [
        { labelEn: 'I have a connecting flight.', correct: true, feedbackPt: 'Connecting flight — padrão.' },
        { labelEn: 'I have a connection fly.', correct: false, feedbackPt: 'Forma incorreta.' },
        { labelEn: 'I am layover flight.', correct: false, feedbackPt: 'Layover = escala, não voo.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Nada a declarar.', templateEn: '___ to declare.', blankLabel: 'início', options: [
        { labelEn: 'Nothing', correct: true, feedbackPt: 'Nothing to declare — frase fixa.' },
        { labelEn: 'Anything', correct: false, feedbackPt: 'Anything to declare? — pergunta do oficial.' },
        { labelEn: 'Something', correct: false, feedbackPt: 'Oposto.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Onde fica a retirada de bagagem?', tokens: ['claim?', 'baggage', 'is', 'Where'], correctOrder: ['Where', 'is', 'baggage', 'claim?'], feedbackCorrectPt: 'Where is baggage claim?', feedbackWrongPt: 'Baggage claim = esteira.' },
      { type: 'dialogue_complete', promptPt: 'Officer: Purpose of visit?', speaker: 'You', contextEn: 'Customs: Purpose of visit?', options: [
        { labelEn: 'Business — I have a meeting.', correct: true, feedbackPt: 'Resposta clara.' },
        { labelEn: 'I am vegetarian.', correct: false, feedbackPt: 'M7 — contexto errado.' },
        { labelEn: 'Medium, please.', correct: false, feedbackPt: 'Restaurante.' },
      ]},
      { type: 'choice', promptPt: 'Layover significa:', options: [
        { labelEn: 'Stop between flights.', correct: true, feedbackPt: 'Escala / parada.' },
        { labelEn: 'Lost luggage.', correct: false, feedbackPt: 'Lost luggage = bagagem extraviada.' },
        { labelEn: 'Boarding pass.', correct: false, feedbackPt: 'Documento diferente.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Minha mala não chegou.', templateEn: 'My bag didn\'t ___.', blankLabel: 'verbo', options: [
        { labelEn: 'arrive', correct: true, feedbackPt: "Didn't arrive = não chegou." },
        { labelEn: 'arrived', correct: false, feedbackPt: 'Didn\'t + base.' },
        { labelEn: 'arriving', correct: false, feedbackPt: 'Forma incorreta.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Staff: Can I help?', speaker: 'You', contextEn: 'Your bag is missing at baggage claim.', options: [
        { labelEn: 'My bag didn\'t arrive. I need to report lost luggage.', correct: true, feedbackPt: 'Problema + ação.' },
        { labelEn: 'I\'d like the check, please.', correct: false, feedbackPt: 'Restaurante.' },
        { labelEn: 'You should rest more.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Qual portão da conexão?', tokens: ['connection?', 'the', 'for', 'gate', 'Which'], correctOrder: ['Which', 'gate', 'for', 'the', 'connection?'], feedbackCorrectPt: 'Which gate for the connection?', feedbackWrongPt: 'Gate for the connection.' },
      { type: 'choice', promptPt: 'Carousel neste contexto é:', options: [
        { labelEn: 'The moving belt for luggage.', correct: true, feedbackPt: 'Esteira de bagagem.' },
        { labelEn: 'A ride at the airport.', correct: false, feedbackPt: 'Não é brinquedo.' },
        { labelEn: 'The boarding gate.', correct: false, feedbackPt: 'Gate ≠ carousel.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Agent: Do you have a connecting flight?', speaker: 'You', contextEn: 'Agent: Do you have a connecting flight?', options: [
        { labelEn: 'Yes — to Miami, gate C8. I have a two-hour layover.', correct: true, feedbackPt: 'Resposta completa.' },
        { labelEn: 'I am allergic to nuts.', correct: false, feedbackPt: 'M7.' },
        { labelEn: 'I cancel my reservation.', correct: false, feedbackPt: 'L05 M8.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m08-l02-hotel-services',
    moduleNumber: 8,
    goalPt: 'Serviços de hotel — room service, wake-up call, extra towels, late check-out, problemas no quarto.',
    intro: {
      titleEn: 'Hotel services',
      titlePt: 'Serviços de hotel',
      bodyPt: 'Além do check-in básico: pedir serviços, resolver problemas no quarto e solicitar late check-out.',
    },
    scenario: {
      settingEn: 'Business hotel · 3-night stay',
      scenarioPt: 'Estadia de negócios. Você usa serviços do hotel e resolve um problema no quarto.',
    },
    ctxChoices: [
      {
        speaker: 'Reception',
        promptEn: 'How can I help you?',
        promptPt: 'Recepção — pedido de serviço.',
        options: [
          { labelEn: 'Could I get a wake-up call at 6 AM, please?', correct: true, feedbackPt: 'Wake-up call = chamada de despertar.' },
          { labelEn: 'Could I get a wake-up fly?', correct: false, feedbackPt: 'Wake-up call, não fly.' },
          { labelEn: 'I am check-in gate.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
      {
        speaker: 'You',
        promptEn: 'Room problem',
        promptPt: 'Problema no quarto.',
        options: [
          { labelEn: 'The air conditioning isn\'t working. Could someone take a look?', correct: true, feedbackPt: 'Descreve problema + pedido educado.' },
          { labelEn: 'The room is my flight.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'AC is delicious.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Room service & requests',
        titlePt: 'Room service e pedidos',
        introPt: 'Pedidos comuns na recepção ou pelo telefone do quarto.',
        examples: [
          { en: 'Room service, please.', pt: 'Serviço de quarto.' },
          { en: 'Could I get extra towels?', pt: 'Toalhas extras?' },
          { en: 'Could I have more pillows?', pt: 'Mais travesseiros?' },
          { en: 'A wake-up call at 7 AM, please.', pt: 'Chamada às 7h.' },
        ],
      },
      {
        titleEn: 'Check-out & late check-out',
        titlePt: 'Check-out e late check-out',
        introPt: 'Saindo do hotel.',
        examples: [
          { en: 'What time is check-out?', pt: 'Horário do check-out?' },
          { en: 'Could I have a late check-out?', pt: 'Check-out tardio?' },
          { en: 'I\'d like to check out, please.', pt: 'Quero fazer check-out.' },
          { en: 'Can you store my luggage?', pt: 'Guardar bagagem?' },
        ],
      },
      {
        titleEn: 'Reporting room problems',
        titlePt: 'Reportar problemas no quarto',
        introPt: 'Algo não funciona — peça ajuda.',
        examples: [
          { en: 'The Wi-Fi isn\'t working.', pt: 'Wi-Fi não funciona.' },
          { en: 'There\'s no hot water.', pt: 'Sem água quente.' },
          { en: 'Could someone take a look?', pt: 'Alguém pode verificar?' },
          { en: 'Could I change rooms?', pt: 'Trocar de quarto?' },
        ],
      },
    ],
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I want a wake-up in six hours.',
      rightEn: 'Could I get a wake-up call at 6 AM, please?',
      explanationPt: 'Wake-up call = serviço do hotel. Use at + horário.',
    },
    review: [
      { en: 'wake-up call / room service', pt: 'serviços' },
      { en: 'late check-out', pt: 'saída tardia' },
      { en: "isn't working", pt: 'problema' },
      { en: 'Could someone take a look?', pt: 'pedir ajuda' },
    ],
    readRepeat: {
      phrases: [
        'Could I get a wake-up call at 6 AM?',
        'Room service, please.',
        'Could I have extra towels?',
        'The Wi-Fi isn\'t working.',
        'Could I have a late check-out?',
        'Can you store my luggage?',
      ],
      dialogueEn:
        'Front desk, how can I help? — Wake-up call at 6 AM, please. Also extra towels. — Of course. — Later: The AC isn\'t working. — I\'ll send someone. — Could I have late check-out tomorrow? — Until 2 PM, no problem.',
    },
    mission: {
      headlineEn: 'You can use hotel services and report problems.',
      headlinePt: 'Você consegue usar serviços do hotel e reportar problemas.',
      canDo: ['Wake-up call', 'Extra towels', 'Room problem', 'Late check-out'],
      production: {
        introPt: 'Simule: peça dois serviços e reporte um problema no quarto.',
        prompts: [{ speaker: 'Reception', questionEn: 'Good evening. How can I help you?' }],
        fields: [
          { id: 'services', labelPt: 'Serviços', prefixEn: '', placeholderEn: 'Wake-up call at 6 AM. Extra towels, please.' },
          { id: 'problem', labelPt: 'Problema + check-out', prefixEn: '', placeholderEn: "The Wi-Fi isn't working. Could someone take a look? Late check-out tomorrow?" },
        ],
        exampleEn: "Wake-up call at 6 AM, please. Extra towels. The AC isn't working — could someone take a look? Late check-out tomorrow?",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Chamada de despertar:', options: [
        { labelEn: 'Could I get a wake-up call at 7 AM?', correct: true, feedbackPt: 'Wake-up call — padrão.' },
        { labelEn: 'Could I get a wake-up flight?', correct: false, feedbackPt: 'Call, não flight.' },
        { labelEn: 'I wake-up call am.', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Wi-Fi não funciona.', templateEn: "The Wi-Fi ___ working.", blankLabel: 'verbo', options: [
        { labelEn: "isn't", correct: true, feedbackPt: "Isn't working = não funciona." },
        { labelEn: "doesn't", correct: false, feedbackPt: "Doesn't working — incorreto." },
        { labelEn: 'not', correct: false, feedbackPt: 'Falta verbo.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Toalhas extras, por favor.', tokens: ['please.', 'towels?', 'extra', 'I', 'get', 'Could'], correctOrder: ['Could', 'I', 'get', 'extra', 'towels?', 'please.'], feedbackCorrectPt: 'Could I get extra towels, please?', feedbackWrongPt: 'Could I get...' },
      { type: 'dialogue_complete', promptPt: 'Reception: How can I help?', speaker: 'You', contextEn: 'You need room service.', options: [
        { labelEn: 'Room service, please. I\'d like a sandwich and water.', correct: true, feedbackPt: 'Room service + pedido.' },
        { labelEn: 'Where is baggage claim?', correct: false, feedbackPt: 'Aeroporto.' },
        { labelEn: 'I have a connecting flight.', correct: false, feedbackPt: 'Aeroporto.' },
      ]},
      { type: 'choice', promptPt: 'Late check-out significa:', options: [
        { labelEn: 'Leaving the hotel later than standard time.', correct: true, feedbackPt: 'Saída tardia.' },
        { labelEn: 'Checking in late at night.', correct: false, feedbackPt: 'Isso seria late check-in.' },
        { labelEn: 'Canceling the hotel.', correct: false, feedbackPt: 'Cancelamento — diferente.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Alguém pode verificar?', templateEn: 'Could someone ___ a look?', blankLabel: 'verbo', options: [
        { labelEn: 'take', correct: true, feedbackPt: 'Take a look = dar uma olhada.' },
        { labelEn: 'make', correct: false, feedbackPt: 'Make a look — errado.' },
        { labelEn: 'do', correct: false, feedbackPt: 'Do a look — errado.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Problema no quarto:', speaker: 'You', contextEn: 'The shower has no hot water.', options: [
        { labelEn: "There's no hot water. Could someone take a look?", correct: true, feedbackPt: 'Problema + pedido.' },
        { labelEn: 'Nothing to declare.', correct: false, feedbackPt: 'Customs.' },
        { labelEn: 'You should rest.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Quero fazer check-out.', tokens: ['out,', 'check', 'to', 'like', "I'd", 'please.'], correctOrder: ["I'd", 'like', 'to', 'check', 'out,', 'please.'], feedbackCorrectPt: "I'd like to check out, please.", feedbackWrongPt: 'Check out = sair do hotel.' },
      { type: 'choice', promptPt: 'Guardar bagagem no hotel:', options: [
        { labelEn: 'Can you store my luggage?', correct: true, feedbackPt: 'Store luggage — comum.' },
        { labelEn: 'Can you fly my luggage?', correct: false, feedbackPt: 'Fly — errado.' },
        { labelEn: 'Can you cook my luggage?', correct: false, feedbackPt: 'Sem sentido.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Late check-out:', speaker: 'You', contextEn: 'Reception: Check-out is at 11 AM.', options: [
        { labelEn: 'Could I have a late check-out, please? Until 2 PM?', correct: true, feedbackPt: 'Pedido educado.' },
        { labelEn: 'I need a wake-up call at gate B12.', correct: false, feedbackPt: 'Mistura conceitos.' },
        { labelEn: 'I am allergic to nuts.', correct: false, feedbackPt: 'M7.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m08-l03-transport-renting',
    moduleNumber: 8,
    goalPt: 'Transporte e aluguel — subway, bus, taxi, rent a car, one-way/return ticket, how much to...?',
    intro: {
      titleEn: 'Transport & renting',
      titlePt: 'Transporte e aluguel',
      bodyPt: 'Pegar metrô, ônibus, táxi ou alugar carro — perguntas de preço, destino e tipo de passagem.',
    },
    scenario: {
      settingEn: 'City arrival · Getting around',
      scenarioPt: 'Você chegou à cidade e precisa ir ao hotel — transporte público ou aluguel de carro.',
    },
    ctxChoices: [
      {
        speaker: 'Local',
        promptEn: 'How do I get to downtown?',
        promptPt: 'Perguntar como chegar.',
        options: [
          { labelEn: 'Take the subway — two stops. Or you can grab a taxi.', correct: true, feedbackPt: 'Opções de transporte.' },
          { labelEn: 'Take the subways fly gate.', correct: false, feedbackPt: 'Sem sentido.' },
          { labelEn: 'You should eat vegetables.', correct: false, feedbackPt: 'M7.' },
        ],
      },
      {
        speaker: 'Clerk',
        promptEn: 'At the rental counter',
        promptPt: 'Balcão de aluguel de carro.',
        options: [
          { labelEn: 'I\'d like to rent a car for three days, please.', correct: true, feedbackPt: 'Rent a car — padrão.' },
          { labelEn: 'I\'d like to rent a fly.', correct: false, feedbackPt: 'Rent a car, não fly.' },
          { labelEn: 'Rent me subway.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Public transport',
        titlePt: 'Transporte público',
        introPt: 'Metrô, ônibus, táxi.',
        examples: [
          { en: 'Where is the subway station?', pt: 'Onde fica o metrô?' },
          { en: 'Which bus goes to the airport?', pt: 'Qual ônibus vai ao aeroporto?' },
          { en: 'How much is a ticket?', pt: 'Quanto custa a passagem?' },
          { en: 'Could you call a taxi, please?', pt: 'Chamar um táxi?' },
        ],
      },
      {
        titleEn: 'Renting a car',
        titlePt: 'Alugar carro',
        introPt: 'Locadora — frases essenciais.',
        examples: [
          { en: 'I\'d like to rent a car.', pt: 'Quero alugar um carro.' },
          { en: 'For three days.', pt: 'Por três dias.' },
          { en: 'Automatic, please.', pt: 'Automático, por favor.' },
          { en: 'Is insurance included?', pt: 'Seguro incluído?' },
        ],
      },
      {
        titleEn: 'Tickets — one-way / return',
        titlePt: 'Passagens — ida / ida e volta',
        introPt: 'Comprar passagem de trem ou ônibus.',
        examples: [
          { en: 'One-way or return?', pt: 'Só ida ou ida e volta?' },
          { en: 'A return ticket, please.', pt: 'Passagem ida e volta.' },
          { en: 'How much to the city center?', pt: 'Quanto até o centro?' },
          { en: 'Which platform?', pt: 'Qual plataforma?' },
        ],
      },
    ],
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'How much costs the ticket?',
      rightEn: 'How much is the ticket? / How much does the ticket cost?',
      explanationPt: 'How much is...? ou How much does... cost? — não how much costs.',
    },
    review: [
      { en: 'subway / bus / taxi', pt: 'transporte' },
      { en: 'rent a car', pt: 'aluguel' },
      { en: 'one-way / return', pt: 'tipo passagem' },
      { en: 'How much is...?', pt: 'preço' },
    ],
    readRepeat: {
      phrases: [
        'Where is the subway station?',
        'How much is a ticket?',
        'One-way, please.',
        'I\'d like to rent a car for two days.',
        'Automatic, please. Is insurance included?',
        'Could you call a taxi to the hotel?',
      ],
      dialogueEn:
        'How do I get downtown? — Take the subway — two stops. — How much is a ticket? — Three dollars. One-way or return? — One-way, please. — Or rent a car? — I\'d like to rent for two days. Automatic, please.',
    },
    mission: {
      headlineEn: 'You can get around and rent transport.',
      headlinePt: 'Você consegue se locomover e alugar transporte.',
      canDo: ['Subway / bus / taxi', 'Rent a car', 'One-way / return', 'How much is...?'],
      production: {
        introPt: 'Simule: perguntar transporte público E alugar carro (duas situações).',
        prompts: [
          { speaker: 'Local', questionEn: 'Can I help you find something?' },
          { speaker: 'Rental clerk', questionEn: 'How can I help you?' },
        ],
        fields: [
          { id: 'transport', labelPt: 'Transporte público', prefixEn: '', placeholderEn: 'Where is the subway? How much is a ticket? One-way, please.' },
          { id: 'rental', labelPt: 'Aluguel de carro', prefixEn: '', placeholderEn: "I'd like to rent a car for three days. Automatic, please." },
        ],
        exampleEn: 'Where is the subway station? One-way ticket, please. — I\'d like to rent a car for three days. Automatic. Is insurance included?',
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Alugar carro:', options: [
        { labelEn: "I'd like to rent a car.", correct: true, feedbackPt: 'Rent a car — padrão.' },
        { labelEn: "I'd like to lend a car.", correct: false, feedbackPt: 'Lend = emprestar.' },
        { labelEn: "I'd like to rent a subway.", correct: false, feedbackPt: 'Subway não se aluga assim.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Passagem ida e volta.', templateEn: 'A ___ ticket, please.', blankLabel: 'tipo', options: [
        { labelEn: 'return', correct: true, feedbackPt: 'Return = ida e volta.' },
        { labelEn: 'returning', correct: false, feedbackPt: 'Return ticket, não returning.' },
        { labelEn: 'backly', correct: false, feedbackPt: 'Backly não existe.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Onde fica a estação de metrô?', tokens: ['station?', 'subway', 'the', 'is', 'Where'], correctOrder: ['Where', 'is', 'the', 'subway', 'station?'], feedbackCorrectPt: 'Where is the subway station?', feedbackWrongPt: 'Where is the...?' },
      { type: 'dialogue_complete', promptPt: 'Clerk: One-way or return?', speaker: 'You', contextEn: 'Ticket counter: One-way or return?', options: [
        { labelEn: 'One-way, please.', correct: true, feedbackPt: 'Só ida.' },
        { labelEn: 'Medium, please.', correct: false, feedbackPt: 'Restaurante.' },
        { labelEn: 'Late check-out.', correct: false, feedbackPt: 'Hotel.' },
      ]},
      { type: 'choice', promptPt: 'How much is the ticket? — pergunta de:', options: [
        { labelEn: 'Price.', correct: true, feedbackPt: 'Quanto custa.' },
        { labelEn: 'Time.', correct: false, feedbackPt: 'What time...?' },
        { labelEn: 'Location.', correct: false, feedbackPt: 'Where...?' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Quanto até o aeroporto?', templateEn: 'How much ___ to the airport?', blankLabel: 'verbo', options: [
        { labelEn: 'is', correct: true, feedbackPt: 'How much is it to...?' },
        { labelEn: 'costs', correct: false, feedbackPt: 'How much costs — erro comum.' },
        { labelEn: 'does', correct: false, feedbackPt: 'Precisaria does it cost.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Rental: How can I help?', speaker: 'You', contextEn: 'Car rental counter.', options: [
        { labelEn: "I'd like to rent a car for three days. Automatic, please.", correct: true, feedbackPt: 'Pedido completo.' },
        { labelEn: 'My bag didn\'t arrive.', correct: false, feedbackPt: 'Aeroporto.' },
        { labelEn: 'I don\'t feel well.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Chame um táxi, por favor.', tokens: ['please?', 'taxi,', 'a', 'call', 'you', 'Could'], correctOrder: ['Could', 'you', 'call', 'a', 'taxi,', 'please?'], feedbackCorrectPt: 'Could you call a taxi, please?', feedbackWrongPt: 'Could you call...?' },
      { type: 'choice', promptPt: 'One-way significa:', options: [
        { labelEn: 'Ticket to one destination only (no return).', correct: true, feedbackPt: 'Só ida.' },
        { labelEn: 'One ticket for two people.', correct: false, feedbackPt: 'Não.' },
        { labelEn: 'Walking on one street.', correct: false, feedbackPt: 'Não.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Local: Can I help?', speaker: 'You', contextEn: 'You need to get to the hotel.', options: [
        { labelEn: 'How do I get to the Marriott? Is there a bus or subway?', correct: true, feedbackPt: 'Pergunta prática.' },
        { labelEn: 'Nothing to declare.', correct: false, feedbackPt: 'Customs.' },
        { labelEn: 'You shouldn\'t skip breakfast.', correct: false, feedbackPt: 'M7.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m08-l04-reservations',
    moduleNumber: 8,
    goalPt: 'Fazer reservas — restaurante, hotel, mesa para dois, horário, confirmar detalhes.',
    intro: {
      titleEn: 'Reservations',
      titlePt: 'Reservas',
      bodyPt: 'Book, reservation, table for two — fazer e confirmar reservas por telefone ou app.',
    },
    scenario: {
      settingEn: 'Phone call · Restaurant & hotel booking',
      scenarioPt: 'Você liga para reservar mesa no restaurante e confirma reserva de hotel.',
    },
    ctxChoices: [
      {
        speaker: 'Host',
        promptEn: 'Good evening. How can I help?',
        promptPt: 'Restaurante — reserva.',
        options: [
          { labelEn: 'I\'d like to book a table for two at 7 PM, please.', correct: true, feedbackPt: 'Book a table + detalhes.' },
          { labelEn: 'I\'d like to book a fly for two.', correct: false, feedbackPt: 'Table, não fly.' },
          { labelEn: 'I book table is two.', correct: false, feedbackPt: 'Gramática incorreta.' },
        ],
      },
      {
        speaker: 'Reception',
        promptEn: 'Confirming hotel reservation',
        promptPt: 'Confirmar reserva de hotel.',
        options: [
          { labelEn: 'I have a reservation under Lima. Checking in tonight.', correct: true, feedbackPt: 'Under + sobrenome — comum.' },
          { labelEn: 'I have reservation under is me.', correct: false, feedbackPt: 'Gramática incorreta.' },
          { labelEn: 'I reservation hotel am.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Making a reservation',
        titlePt: 'Fazer reserva',
        introPt: 'Book / make a reservation.',
        examples: [
          { en: 'I\'d like to make a reservation.', pt: 'Quero fazer uma reserva.' },
          { en: 'A table for two, please.', pt: 'Mesa para dois.' },
          { en: 'For tonight at 7 PM.', pt: 'Hoje às 19h.' },
          { en: 'Under the name Silva.', pt: 'No nome Silva.' },
        ],
      },
      {
        titleEn: 'Confirming details',
        titlePt: 'Confirmar detalhes',
        introPt: 'Repita e confirme para evitar erro.',
        examples: [
          { en: 'So that\'s Friday at 8 PM for four people?', pt: 'Confirmando sexta 20h, 4 pessoas?' },
          { en: 'Can I have the confirmation number?', pt: 'Número de confirmação?' },
          { en: 'Is outdoor seating available?', pt: 'Tem mesa ao ar livre?' },
        ],
      },
      {
        titleEn: 'Hotel check-in with reservation',
        titlePt: 'Check-in com reserva',
        introPt: 'Na recepção do hotel.',
        examples: [
          { en: 'I have a reservation for two nights.', pt: 'Reserva duas noites.' },
          { en: 'Checking in under Garcia.', pt: 'Check-in nome Garcia.' },
          { en: 'I booked online.', pt: 'Reservei online.' },
        ],
      },
    ],
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I want a reservation for 7 PM hours.',
      rightEn: 'I\'d like a table for two at 7 PM, please.',
      explanationPt: 'At 7 PM — sem hours. Table for two = mesa para dois.',
    },
    review: [
      { en: 'book / make a reservation', pt: 'reservar' },
      { en: 'table for two at 7 PM', pt: 'mesa + horário' },
      { en: 'under the name...', pt: 'no nome' },
      { en: 'confirmation number', pt: 'confirmação' },
    ],
    readRepeat: {
      phrases: [
        'I\'d like to book a table for two.',
        'For tonight at 7 PM, please.',
        'Under the name Silva.',
        'I have a reservation for two nights.',
        'Can I have the confirmation number?',
        'So that\'s Friday at 8 PM for four?',
      ],
      dialogueEn:
        'Good evening. — I\'d like to book a table for two at 7 PM. — Under what name? — Silva. — Confirmed! — At the hotel: I have a reservation under Silva, two nights. — Here\'s your confirmation number.',
    },
    mission: {
      headlineEn: 'You can make and confirm reservations.',
      headlinePt: 'Você consegue fazer e confirmar reservas.',
      canDo: ['Book a table', 'Table for two at 7 PM', 'Under the name...', 'Confirmation number'],
      production: {
        introPt: 'Simule reserva de restaurante (mesa, horário, nome) e confirmação de hotel.',
        prompts: [
          { speaker: 'Host', questionEn: 'Good evening. How can I help?' },
          { speaker: 'Reception', questionEn: 'Do you have a reservation?' },
        ],
        fields: [
          { id: 'restaurant', labelPt: 'Reserva restaurante', prefixEn: '', placeholderEn: 'Table for two at 7 PM. Under the name Silva.' },
          { id: 'hotel', labelPt: 'Reserva hotel', prefixEn: '', placeholderEn: 'I have a reservation for two nights. Checking in under Silva.' },
        ],
        exampleEn: 'I\'d like a table for two at 7 PM, under Silva. — I have a reservation for two nights. Can I have the confirmation number?',
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Reservar mesa:', options: [
        { labelEn: "I'd like to book a table for two.", correct: true, feedbackPt: 'Book a table — padrão.' },
        { labelEn: "I'd like to reserve a fly.", correct: false, feedbackPt: 'Table, não fly.' },
        { labelEn: 'I book table two am.', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: No nome Silva.', templateEn: 'Under the ___ Silva.', blankLabel: 'palavra', options: [
        { labelEn: 'name', correct: true, feedbackPt: 'Under the name...' },
        { labelEn: 'names', correct: false, feedbackPt: 'Singular — one name.' },
        { labelEn: 'called', correct: false, feedbackPt: 'Under the called — errado.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Mesa para dois às 19h.', tokens: ['PM.', '7', 'at', 'two,', 'for', 'table', 'a'], correctOrder: ['a', 'table', 'for', 'two,', 'at', '7', 'PM.'], feedbackCorrectPt: 'A table for two at 7 PM.', feedbackWrongPt: 'Table for X at time.' },
      { type: 'dialogue_complete', promptPt: 'Host: How can I help?', speaker: 'You', contextEn: 'Restaurant phone call.', options: [
        { labelEn: "I'd like to make a reservation for four at 8 PM.", correct: true, feedbackPt: 'Reserva completa.' },
        { labelEn: 'Where is baggage claim?', correct: false, feedbackPt: 'Aeroporto.' },
        { labelEn: 'Rent a car, please.', correct: false, feedbackPt: 'Locadora.' },
      ]},
      { type: 'choice', promptPt: 'Book e make a reservation:', options: [
        { labelEn: 'Both mean to reserve something.', correct: true, feedbackPt: 'Sinônimos comuns.' },
        { labelEn: 'Book means cancel.', correct: false, feedbackPt: 'Oposto.' },
        { labelEn: 'Only for flights.', correct: false, feedbackPt: 'Restaurante, hotel também.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Número de confirmação?', templateEn: 'Can I have the ___ number?', blankLabel: 'tipo', options: [
        { labelEn: 'confirmation', correct: true, feedbackPt: 'Confirmation number.' },
        { labelEn: 'confirm', correct: false, feedbackPt: 'Confirm number — errado.' },
        { labelEn: 'confirmed', correct: false, feedbackPt: 'Confirmed number — errado.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Reception: Do you have a reservation?', speaker: 'You', contextEn: 'Hotel check-in.', options: [
        { labelEn: 'Yes — two nights under Silva. I booked online.', correct: true, feedbackPt: 'Confirmação clara.' },
        { labelEn: 'One-way ticket, please.', correct: false, feedbackPt: 'Transporte.' },
        { labelEn: 'Without cheese, please.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Quero fazer uma reserva.', tokens: ['reservation.', 'a', 'make', 'to', 'like', "I'd"], correctOrder: ["I'd", 'like', 'to', 'make', 'a', 'reservation.'], feedbackCorrectPt: "I'd like to make a reservation.", feedbackWrongPt: "I'd like to make..." },
      { type: 'choice', promptPt: 'Confirmar: Sexta 20h, 4 pessoas?', options: [
        { labelEn: "So that's Friday at 8 PM for four people?", correct: true, feedbackPt: 'Confirmação natural.' },
        { labelEn: 'So Friday is four PM people?', correct: false, feedbackPt: 'Ordem confusa.' },
        { labelEn: 'Four Friday 8 reservation?', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Host: Under what name?', speaker: 'You', contextEn: 'Host: Under what name?', options: [
        { labelEn: 'Silva, please.', correct: true, feedbackPt: 'Resposta direta.' },
        { labelEn: 'Gate C8.', correct: false, feedbackPt: 'Aeroporto.' },
        { labelEn: 'Automatic, please.', correct: false, feedbackPt: 'Car rental.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m08-l05-changes-cancellations',
    moduleNumber: 8,
    goalPt: 'Alterar e cancelar reservas — change booking, cancel reservation, refund, reschedule.',
    intro: {
      titleEn: 'Changes & cancellations',
      titlePt: 'Alterações e cancelamentos',
      bodyPt: 'Planos mudam — aprenda a alterar horário, cancelar reserva e perguntar sobre reembolso.',
    },
    scenario: {
      settingEn: 'Phone & front desk · Plan changed',
      scenarioPt: 'Sua reunião mudou de horário. Você precisa alterar reserva de restaurante e cancelar parte da estadia no hotel.',
    },
    ctxChoices: [
      {
        speaker: 'You',
        promptEn: 'Changing a restaurant reservation',
        promptPt: 'Alterar reserva de restaurante.',
        options: [
          { labelEn: 'I need to change my reservation from 7 to 8 PM, please.', correct: true, feedbackPt: 'Change from X to Y.' },
          { labelEn: 'I need change my reservation from 7.', correct: false, feedbackPt: 'Need to change — infinitivo.' },
          { labelEn: 'I cancel change 7 PM.', correct: false, feedbackPt: 'Frase incompleta.' },
        ],
      },
      {
        speaker: 'Reception',
        promptEn: 'Cancellation policy',
        promptPt: 'Política de cancelamento.',
        options: [
          { labelEn: 'You can cancel free until 6 PM. After that, one night is charged.', correct: true, feedbackPt: 'Informação de política.' },
          { labelEn: 'You can cancel free forever always.', correct: false, feedbackPt: 'Raramente verdade — mas a opção correta é a primeira por ser realista.' },
          { labelEn: 'Cancel is my gate.', correct: false, feedbackPt: 'Sem sentido.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Changing a booking',
        titlePt: 'Alterar reserva',
        introPt: 'Mudar horário, data ou número de pessoas.',
        examples: [
          { en: 'I need to change my reservation.', pt: 'Preciso alterar minha reserva.' },
          { en: 'Can we move it to Saturday?', pt: 'Podemos mudar para sábado?' },
          { en: 'From 7 to 8 PM, please.', pt: 'Das 19h às 20h.' },
          { en: 'Actually, make it three people.', pt: 'Na verdade, três pessoas.' },
        ],
      },
      {
        titleEn: 'Cancelling',
        titlePt: 'Cancelar',
        introPt: 'Cancelar reserva educadamente.',
        examples: [
          { en: 'I\'d like to cancel my reservation.', pt: 'Quero cancelar.' },
          { en: 'Something came up — I can\'t make it.', pt: 'Surgiu um imprevisto.' },
          { en: 'Can I cancel without a fee?', pt: 'Cancelar sem taxa?' },
          { en: 'Please cancel under Silva.', pt: 'Cancelar no nome Silva.' },
        ],
      },
      {
        titleEn: 'Refunds & rescheduling',
        titlePt: 'Reembolso e reagendar',
        introPt: 'Perguntas após cancelamento.',
        examples: [
          { en: 'Will I get a refund?', pt: 'Terei reembolso?' },
          { en: 'Can I reschedule for next week?', pt: 'Reagendar semana que vem?' },
          { en: 'What\'s your cancellation policy?', pt: 'Política de cancelamento?' },
        ],
      },
    ],
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'I want cancel my reservation.',
      rightEn: 'I\'d like to cancel my reservation.',
      explanationPt: 'Want to cancel ou would like to cancel — não want cancel sem to.',
    },
    review: [
      { en: 'change my reservation', pt: 'alterar' },
      { en: 'cancel / I can\'t make it', pt: 'cancelar' },
      { en: 'refund / cancellation policy', pt: 'reembolso' },
      { en: 'reschedule', pt: 'reagendar' },
    ],
    readRepeat: {
      phrases: [
        'I need to change my reservation to 8 PM.',
        'Can we move it to Saturday?',
        'I\'d like to cancel, please.',
        'Something came up — I can\'t make it.',
        'Will I get a refund?',
        'Can I reschedule for next week?',
      ],
      dialogueEn:
        'I need to change my reservation — from 7 to 8 PM. — Done. — Actually, I have to cancel the hotel for tomorrow. Something came up. — Cancel free until 6 PM. Will you get a refund? — Can I reschedule for next week instead?',
    },
    mission: {
      headlineEn: 'You can change or cancel bookings.',
      headlinePt: 'Você consegue alterar ou cancelar reservas.',
      canDo: ['Change reservation', 'Cancel', 'Refund', 'Reschedule'],
      production: {
        introPt: 'Simule: alterar horário de restaurante e cancelar/reagendar hotel.',
        prompts: [
          { speaker: 'Host', questionEn: 'How can I help?' },
          { speaker: 'Reception', questionEn: 'Cancellation desk.' },
        ],
        fields: [
          { id: 'change', labelPt: 'Alteração', prefixEn: '', placeholderEn: 'I need to change my reservation from 7 to 8 PM.' },
          { id: 'cancel', labelPt: 'Cancelamento / reagendar', prefixEn: '', placeholderEn: "I'd like to cancel tomorrow. Can I reschedule for next week? Will I get a refund?" },
        ],
        exampleEn: 'Change reservation to 8 PM, please. — I\'d like to cancel tomorrow — something came up. Can I reschedule? Refund?',
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Alterar reserva:', options: [
        { labelEn: 'I need to change my reservation.', correct: true, feedbackPt: 'Need to change — padrão.' },
        { labelEn: 'I need change my reservation.', correct: false, feedbackPt: 'Falta to.' },
        { labelEn: 'I am change reservation.', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Quero cancelar.', templateEn: "I'd like to ___ my reservation.", blankLabel: 'verbo', options: [
        { labelEn: 'cancel', correct: true, feedbackPt: 'Cancel reservation.' },
        { labelEn: 'cancelling', correct: false, feedbackPt: 'To + base.' },
        { labelEn: 'cancelled', correct: false, feedbackPt: 'Past — errado aqui.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Surgiu um imprevisto — não posso ir.', tokens: ["it.", "can't", 'I', 'up', 'came', 'Something', '—'], correctOrder: ['Something', 'came', 'up', '—', "I", "can't", 'make', "it."], feedbackCorrectPt: "Something came up — I can't make it.", feedbackWrongPt: 'Something came up — fixed phrase.' },
      { type: 'dialogue_complete', promptPt: 'Host: How can I help?', speaker: 'You', contextEn: 'You need a later time.', options: [
        { labelEn: 'I need to change my reservation from 7 to 8 PM, please.', correct: true, feedbackPt: 'From X to Y.' },
        { labelEn: 'I have a connecting flight.', correct: false, feedbackPt: 'Aeroporto.' },
        { labelEn: 'Extra towels, please.', correct: false, feedbackPt: 'Hotel service.' },
      ]},
      { type: 'choice', promptPt: 'Will I get a refund? — pergunta sobre:', options: [
        { labelEn: 'Getting money back.', correct: true, feedbackPt: 'Refund = reembolso.' },
        { labelEn: 'Changing the time.', correct: false, feedbackPt: 'Isso seria change/reschedule.' },
        { labelEn: 'Confirming the booking.', correct: false, feedbackPt: 'Confirmation — diferente.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Reagendar semana que vem.', templateEn: 'Can I ___ for next week?', blankLabel: 'verbo', options: [
        { labelEn: 'reschedule', correct: true, feedbackPt: 'Reschedule = reagendar.' },
        { labelEn: 'reservation', correct: false, feedbackPt: 'Reservation é substantivo.' },
        { labelEn: 'reserve', correct: false, feedbackPt: 'Reserve = reservar, não reagendar.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Reception: Cancellation policy?', speaker: 'You', contextEn: 'You want to cancel without fee.', options: [
        { labelEn: 'Can I cancel without a fee? What\'s the policy?', correct: true, feedbackPt: 'Pergunta direta.' },
        { labelEn: 'Where is the subway?', correct: false, feedbackPt: 'Transporte.' },
        { labelEn: 'Medium-rare, please.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Das 19h às 20h.', tokens: ['PM.', '8', 'to', '7', 'from', 'PM,'], correctOrder: ['from', '7', 'PM,', 'to', '8', 'PM.'], feedbackCorrectPt: 'From 7 PM to 8 PM.', feedbackWrongPt: 'From X to Y.' },
      { type: 'choice', promptPt: "I can't make it significa:", options: [
        { labelEn: "I can't go / attend.", correct: true, feedbackPt: 'Não posso comparecer.' },
        { labelEn: "I can't cook.", correct: false, feedbackPt: 'Make it = comparecer aqui.' },
        { labelEn: "I can't speak English.", correct: false, feedbackPt: 'Contexto diferente.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Cancel and reschedule:', speaker: 'You', contextEn: 'Your meeting was cancelled.', options: [
        { labelEn: "I'd like to cancel tomorrow. Can I reschedule for next week?", correct: true, feedbackPt: 'Cancel + reschedule.' },
        { labelEn: 'Nothing to declare.', correct: false, feedbackPt: 'Customs.' },
        { labelEn: 'You should drink water.', correct: false, feedbackPt: 'M7.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m08-l06-travel-clarification',
    moduleNumber: 8,
    goalPt: 'Pedir esclarecimento e resolver problemas de comunicação — repeat, slower, I didn\'t understand, could you explain?',
    intro: {
      titleEn: 'Clarification & problems',
      titlePt: 'Esclarecimento e problemas',
      bodyPt: 'Quando não entende — peça repetição, fale mais devagar, confirme informação. Essencial em viagem.',
    },
    scenario: {
      settingEn: 'Airport announcement · Fast speech',
      scenarioPt: 'Anúncio rápido no aeroporto. Você não entendeu — precisa pedir esclarecimento.',
    },
    ctxChoices: [
      {
        speaker: 'You',
        promptEn: 'Didn\'t understand the announcement',
        promptPt: 'Não entendeu anúncio.',
        options: [
          { labelEn: 'Sorry, I didn\'t catch that. Could you repeat it, please?', correct: true, feedbackPt: 'Didn\'t catch = não ouvi/entendi.' },
          { labelEn: 'Sorry, I didn\'t catched that.', correct: false, feedbackPt: 'Catch — irregular: caught, mas aqui didn\'t catch (base).' },
          { labelEn: 'I am not understand.', correct: false, feedbackPt: 'I don\'t understand — presente.' },
        ],
      },
      {
        speaker: 'Staff',
        promptEn: 'Speaking too fast',
        promptPt: 'Falando rápido demais.',
        options: [
          { labelEn: 'Could you speak more slowly, please?', correct: true, feedbackPt: 'More slowly — pedido comum.' },
          { labelEn: 'Could you speak more slow?', correct: false, feedbackPt: 'Slowly — advérbio.' },
          { labelEn: 'Speak slowlier please.', correct: false, feedbackPt: 'Slowlier não existe.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Asking to repeat',
        titlePt: 'Pedir repetição',
        introPt: 'Quando não ouviu ou não entendeu.',
        examples: [
          { en: 'Could you repeat that, please?', pt: 'Pode repetir?' },
          { en: 'Sorry, I didn\'t catch that.', pt: 'Não entendi/captou.' },
          { en: 'Pardon? / Sorry?', pt: 'Como? / Desculpa?' },
          { en: 'What was that again?', pt: 'Como era mesmo?' },
        ],
      },
      {
        titleEn: 'Slow down & clarify',
        titlePt: 'Mais devagar e esclarecer',
        introPt: 'Peça ritmo e explicação.',
        examples: [
          { en: 'Could you speak more slowly?', pt: 'Mais devagar?' },
          { en: 'I don\'t understand.', pt: 'Não entendo.' },
          { en: 'Could you explain that?', pt: 'Pode explicar?' },
          { en: 'Do you mean gate B or D?', pt: 'Portão B ou D?' },
        ],
      },
      {
        titleEn: 'Confirming information',
        titlePt: 'Confirmar informação',
        introPt: 'Repita para confirmar — evita erro.',
        examples: [
          { en: 'So the gate is C8?', pt: 'Então portão C8?' },
          { en: 'Just to confirm — 7 PM on Friday?', pt: 'Só confirmando — sexta 19h?' },
          { en: 'Did you say terminal 2?', pt: 'Disse terminal 2?' },
        ],
      },
    ],
    languageFocus: {
      titleEn: 'Catch vs Understand',
      titlePt: 'Catch vs Understand',
      items: [
        { formalEn: 'I did not understand what you said.', naturalEn: "Sorry, I didn't catch that.", notePt: "Didn't catch = informal, muito comum." },
        { formalEn: 'Please reduce your speaking speed.', naturalEn: 'Could you speak more slowly?', notePt: 'More slowly — advérbio.' },
      ],
      tipPt: "I didn't catch that = não ouvi/entendi (tom casual). I don't understand = não compreendo (geral).",
    },
    mistake: {
      titlePt: 'Erro comum de brasileiros',
      wrongEn: 'Could you repeat me that slowly?',
      rightEn: 'Could you repeat that more slowly, please?',
      explanationPt: 'Repeat that (não repeat me that). More slowly — advérbio.',
    },
    review: [
      { en: "I didn't catch that.", pt: 'não entendi' },
      { en: 'Could you speak more slowly?', pt: 'mais devagar' },
      { en: 'Could you explain?', pt: 'explicar' },
      { en: 'Just to confirm...', pt: 'confirmar' },
    ],
    readRepeat: {
      phrases: [
        'Sorry, I didn\'t catch that.',
        'Could you repeat that, please?',
        'Could you speak more slowly?',
        'I don\'t understand. Could you explain?',
        'Do you mean gate B or D?',
        'Just to confirm — terminal 2?',
      ],
      dialogueEn:
        'Your flight departs from— — Sorry, I didn\'t catch that. Could you repeat? — Gate C8, terminal 2. — Could you speak more slowly? — Gate C8. Terminal two. — Just to confirm — C8, terminal 2? — Correct!',
    },
    mission: {
      headlineEn: 'You can ask for clarification when traveling.',
      headlinePt: 'Você consegue pedir esclarecimento em viagem.',
      canDo: ["Didn't catch that", 'Repeat / more slowly', 'Could you explain?', 'Just to confirm...'],
      production: {
        introPt: 'Simule: não entendeu informação de portão — peça repetição, devagar e confirme.',
        prompts: [{ speaker: 'Staff', questionEn: 'Your connection departs from gate C8, terminal 2, boarding at 4:15.' }],
        fields: [
          { id: 'clarify', labelPt: 'Pedir esclarecimento', prefixEn: '', placeholderEn: "Sorry, I didn't catch that. Could you repeat more slowly?" },
          { id: 'confirm', labelPt: 'Confirmar', prefixEn: '', placeholderEn: 'Just to confirm — gate C8, terminal 2, boarding at 4:15?' },
        ],
        exampleEn: "Sorry, I didn't catch that. Could you speak more slowly? — Just to confirm: gate C8, terminal 2?",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Não entendi (informal):', options: [
        { labelEn: "Sorry, I didn't catch that.", correct: true, feedbackPt: "Didn't catch — comum." },
        { labelEn: "Sorry, I didn't catched that.", correct: false, feedbackPt: "Didn't + base." },
        { labelEn: 'I am not catch.', correct: false, feedbackPt: 'Gramática incorreta.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Fale mais devagar.', templateEn: 'Could you speak more ___?', blankLabel: 'advérbio', options: [
        { labelEn: 'slowly', correct: true, feedbackPt: 'Slowly — advérbio.' },
        { labelEn: 'slow', correct: false, feedbackPt: 'Slow é adjetivo.' },
        { labelEn: 'slowlier', correct: false, feedbackPt: 'Não existe.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Pode repetir, por favor?', tokens: ['please?', 'that,', 'repeat', 'you', 'Could'], correctOrder: ['Could', 'you', 'repeat', 'that,', 'please?'], feedbackCorrectPt: 'Could you repeat that, please?', feedbackWrongPt: 'Could you repeat...' },
      { type: 'dialogue_complete', promptPt: 'Staff speaks fast. You ask:', speaker: 'You', contextEn: 'Staff gives directions quickly.', options: [
        { labelEn: 'Could you speak more slowly, please?', correct: true, feedbackPt: 'Pedido educado.' },
        { labelEn: 'You should rest more.', correct: false, feedbackPt: 'M7.' },
        { labelEn: 'I cancel my reservation.', correct: false, feedbackPt: 'M8 L05.' },
      ]},
      { type: 'choice', promptPt: 'Just to confirm — usa-se para:', options: [
        { labelEn: 'Double-check information.', correct: true, feedbackPt: 'Confirmar antes de agir.' },
        { labelEn: 'Cancel a booking.', correct: false, feedbackPt: 'Cancel — diferente.' },
        { labelEn: 'Order food.', correct: false, feedbackPt: 'Restaurante.' },
      ]},
      { type: 'fill_blank', promptPt: 'Complete: Pode explicar?', templateEn: 'Could you ___ that?', blankLabel: 'verbo', options: [
        { labelEn: 'explain', correct: true, feedbackPt: 'Explain that.' },
        { labelEn: 'explanation', correct: false, feedbackPt: 'Substantivo.' },
        { labelEn: 'explaining', correct: false, feedbackPt: 'Could you + base.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Confirm gate:', speaker: 'You', contextEn: 'Staff said gate B or D — unclear.', options: [
        { labelEn: 'Do you mean gate B or D?', correct: true, feedbackPt: 'Esclarecer opções.' },
        { labelEn: 'I prefer tea to coffee.', correct: false, feedbackPt: 'M7.' },
        { labelEn: 'Rent a car, please.', correct: false, feedbackPt: 'Transporte.' },
      ]},
      { type: 'reorder', promptPt: 'Monte: Só confirmando — portão C8?', tokens: ['C8?', 'gate', 'is', 'the', 'confirm', 'to', 'Just', '—', 'So'], correctOrder: ['Just', 'to', 'confirm', '—', 'So', 'the', 'gate', 'is', 'C8?'], feedbackCorrectPt: 'Just to confirm — So the gate is C8?', feedbackWrongPt: 'Just to confirm...' },
      { type: 'choice', promptPt: 'Pardon? em viagem significa:', options: [
        { labelEn: 'Sorry? / What did you say?', correct: true, feedbackPt: 'Pedir repetição — UK comum.' },
        { labelEn: 'I am guilty.', correct: false, feedbackPt: 'Pardon tem outro sentido legal.' },
        { labelEn: 'Goodbye.', correct: false, feedbackPt: 'Despedida.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Full clarification flow:', speaker: 'You', contextEn: 'Fast announcement at airport.', options: [
        { labelEn: "Sorry, I didn't catch that. Could you repeat more slowly? Just to confirm — gate C8?", correct: true, feedbackPt: 'Fluxo completo L06.' },
        { labelEn: 'Nothing to declare. Medium-rare.', correct: false, feedbackPt: 'Mistura contextos.' },
        { labelEn: 'I exercise three times a week.', correct: false, feedbackPt: 'M7.' },
      ]},
    ],
  },

  {
    contentKey: 'elem-m08-l07-travel-problem-challenge',
    moduleNumber: 8,
    challenge: true,
    goalPt: 'Desafio cumulativo M8 — aeroporto, hotel, transporte, reservas, cancelamentos e esclarecimento.',
    intro: {
      titleEn: 'Travel Problem Challenge',
      titlePt: 'Desafio Problema de Viagem',
      bodyPt: 'Um dia difícil de viagem: conexão apertada, problema no hotel, reserva alterada e comunicação com staff.',
    },
    scenario: {
      settingEn: 'Travel day gone wrong · Airport → hotel → phone calls',
      scenarioPt: 'Voo atrasado, bagagem extraviada, hotel sem Wi-Fi, reserva de jantar para mudar — resolva tudo em inglês.',
    },
    ctxChoices: [
      {
        speaker: 'Agent',
        promptEn: 'Your connection is tight — gate changed to D4.',
        promptPt: 'Passo 1 — aeroporto.',
        options: [
          { labelEn: 'Sorry, I didn\'t catch that. Gate D4? Which terminal?', correct: true, feedbackPt: 'L06 clarificação + L01 aeroporto.' },
          { labelEn: 'I am allergic to nuts.', correct: false, feedbackPt: 'M7.' },
          { labelEn: 'You should rest.', correct: false, feedbackPt: 'M7.' },
        ],
      },
      {
        speaker: 'Reception',
        promptEn: 'Welcome! How can I help?',
        promptPt: 'Passo 2 — hotel.',
        options: [
          { labelEn: 'I have a reservation under Silva. The Wi-Fi isn\'t working — could someone take a look?', correct: true, feedbackPt: 'L04 reserva + L02 serviços.' },
          { labelEn: 'Where is baggage claim?', correct: false, feedbackPt: 'Já passou — ou ainda no aeroporto.' },
          { labelEn: 'One-way ticket, please.', correct: false, feedbackPt: 'Transporte.' },
        ],
      },
      {
        speaker: 'Host',
        promptEn: 'Restaurant — your 7 PM booking',
        promptPt: 'Passo 3 — alterar reserva.',
        options: [
          { labelEn: 'I need to change my reservation to 9 PM. Something came up.', correct: true, feedbackPt: 'L05 changes.' },
          { labelEn: 'I\'d like to rent a car.', correct: false, feedbackPt: 'L03 — contexto errado agora.' },
          { labelEn: 'Nothing to declare.', correct: false, feedbackPt: 'Customs.' },
        ],
      },
      {
        speaker: 'Staff',
        promptEn: 'Taxi to the conference center?',
        promptPt: 'Passo 4 — transporte.',
        options: [
          { labelEn: 'Yes — how much to the conference center? Could you call a taxi?', correct: true, feedbackPt: 'L03 transporte.' },
          { labelEn: 'Late check-out until 2 PM.', correct: false, feedbackPt: 'Hotel — passo anterior.' },
          { labelEn: 'Cancel my flight refund.', correct: false, feedbackPt: 'Frase confusa.' },
        ],
      },
    ],
    phraseBlocks: [
      {
        titleEn: 'Module 8 review',
        titlePt: 'Revisão Módulo 8',
        introPt: 'Tudo do módulo de viagem e serviços.',
        examples: [
          { en: 'connecting flight / baggage claim', pt: 'L01 aeroporto' },
          { en: 'wake-up call / isn\'t working', pt: 'L02 hotel' },
          { en: 'rent a car / one-way ticket', pt: 'L03 transporte' },
          { en: 'book a table / under the name', pt: 'L04 reservas' },
          { en: 'change / cancel / reschedule', pt: 'L05 alterações' },
          { en: "didn't catch / speak slowly", pt: 'L06 esclarecimento' },
        ],
      },
    ],
    review: [
      { en: 'Airport expanded', pt: 'L01' },
      { en: 'Hotel services', pt: 'L02' },
      { en: 'Transport & renting', pt: 'L03' },
      { en: 'Reservations & changes', pt: 'L04–L05' },
      { en: 'Clarification', pt: 'L06' },
    ],
    readRepeat: {
      phrases: [
        "Sorry, I didn't catch that — gate D4?",
        'I have a reservation. The Wi-Fi isn\'t working.',
        'I need to change my reservation to 9 PM.',
        'How much to the conference center?',
      ],
      dialogueEn:
        'Gate changed to D4! — Sorry, didn\'t catch that — D4? — Yes, terminal 2. — Hotel: reservation under Silva. Wi-Fi isn\'t working! — Restaurant: change to 9 PM, something came up. — Taxi to conference center? — How much? Call one, please.',
    },
    mission: {
      headlineEn: 'Solve the travel problem scenario.',
      headlinePt: 'Resolva o cenário de problema de viagem.',
      bodyPt: 'Integre M8: aeroporto → hotel → reserva → transporte, usando esclarecimento quando necessário.',
      canDo: ['Airport + clarification', 'Hotel + reservation', 'Change booking', 'Transport'],
      production: {
        introPt: 'Simule o dia difícil: 4 momentos em frases curtas.',
        prompts: [
          { speaker: 'Agent', questionEn: 'Gate changed to D4, terminal 2.' },
          { speaker: 'Reception', questionEn: 'How can I help?' },
          { speaker: 'Host', questionEn: 'Your 7 PM reservation?' },
          { speaker: 'Local', questionEn: 'Need a ride?' },
        ],
        fields: [
          { id: 'airport_hotel', labelPt: 'Aeroporto + hotel', prefixEn: '', placeholderEn: "Didn't catch that — D4? Reservation under Silva. Wi-Fi isn't working." },
          { id: 'booking_transport', labelPt: 'Reserva + transporte', prefixEn: '', placeholderEn: 'Change reservation to 9 PM. How much to conference center? Call a taxi, please.' },
        ],
        exampleEn: "Gate D4? Terminal 2? — Reservation Silva, Wi-Fi broken please. — Change dinner to 9 PM. — Taxi to conference center — how much?",
      },
    },
    practice: [
      { type: 'choice', promptPt: 'Desafio M8 — clarificação no aeroporto:', options: [
        { labelEn: "Sorry, I didn't catch that. Gate D4?", correct: true, feedbackPt: 'L06 + L01.' },
        { labelEn: 'Without cheese, please.', correct: false, feedbackPt: 'M7.' },
        { labelEn: 'I exercise daily.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Hotel problem:', speaker: 'You', contextEn: 'Check-in + Wi-Fi broken.', options: [
        { labelEn: 'I have a reservation under Silva. The Wi-Fi isn\'t working — could someone take a look?', correct: true, feedbackPt: 'L04 + L02.' },
        { labelEn: 'My bag didn\'t arrive at baggage claim.', correct: false, feedbackPt: 'Aeroporto — pode ser antes, mas cenário atual é hotel.' },
        { labelEn: 'You shouldn\'t skip meals.', correct: false, feedbackPt: 'M7.' },
      ]},
      { type: 'fill_blank', promptPt: 'Alterar reserva:', templateEn: 'I need to ___ my reservation to 9 PM.', blankLabel: 'verbo', options: [
        { labelEn: 'change', correct: true, feedbackPt: 'L05.' },
        { labelEn: 'changed', correct: false, feedbackPt: 'Need to + base.' },
        { labelEn: 'changing', correct: false, feedbackPt: 'Need to + base.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Transport:', speaker: 'You', contextEn: 'Need taxi to conference.', options: [
        { labelEn: 'How much to the conference center? Could you call a taxi, please?', correct: true, feedbackPt: 'L03.' },
        { labelEn: 'I\'d like to cancel my reservation.', correct: false, feedbackPt: 'L05 — contexto diferente.' },
        { labelEn: 'Room service, please.', correct: false, feedbackPt: 'L02 — já no hotel.' },
      ]},
      { type: 'reorder', promptPt: 'Bagagem extraviada:', tokens: ['arrive.', "didn't", 'bag', 'My'], correctOrder: ['My', 'bag', "didn't", 'arrive.'], feedbackCorrectPt: "My bag didn't arrive.", feedbackWrongPt: 'L01.' },
      { type: 'choice', promptPt: 'Cancel + reason:', options: [
        { labelEn: "Something came up — I can't make it.", correct: true, feedbackPt: 'L05.' },
        { labelEn: 'Something came down.', correct: false, feedbackPt: 'Came up — fixed phrase.' },
        { labelEn: 'I can make it something.', correct: false, feedbackPt: 'Ordem errada.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Confirm reservation details:', speaker: 'You', contextEn: 'Host confirms Friday 8 PM, four people.', options: [
        { labelEn: "So that's Friday at 8 PM for four people?", correct: true, feedbackPt: 'L04 confirm.' },
        { labelEn: 'Gate C8, terminal 2?', correct: false, feedbackPt: 'Aeroporto.' },
        { labelEn: 'Automatic, please.', correct: false, feedbackPt: 'Car rental.' },
      ]},
      { type: 'fill_blank', promptPt: 'Late check-out:', templateEn: 'Could I have a ___ check-out?', blankLabel: 'tipo', options: [
        { labelEn: 'late', correct: true, feedbackPt: 'L02.' },
        { labelEn: 'later', correct: false, feedbackPt: 'Late check-out — nome do serviço.' },
        { labelEn: 'delay', correct: false, feedbackPt: 'Delay check-out — não usado.' },
      ]},
      { type: 'choice', promptPt: 'Este desafio cobre:', options: [
        { labelEn: 'Full Module 8 — travel & services.', correct: true, feedbackPt: 'Desafio cumulativo M8.' },
        { labelEn: 'Only airport vocabulary.', correct: false, feedbackPt: 'M8 inteiro.' },
        { labelEn: 'START level content.', correct: false, feedbackPt: 'ELEMENTARY.' },
      ]},
      { type: 'dialogue_complete', promptPt: 'Full scenario — first response:', speaker: 'You', contextEn: 'Agent: Gate changed to D4, boarding in 20 minutes, terminal 2.', options: [
        { labelEn: "Sorry, I didn't catch that. D4, terminal 2? Boarding in 20 minutes?", correct: true, feedbackPt: 'Clarificação + confirmação — início perfeito do desafio.' },
        { labelEn: 'I love Italian food. Without cheese.', correct: false, feedbackPt: 'M7.' },
        { labelEn: 'I worked late yesterday.', correct: false, feedbackPt: 'M4.' },
      ]},
    ],
  },
];
