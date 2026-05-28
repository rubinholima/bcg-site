/** Seção do manual de conduta para imprensa (editável no dashboard). */
export interface ImprensaCondutaSection {
  id: string;
  titlePt: string;
  titleEn: string;
  bodyPt: string;
  bodyEn: string;
}

export function buildDefaultImprensaCondutaSections(clubName = "Clube"): ImprensaCondutaSection[] {
  const c = clubName.trim() || "Clube";
  return [
    {
      id: "apresentacao",
      titlePt: "Apresentação e objetivo",
      titleEn: "Introduction and purpose",
      bodyPt: `O ${c} (SAF) disponibiliza este Manual de Operação e Conduta para Imprensa com o objetivo de orientar profissionais de comunicação, fotógrafos, cinegrafistas e repórteres sobre credenciamento, acesso às dependências, filmagem, entrevistas e uso de imagens em dias de jogo, treinos abertos e eventos institucionais.

O cumprimento destas diretrizes garante segurança, fluidez da cobertura e respeito às normas da CBF, dos campeonatos e às políticas internas do clube.`,
      bodyEn: `${c} provides this Press Operations and Conduct Manual to guide media professionals on accreditation, access, filming, interviews and image use on match days, open training sessions and institutional events.`,
    },
    {
      id: "credenciamento",
      titlePt: "Credenciamento e solicitação de acesso",
      titleEn: "Accreditation and access requests",
      bodyPt: `• Solicitações devem ser feitas com no mínimo 48 horas de antecedência (72 h para jogos de mando de campo em finais ou partidas de grande público).
• Envie: nome completo, CPF, veículo de comunicação, função (repórter, fotógrafo, cinegrafista), contato (e-mail e celular) e partida/evento de interesse.
• O credenciamento é pessoal e intransferível. Crachá e colete devem ser exibidos de forma visível o tempo todo.
• A assessoria de imprensa do ${c} reserva-se o direito de limitar vagas na tribuna de imprensa conforme capacidade e normas do estádio.`,
      bodyEn: `Requests must be submitted at least 48 hours in advance. Send full name, ID, media outlet, role and contact. Accreditation is personal and non-transferable.`,
    },
    {
      id: "documentacao",
      titlePt: "Documentação e identificação",
      titleEn: "Documentation and identification",
      bodyPt: `No dia do evento, apresente documento oficial com foto (RG ou CNH) e, quando aplicável, carteira profissional da entidade de classe ou credencial do veículo.

Veículos de imprensa devem informar placa e modelo para liberação de estacionamento, quando disponível. Motos e equipamentos volumosos devem ser declarados previamente.`,
      bodyEn: `On event day, present official photo ID and professional press credentials when applicable. Inform vehicle details for parking when available.`,
    },
    {
      id: "horarios",
      titlePt: "Horários de acesso",
      titleEn: "Access times",
      bodyPt: `• Tribuna de imprensa e mixed zone: abertura em geral 90 minutos antes do apito inicial, salvo orientação contrária da organização do campeonato.
• Intervalo: permanência permitida na tribuna; acesso ao vestiário segue regras da competição (em geral apenas entrevistas flash autorizadas).
• Pós-jogo: coletivas e mixed zone conforme cronograma divulgado pela assessoria — permanência máxima de 30 minutos após o encerramento, salvo autorização expressa.`,
      bodyEn: `Press box and mixed zone typically open 90 minutes before kick-off. Post-match access follows the schedule announced by the press office.`,
    },
    {
      id: "areas",
      titlePt: "Áreas permitidas e restritas",
      titleEn: "Permitted and restricted areas",
      bodyPt: `PERMITIDAS (com credencial): tribuna de imprensa, sala de imprensa (quando existir), mixed zone, campo perimetral apenas durante entrevistas autorizadas, área de entrevista técnica pós-jogo.

RESTRITAS (proibido acesso): vestiários (salvo convocação oficial), sala de massagem, refeitório, área médica, campo de jogo durante o aquecimento sem escolta, túnel de acesso sem autorização, banco de reservas e área reservada a delegações.`,
      bodyEn: `Permitted: press box, mixed zone, authorized interview areas. Restricted: locker rooms (unless officially called), medical area, pitch during warm-up without escort.`,
    },
    {
      id: "filmagem",
      titlePt: "Filmagem, fotografia e equipamentos",
      titleEn: "Filming, photography and equipment",
      bodyPt: `• Flash: permitido na tribuna; evitar flash direto em atletas durante entrevistas a menos que autorizado.
• Drones: proibidos no entorno do estádio sem autorização prévia por escrito da organização e órgãos de aviação.
• Tripe/monopé: permitido na tribuna com espaço reduzido — não obstruir circulação.
• Transmissão ao vivo: comunicar previamente à assessoria para evitar conflito de exclusividade.`,
      bodyEn: `Flash allowed in press box with care. Drones prohibited without written authorization. Live broadcasts must be announced in advance.`,
    },
    {
      id: "entrevistas",
      titlePt: "Entrevistas e coletivas",
      titleEn: "Interviews and press conferences",
      bodyPt: `Entrevistas com atletas e comissão técnica devem ser agendadas ou realizadas em áreas designadas (mixed zone, sala de imprensa). Abordagens no estacionamento ou saída não autorizada de atletas menores de idade são proibidas.

Coletivas oficiais têm prioridade. Mantenha silêncio durante perguntas de colegas e respeite o tempo máximo por entrevistado.`,
      bodyEn: `Interviews must take place in designated areas. Approaching minors without authorization is prohibited. Official press conferences take priority.`,
    },
    {
      id: "direitos",
      titlePt: "Direitos de imagem e crédito",
      titleEn: "Image rights and credit",
      bodyPt: `Fotos e vídeos produzidos em dias de jogo do ${c} podem ser utilizados para fins jornalísticos e editoriais, com crédito ao autor e menção ao clube quando aplicável.

Uso comercial, licenciamento a terceiros, montagens que associem o clube a marcas sem autorização ou alteração que comprometa a imagem institucional exigem autorização prévia por escrito da assessoria de imprensa.`,
      bodyEn: `Match-day content may be used for editorial purposes with proper credit. Commercial use requires prior written authorization.`,
    },
    {
      id: "conduta",
      titlePt: "Conduta, segurança e proibições",
      titleEn: "Conduct, safety and prohibitions",
      bodyPt: `É proibido: consumo de bebidas alcoólicas nas áreas de imprensa; provocações a torcidas ou delegações; ingresso em campo sem credencial específica; divulgação de informações médicas ou contratuais não oficiais; gravação de conversas privadas de atletas.

O descumprimento pode resultar em revogação imediata do credenciamento e impedimento de coberturas futuras.`,
      bodyEn: `Alcohol, provocation, unauthorized pitch access and sharing non-official medical/contract information are prohibited. Violations may lead to accreditation revocation.`,
    },
    {
      id: "fora-casa",
      titlePt: "Jogos fora de casa",
      titleEn: "Away matches",
      bodyPt: `Em jogos como visitante, o credenciamento segue as regras do clube mandante. O ${c} repassa orientações quando atua como intermediário; na dúvida, contate a assessoria com antecedência para apoio junto ao clube anfitrião.`,
      bodyEn: `Away games follow host club rules. Contact our press office in advance for support with the host club.`,
    },
    {
      id: "contato",
      titlePt: "Contato da assessoria de imprensa",
      titleEn: "Press office contact",
      bodyPt: `Para credenciamento, entrevistas, materiais oficiais (logo, hino, manual de marca) e dúvidas sobre este manual, utilize os canais indicados nesta página (e-mail, telefone e WhatsApp).

Informe sempre: data do jogo, campeonato, mandante x visitante, categoria e prazo de publicação.`,
      bodyEn: `For accreditation, interviews, official assets and questions about this manual, use the contact channels on this page. Always include match date, competition and deadline.`,
    },
  ];
}

export const DEFAULT_IMPRENSA_RELEASE_PT =
  "Bem-vindo à Central de Imprensa oficial. Aqui você encontra materiais do clube para cobertura jornalística: logo em alta resolução, hino, manual de marca, manual de conduta para credenciamento e acervo fotográfico das partidas.\n\nPara credenciamento em jogos e treinos, entre em contato com a assessoria com antecedência mínima de 48 horas.";

export const DEFAULT_IMPRENSA_RELEASE_EN =
  "Welcome to the official Press Center. Download club assets, anthem, brand guidelines, conduct manual and match photo archive.\n\nFor match and training accreditation, contact the press office at least 48 hours in advance.";
