import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Download, ImageIcon, Mail } from "lucide-react";
import { ImprensaGaleriaAccess } from "./ImprensaGaleriaAccess";
import {
  DEFAULT_IMPRENSA_EVENT_SLUG,
  IMPRENSA_LOGO_FALLBACK_URL,
  fetchPublishedEventForPress,
} from "@/lib/imprensa-event";
import { getPublicImageUrl, isSvgUrl, resolveMediaUrlWithProxyFallback } from "@/lib/media-url";
import { ImprensaReleaseCollapsible } from "./ImprensaReleaseCollapsible";

function logoExtFromUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  const m = path.match(/\.(png|jpe?g|webp|svg)$/i);
  return m ? `.${m[1].toLowerCase().replace("jpeg", "jpg")}` : ".png";
}

const btnPrimary =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-amber-500 px-5 text-sm font-medium text-zinc-950 hover:bg-amber-400";
const btnSecondary =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-white/20 bg-zinc-900/80 px-5 text-sm font-medium text-zinc-100 hover:bg-zinc-800";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const slug = sp.event?.trim() || DEFAULT_IMPRENSA_EVENT_SLUG;
  const ev = await fetchPublishedEventForPress(slug);
  const name = ev?.name?.trim();
  return {
    title: name ? `Imprensa — ${name}` : "Central de imprensa — Boston City Group",
    description: name
      ? `Release, marca do evento, assessoria e acervo fotográfico para cobertura de ${name} e do ecossistema Boston City Group.`
      : "Release, marca do evento, assessoria e acervo fotográfico para cobertura dos eventos Boston City Group.",
  };
}

export default async function ImprensaPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  const sp = await searchParams;
  const slug = sp.event?.trim() || DEFAULT_IMPRENSA_EVENT_SLUG;
  const tournament = await fetchPublishedEventForPress(slug);
  const eventLabel = tournament?.name?.trim() || "Evento Boston City";
  const rawLogoUrl =
    (tournament?.logoUrl && tournament.logoUrl.trim()) || IMPRENSA_LOGO_FALLBACK_URL;
  const pressLogoUrl = rawLogoUrl
    ? resolveMediaUrlWithProxyFallback(rawLogoUrl) ||
      getPublicImageUrl(rawLogoUrl) ||
      (/^https?:\/\//i.test(rawLogoUrl.trim()) ? rawLogoUrl.trim() : "")
    : "";
  const hasEventLogo = Boolean(pressLogoUrl);
  const logoIsSvg = Boolean(rawLogoUrl && isSvgUrl(rawLogoUrl));
  const downloadSlug = tournament?.slug ?? slug;
  const rasterExt = rawLogoUrl ? logoExtFromUrl(rawLogoUrl) : ".png";
  const pngHref = hasEventLogo && !logoIsSvg ? pressLogoUrl : "/bcg-logo.png";
  const pngDownload =
    hasEventLogo && !logoIsSvg ? `${downloadSlug}-marca${rasterExt}` : "boston-city-group-logo.png";
  const svgHref = hasEventLogo && logoIsSvg ? pressLogoUrl : "/bcg-logo.svg";
  const svgDownload =
    hasEventLogo && logoIsSvg ? `${downloadSlug}-marca.svg` : "boston-city-group-logo.svg";
  const previewAlt = `${eventLabel} — logo oficial`;
  /** Só linka para /eventos/[slug] quando temos evento real da API; senão vai para início (evita 404 em slug inexistente) */
  const eventPageSlug = tournament?.slug?.trim() || null;
  const backHref = eventPageSlug ? `/eventos/${encodeURIComponent(eventPageSlug)}` : "/";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="container mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white">
            <Image src="/bcg-logo.png" alt="" width={36} height={36} className="h-9 w-9 object-contain rounded" />
            <span>Boston City Group</span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2">
            <Link
              href={backHref}
              className="text-sm font-medium text-zinc-300 hover:text-white"
            >
              {eventPageSlug ? "← Voltar à página do evento" : "← Início"}
            </Link>
            <a
              href="#acervo-fotos"
              className="text-sm font-medium text-amber-400 hover:text-amber-300"
            >
              Só quem tem o link ou código — ir às fotos ↓
            </a>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-widest text-amber-400/90">Release — assessoria de imprensa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl md:text-[2.25rem] md:leading-tight">
          {eventLabel}: história, território e futuro da base no coração da Zona da Mata
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          <span className="text-zinc-400">{eventLabel}</span>
          {" · "}
          Boston City FC Brasil · Boston City Group · Manhuaçu (MG)
        </p>

        <ImprensaReleaseCollapsible>
          <p className="text-xl font-medium leading-snug text-zinc-50 sm:text-2xl sm:leading-snug">
            O nome <strong className="font-semibold text-white">{eventLabel}</strong> não é moda europeia importada
            para o interior: é um abraço explícito ao chão mineiro. Manhuaçu e a Zona da Mata movem economia, cultura e
            identidade em torno do café; o torneio nasce para que o futebol de formação também pertença a esse lugar —
            com calendário próprio, público engajado e categorias de base disputadas com seriedade de competição
            internacional.
          </p>

          <p>
            Desde a <strong className="text-zinc-100">estreia em 2023</strong>, a competição passou a ocupar a janela de
            março como um dos calendários mais comentados da base na Zona da Mata e no noticiário nacional de formação —
            sem competir de forma dispersa com outros grandes ciclos do futebol brasileiro, mas somando público e
            credibilidade a cada ano. Entre finais de março e início de abril, clubes e centros de excelência
            cruzam o país para jogar no <strong className="text-zinc-100">complexo da Boston City</strong>, em ambiente
            pensado para atletas, famílias e observadores técnicos. O modelo de disputa dialoga com circuitos europeus de
            formação — fases curtas, alto nível técnico e necessidade de adaptação rápida — sem perder o calor da
            torcida e da cobertura esportiva brasileira.
          </p>

          <p>
            Em poucos anos, {eventLabel} deixou de ser novidade para virar <strong className="text-zinc-100">ponto de encontro da elite da base</strong>.
            Participaram ou participam edições com presença de grandes SAFs e clubes tradicionais do país — nomes que a
            própria imprensa já registrou nas pautas de convocados, como{" "}
            <strong className="text-zinc-100">Cruzeiro, Bahia, Sport Recife, Botafogo, Red Bull Bragantino, Vitória,
            Tombense</strong>, entre outros, em categorias Sub-17 e Sub-20, além de confrontos históricos nas categorias
            menores. O torneio funciona como vitrine para atletas, olheiros e para a narrativa do futebol que ainda vai
            estourar no profissional.
          </p>

          <h2 className="!mt-10 text-lg font-semibold text-white sm:text-xl">Histórico recente — quem já levantou o troféu</h2>
          <p>
            A linha do tempo ainda está em construção na memória dos torcedores, mas alguns capítulos já estão escritos em
            manchete — e servem de contexto para quem cobre a próxima edição:
          </p>
          <ul className="list-inside list-disc space-y-3 pl-1 text-zinc-300 marker:text-amber-500/90">
            <li>
              <strong className="text-zinc-100">{eventLabel} 2024 — Sub-15:</strong> o{" "}
              <strong className="text-zinc-100">Atlético Mineiro</strong> sagrou-se campeão ao vencer o Boston City A por
              3 a 0 na final (17 de março), com campanha invicta na competição — cinco vitórias, destaque na imprensa
              regional.
            </li>
            <li>
              <strong className="text-zinc-100">{eventLabel} 2024 — Sub-17:</strong> novamente o{" "}
              <strong className="text-zinc-100">Atlético Mineiro</strong>, após empate sem gols na final com o Red Bull
              Bragantino e decisão nos pênaltis (4 a 3) — final disputada em março de 2024.
            </li>
            <li>
              <strong className="text-zinc-100">{eventLabel} 2025 — Sub-20:</strong> o{" "}
              <strong className="text-zinc-100">Boston City A</strong> conquistou o título ao vencer a{" "}
              <strong className="text-zinc-100">AA Carapebus</strong> por 3 a 0 na decisão, coroando uma campanha sólida
              na categoria — resultado amplamente divulgado nas redes oficiais do clube.
            </li>
            <li>
              A <strong className="text-zinc-100">Sub-17 de 2025</strong> segue o calendário de março no complexo em
              Manhuaçu, com mesa de clubes de primeira linha confirmada na cobertura da imprensa esportiva — pauta viva
              para crônica, bastidor e análise de desempenho das categorias de formação.
            </li>
          </ul>

          <h2 className="!mt-10 text-lg font-semibold text-white sm:text-xl">Assessoria de imprensa — com quem falar e o que pedir</h2>
          <p>
            A <strong className="text-zinc-100">assessoria de imprensa do Boston City FC Brasil</strong>, integrada ao
            ecossistema <strong className="text-zinc-100">Boston City Group</strong>, é o canal para:
          </p>
          <ul className="list-inside list-disc space-y-2 pl-1 marker:text-amber-500/90">
            <li>credenciamento, liberação de entrevistas e organização de coletivas com comissão técnica e dirigentes;</li>
            <li>confirmação de tabelas, horários e alterações de última hora;</li>
            <li>solicitação de materiais oficiais: marca do torneio em alta resolução, fotos institucionais e orientação de uso;</li>
            <li>duvidas sobre direitos de uso de imagem nas peças editoriais e redes sociais.</li>
          </ul>
          <p>
            O primeiro contato costuma ocorrer pelos <strong className="text-zinc-100">canais oficiais do Boston City FC
            Brasil</strong> (redes sociais e site institucional) ou pelo relacionamento prévio da sua redação com o
            clube. Para pautas urgentes no período do torneio, indique sempre edição, categoria e prazo de veiculação —
            isso agiliza a resposta da equipe de comunicação.
          </p>

          <div className="flex gap-3 rounded-lg border border-white/10 bg-zinc-900/60 p-4 not-prose">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
            <p className="text-sm leading-relaxed text-zinc-400">
              <strong className="text-zinc-200">Importante:</strong> o acesso ao <strong className="text-zinc-200">banco
              de fotos em alta</strong> da cobertura <strong className="text-zinc-200">não é aberto ao público
              geral</strong>. Cada veículo ou fotógrafo credenciado recebe da organização um{" "}
              <strong className="text-zinc-200">link ou código exclusivo</strong> — é a forma de proteger o trabalho dos
              profissionais e garantir uso correto das imagens. Use apenas a área no final desta página, com o material
              que a assessoria lhe enviar.
            </p>
          </div>

          <p>
            Esta página concentra, em um só lugar, o <strong className="text-zinc-100">release narrativo</strong>, a{" "}
            <strong className="text-zinc-100">marca visual do torneio</strong> (material oficial repassado pela assessoria)
            e o <strong className="text-zinc-100">acesso ao acervo</strong> para quem
            possui credencial — sem login, com seleção múltipla e download em lote na galeria privada.
          </p>
        </ImprensaReleaseCollapsible>

        <section
          className="mt-16 rounded-xl border border-white/10 bg-zinc-900/40 p-6 sm:p-8"
          aria-labelledby="marca-heading"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
              <ImageIcon className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="marca-heading" className="text-xl font-semibold text-white">
                {eventLabel} — marca e logo oficial para publicação
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Use a <strong className="text-zinc-300">logo oficial do evento</strong> em chamadas, capas, redes sociais
                e peças de cobertura, conforme orientação da assessoria.
              </p>

              <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex min-h-[10rem] min-w-0 flex-1 items-center justify-center rounded-lg border border-white/10 bg-zinc-950/80 p-6 sm:max-w-md">
                  {pressLogoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={pressLogoUrl}
                      alt={previewAlt}
                      className="mx-auto max-h-40 w-auto max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <p className="text-center text-sm leading-relaxed text-zinc-500">
                      Logo do evento indisponível neste momento — solicite o arquivo à assessoria.
                    </p>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex flex-wrap gap-3">
                    <a href={pngHref} download={pngDownload} className={btnPrimary}>
                      <Download className="h-4 w-4" />
                      Baixar PNG
                    </a>
                    <a href={svgHref} download={svgDownload} className={btnSecondary}>
                      <Download className="h-4 w-4" />
                      Baixar SVG
                    </a>
                  </div>
                  {hasEventLogo && !logoIsSvg ? (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      O <strong className="text-zinc-400">PNG</strong> é o arquivo do torneio. O{" "}
                      <strong className="text-zinc-400">SVG</strong> é a marca vetorial institucional do Boston City Group.
                    </p>
                  ) : hasEventLogo && logoIsSvg ? (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      O <strong className="text-zinc-400">SVG</strong> é o vetorial do torneio. O{" "}
                      <strong className="text-zinc-400">PNG</strong> é a marca raster institucional do grupo.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="acervo-fotos"
          className="mt-14 scroll-mt-24 rounded-xl border border-amber-500/25 bg-zinc-900/50 p-6 sm:p-8"
          aria-labelledby="fotos-heading"
        >
          <h2 id="fotos-heading" className="text-xl font-semibold text-white">
            Acervo fotográfico — somente com link ou código da assessoria
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Esta área <strong className="text-zinc-200">não substitui</strong> o contato com a assessoria: ela serve
            para quem <strong className="text-zinc-200">já recebeu</strong> o link exclusivo ou o código do álbum.
            Cole abaixo e você será levado à galeria com seleção múltipla e <strong className="text-zinc-200">Baixar
            selecionadas</strong> — fluxo pensado para redação e pós-jogo, sem expor o material a qualquer visitante.
          </p>
          <div className="mt-6">
            <ImprensaGaleriaAccess />
          </div>
        </section>

        <p className="mt-12 border-t border-white/5 pt-8 text-center text-xs text-zinc-600">
          Boston City Group · Página institucional de apoio à imprensa · Identidade institucional do grupo em{" "}
          <Link href="/" className="text-amber-600/90 hover:underline">
            bostoncitygroup.biz
          </Link>
        </p>
      </main>
    </div>
  );
}
