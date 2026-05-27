import type { PageContentDto } from './pages.service';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1920&q=80';
const CTA_BG =
  'https://images.unsplash.com/photo-1511578314322-379afb476865?w=1920&q=80';

/** Conteúdo inicial da página pública do Boston City Hall (Construção Web). */
export function buildBostonCityHallPageContent(): PageContentDto {
  return {
    theme: {
      defaultLang: 'pt',
      backgroundColor: '#0f0f12',
      accentColor: '#fbbf24',
      titleAlign: 'left',
    },
    blocks: [
      {
        id: 'header',
        type: 'header',
        sortOrder: 0,
        config: {
          headerPreset: 'classic',
          backgroundMode: 'solid',
          backgroundColor: '#18181b',
          headerTextColor: '#ffffff',
          linkStyle: 'text',
          logoSize: 'md',
          sticky: true,
          borderBottom: true,
          borderColor: 'rgba(255,255,255,0.08)',
          showLanguage: true,
          showHomeLink: false,
          headerLinks: [
            { label: 'Espaços', href: '#espacos' },
            { label: 'Agenda', href: '#agenda' },
            { label: 'Como funciona', href: '#como-funciona' },
            { label: 'Solicitar evento', href: '#solicitar' },
            { label: 'FAQ', href: '#faq' },
          ],
        },
      },
      {
        id: 'hero',
        type: 'hero',
        sortOrder: 1,
        config: {
          titlePt: 'Um grande evento não importa o tamanho.',
          titleEn: 'A great event knows no size limit.',
          subtitlePT: 'Faça seu evento no Boston City Hall',
          subtitleEN: 'Host your event at Boston City Hall',
          descriptionPT:
            'Shows, corporativos, confraternizações e experiências exclusivas em um espaço pensado para impressionar — com operação integrada do Boston City Group.',
          descriptionEN:
            'Shows, corporate events, celebrations and exclusive experiences in a venue built to impress — backed by Boston City Group operations.',
          heroSlides: [{ url: HERO_IMAGE, titlePt: '', titleEn: '' }],
          heroCarouselEffect: 'fade',
          heroCarouselIntervalSeconds: 10,
          heroHeight: 'large',
          contentAlign: 'center',
          verticalAlign: 'center',
          titleSize: '3xl',
          subtitleStyle: 'uppercase',
          backgroundOverlayOpacity: 0.72,
          overlayMode: 'gradient-bottom',
          primaryCTA: {
            labelPT: 'Solicitar evento',
            labelEN: 'Request a quote',
            href: '#solicitar',
          },
          secondaryCTA: {
            labelPT: 'Ver espaços',
            labelEN: 'View spaces',
            href: '#espacos',
            variant: 'outline',
          },
        },
      },
      {
        id: 'highlights',
        type: 'highlights',
        sortOrder: 2,
        config: {
          backgroundColor: '#18181b',
          highlightsPt: [
            'Estrutura premium para eventos de pequeno, médio e grande porte',
            'Localização estratégica com acesso facilitado e estacionamento',
            'Operação BCG: produção, hospitalidade e mídia no mesmo ecossistema',
          ],
          highlightsEn: [
            'Premium infrastructure for small, medium and large-scale events',
            'Strategic location with easy access and parking',
            'BCG operations: production, hospitality and media in one ecosystem',
          ],
          highlightsIcons: ['Building2', 'Globe', 'Layers'],
        },
      },
      {
        id: 'numeros',
        type: 'numeros',
        sortOrder: 3,
        config: {
          titlePt: 'Capacidade e formatos',
          titleEn: 'Capacity and formats',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          backgroundColor: '#0f0f12',
          numerosItems: [
            { value: 800, labelPt: 'Pessoas em pé (salão principal)', labelEn: 'Standing (main hall)' },
            { value: 350, labelPt: 'Auditório / jantar', labelEn: 'Auditorium / seated dinner' },
            { value: 6, labelPt: 'Espaços modulares', labelEn: 'Modular spaces' },
            { value: 24, labelPt: 'Horas de operação (sob consulta)', labelEn: 'Operating hours (on request)' },
          ],
        },
      },
      {
        id: 'espacos',
        type: 'diferenciais',
        sortOrder: 4,
        config: {
          titlePt: 'Conheça os espaços',
          titleEn: 'Discover our spaces',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          backgroundColor: '#18181b',
          backgroundOverlayOpacity: 0.75,
          diferenciaisItems: [
            {
              icon: 'Building2',
              titlePt: 'Salão principal',
              titleEn: 'Main hall',
              bodyPt:
                'Ideal para shows, convenções, lançamentos e eventos corporativos de grande porte. Campo de visão amplo, iluminação profissional e montagem flexível.',
              bodyEn:
                'Ideal for shows, conventions, launches and large corporate events. Wide sightlines, professional lighting and flexible setup.',
            },
            {
              icon: 'Star',
              titlePt: 'Lounge VIP',
              titleEn: 'VIP lounge',
              bodyPt:
                'Relacionamento, coquetéis e experiências exclusivas com vista privilegiada. Recepção independente e ambiente sofisticado para até 250 pessoas em auditório.',
              bodyEn:
                'Relationship events, cocktails and exclusive experiences with premium views. Independent reception and refined atmosphere for up to 250 in auditorium format.',
            },
            {
              icon: 'Users',
              titlePt: 'Espaços corporativos',
              titleEn: 'Corporate spaces',
              bodyPt:
                'Happy hours, plenárias, ativações de marca e reuniões. Formatos em pé ou sentado, com infraestrutura de AV e catering dedicado.',
              bodyEn:
                'Happy hours, plenaries, brand activations and meetings. Standing or seated formats with AV infrastructure and dedicated catering.',
            },
            {
              icon: 'Trophy',
              titlePt: 'Zona de experiência',
              titleEn: 'Experience zone',
              bodyPt:
                'Festas, aniversários, eventos sociais e ativações imersivas. Acesso estratégico e cenário versátil para produções criativas.',
              bodyEn:
                'Parties, birthdays, social events and immersive activations. Strategic access and a versatile setting for creative productions.',
            },
            {
              icon: 'Globe',
              titlePt: 'Anéis de circulação',
              titleEn: 'Circulation rings',
              bodyPt:
                'Áreas distribuídas pela arena para exposições, feiras e ativações simultâneas — de 500 a 2.000+ visitantes conforme layout.',
              bodyEn:
                'Distributed areas across the venue for exhibitions, fairs and simultaneous activations — from 500 to 2,000+ visitors depending on layout.',
            },
            {
              icon: 'Award',
              titlePt: 'Hospitalidade integrada',
              titleEn: 'Integrated hospitality',
              bodyPt:
                'Parceiros de gastronomia, bar e serviços do ecossistema BCG para elevar a experiência do seu evento do início ao fim.',
              bodyEn:
                'Gastronomy, bar and service partners from the BCG ecosystem to elevate your event experience from start to finish.',
            },
          ],
        },
      },
      {
        id: 'sobre-bch',
        type: 'text',
        sortOrder: 5,
        config: {
          titlePt: 'Boston City Hall',
          titleEn: 'Boston City Hall',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          bodyPt:
            'O Boston City Hall é o venue oficial do Boston City Group para eventos esportivos, corporativos e de entretenimento. Inspirado nas melhores arenas do mundo, reunimos infraestrutura de nível internacional com a agilidade de uma operação integrada — do primeiro contato à desmontagem.\n\nEnquanto outros rodam o mundo em busca de uma experiência única, aqui você encontra tudo no mesmo lugar: espaços modulares, equipe especializada e a credibilidade do grupo.',
          bodyEn:
            'Boston City Hall is Boston City Group\'s official venue for sports, corporate and entertainment events. Inspired by the world\'s best arenas, we combine international-grade infrastructure with the agility of an integrated operation — from first contact to teardown.\n\nWhile others travel the world for a unique experience, here you find it all in one place: modular spaces, a specialized team and the group\'s credibility.',
          backgroundColor: '#0f0f12',
          visible: true,
        },
      },
      {
        id: 'agenda',
        type: 'eventos',
        sortOrder: 6,
        config: {
          titlePt: 'Agenda e próximos eventos',
          titleEn: 'Schedule and upcoming events',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          bodyPt:
            'Confira o que já está confirmado no Boston City Hall. Em breve, a reserva online estará disponível diretamente por aqui.',
          bodyEn:
            'See what is already confirmed at Boston City Hall. Online booking will be available here soon.',
          backgroundColor: '#18181b',
          visible: true,
        },
      },
      {
        id: 'como-funciona',
        type: 'como_funciona',
        sortOrder: 7,
        config: {
          titlePt: 'Como reservar seu evento',
          titleEn: 'How to book your event',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          bodyPt:
            'Processo transparente, do briefing à proposta — sem surpresas.',
          bodyEn:
            'A transparent process, from briefing to proposal — no surprises.',
          backgroundColor: '#0f0f12',
          comoFuncionaBulletsPt: [
            'Preencha o formulário com data, formato e número de convidados',
            'Nossa equipe analisa disponibilidade e encaixa o melhor espaço',
            'Você recebe proposta com layout, serviços e investimento',
            'Confirmado? Operamos montagem, evento e desmontagem com você',
          ],
          comoFuncionaBulletsEn: [
            'Fill out the form with date, format and guest count',
            'Our team checks availability and matches the best space',
            'You receive a proposal with layout, services and investment',
            'Confirmed? We run setup, event and teardown with you',
          ],
          comoFuncionaIcons: ['CheckCircle', 'CheckCircle', 'CheckCircle', 'CheckCircle'],
        },
      },
      {
        id: 'solicitar',
        type: 'formulario_captura',
        sortOrder: 8,
        config: {
          formularioCapturaTitlePt: 'Solicite seu evento',
          formularioCapturaTitleEn: 'Request your event',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          backgroundColor: '#18181b',
          formularioCapturaEndpoint: '/api/public/lead',
        },
      },
      {
        id: 'faq',
        type: 'faq',
        sortOrder: 9,
        config: {
          titlePt: 'Perguntas frequentes',
          titleEn: 'Frequently asked questions',
          titleGradientStart: '#fcd34d',
          titleGradientEnd: '#ffffff',
          backgroundColor: '#0f0f12',
          faqItems: [
            {
              questionPt: 'Quais tipos de evento posso realizar?',
              questionEn: 'What types of events can I host?',
              answerPt:
                'Corporativos, shows, confraternizações, festas, convenções, ativações de marca, lançamentos e experiências esportivas. Cada espaço tem formatos e capacidades específicas — consulte a seção Espaços.',
              answerEn:
                'Corporate events, shows, celebrations, parties, conventions, brand activations, launches and sports experiences. Each space has specific formats and capacities — see the Spaces section.',
            },
            {
              questionPt: 'Como funciona a disponibilidade de datas?',
              questionEn: 'How does date availability work?',
              answerPt:
                'A agenda considera eventos já confirmados e janelas de manutenção. Após sua solicitação, retornamos em até 2 dias úteis com opções de data e espaço.',
              answerEn:
                'The schedule accounts for confirmed events and maintenance windows. After your request, we respond within 2 business days with date and space options.',
            },
            {
              questionPt: 'Posso visitar o local antes de fechar?',
              questionEn: 'Can I visit the venue before booking?',
              answerPt:
                'Sim. Agendamos visitas técnicas para eventos acima de determinado porte ou quando necessário avaliar montagem e logística.',
              answerEn:
                'Yes. We schedule technical visits for larger events or when setup and logistics need to be assessed.',
            },
            {
              questionPt: 'Vocês oferecem catering e produção?',
              questionEn: 'Do you offer catering and production?',
              answerPt:
                'Sim. Trabalhamos com parceiros do ecossistema BCG e fornecedores homologados. Tudo pode ser incluído na proposta.',
              answerEn:
                'Yes. We work with BCG ecosystem partners and approved vendors. Everything can be included in the proposal.',
            },
            {
              questionPt: 'Qual o prazo mínimo para reserva?',
              questionEn: 'What is the minimum lead time for booking?',
              answerPt:
                'Recomendamos solicitar com pelo menos 30 dias de antecedência. Eventos de grande porte exigem planejamento maior — entre em contato o quanto antes.',
              answerEn:
                'We recommend requesting at least 30 days in advance. Large-scale events require more planning — contact us as early as possible.',
            },
          ],
        },
      },
      {
        id: 'cta-final',
        type: 'cta',
        sortOrder: 10,
        config: {
          titlePt: 'Pronto para um evento inesquecível?',
          titleEn: 'Ready for an unforgettable event?',
          bodyPt: 'Fale com nossa equipe comercial e receba uma proposta sob medida.',
          bodyEn: 'Talk to our commercial team and receive a tailored proposal.',
          ctaLayout: 'centered',
          ctaTextAlign: 'center',
          ctaContentWidth: 'normal',
          ctaBackgroundMode: 'image',
          backgroundImage: CTA_BG,
          ctaOverlayOpacity: 0.78,
          ctaBlur: false,
          ctaPreset: 'custom',
          ctaButtons: [
            {
              labelPT: 'Solicitar evento',
              labelEN: 'Request event',
              type: 'primary',
              href: '#solicitar',
              openInNewTab: false,
              highlighted: true,
            },
            {
              labelPT: 'Ver agenda',
              labelEN: 'View schedule',
              type: 'secondary',
              href: '#agenda',
              openInNewTab: false,
            },
          ],
        },
      },
      {
        id: 'footer',
        type: 'footer',
        sortOrder: 11,
        config: {
          footerText: 'Boston City Hall — Boston City Group',
          footerLinks: [
            { label: 'Boston City Group', href: 'https://www.bostoncitygroup.biz' },
          ],
          backgroundColor: '#18181b',
        },
      },
    ],
  };
}
