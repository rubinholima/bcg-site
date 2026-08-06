"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV: Array<{ id: string; label: string; indent?: boolean }> = [
  { id: "intro", label: "Introdução" },
  { id: "acesso", label: "Acesso e perfis" },
  { id: "permissoes-modulos", label: "Permissões (módulos)" },
  { id: "dashboard", label: "Dashboard e Grupo" },
  { id: "diretoria", label: "Diretoria" },
  { id: "empresas", label: "Empresas" },
  { id: "adm", label: "Administrativo" },
  { id: "requisicoes", label: "Requisições" },
  { id: "futebol", label: "Depto Futebol" },
  { id: "futebol-cadastro-atletas", label: "→ Cadastro de atletas", indent: true },
  { id: "futebol-logistica-convocacao", label: "→ Logística e convocação", indent: true },
  { id: "futebol-press-kit", label: "→ Press Kit", indent: true },
  { id: "futebol-captacao", label: "→ Captação", indent: true },
  { id: "socio", label: "Sócio Torcedor" },
  { id: "marketing", label: "Marketing" },
  { id: "comunicacao", label: "Communication Center" },
  { id: "comunicacao-canais", label: "→ Canais e WhatsApp", indent: true },
  { id: "saude", label: "Depto Saúde" },
  { id: "saude-material-apoio", label: "→ Material de apoio (psicologia)", indent: true },
  { id: "boston-tv", label: "BCG TV" },
  { id: "boston-tv-bc-hall", label: "→ BC HALL", indent: true },
  { id: "boston-tv-playlists", label: "→ Playlists", indent: true },
  { id: "boston-tv-telas", label: "→ Telas", indent: true },
  { id: "boston-tv-vmix", label: "→ Fontes vMix", indent: true },
  { id: "boston-tv-iptv", label: "→ IPTV", indent: true },
  { id: "boston-tv-controle", label: "→ Controle iPad", indent: true },
  { id: "ferramentas", label: "Ferramentas" },
  { id: "config", label: "Configurações" },
  { id: "exemplos", label: "Exemplos práticos" },
];

function SubSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
      <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
      <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">{children}</div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-xl font-bold tracking-tight text-foreground border-b border-border pb-2">{title}</h2>
      <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">{children}</div>
    </section>
  );
}

export default function ManualPage() {
  const router = useRouter();
  const { canAccessDashboard, loading } = useAuth();

  useEffect(() => {
    if (!loading && !canAccessDashboard) router.replace("/403");
  }, [loading, canAccessDashboard, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </div>
    );
  }

  if (!canAccessDashboard) return null;

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto space-y-8 pb-16">
      <DashboardDeptHeader
        section="Documentação"
        sectionIcon={BookOpen}
        title="Manual da plataforma"
        description="Guia de uso do dashboard, módulos e fluxos do dia a dia."
        backHref="/dashboard"
      />

      <div className="flex flex-col gap-10 lg:flex-row lg:gap-12">
        <nav
          aria-label="Sumário"
          className="lg:w-52 shrink-0 lg:sticky lg:top-20 rounded-xl border border-border bg-card p-4 h-fit"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sumário</p>
          <ul className="space-y-1.5 text-sm">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={`text-foreground/80 hover:text-primary transition-colors block py-0.5 ${
                    item.indent ? "pl-3 text-xs text-muted-foreground hover:text-primary" : ""
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 flex-1 space-y-14">
          <Section id="intro" title="Introdução">
            <p>
              Esta aplicação reúne gestão de clubes e empresas do grupo: cadastros esportivos, departamentos
              (médico, psicologia, jurídico), administrativo (financeiro, estoque, RH, patrimônio), marketing,
              sócio-torcedor e ferramentas (email, senhas, páginas, mídia).
            </p>
            <p>
              O ícone <strong>?</strong> no canto superior do dashboard abre este manual.
            </p>
            <p>
              O menu à esquerda reflete os <strong>módulos</strong> liberados para o seu usuário. Se não vir
              um item, o administrador precisa conceder o módulo em <strong>Configurações → Módulos</strong> (ou
              equivalente na sua instalação).
            </p>
          </Section>

          <Section id="acesso" title="Acesso e perfis">
            <p>
              O login na plataforma usa <strong>usuário</strong> (username) e <strong>senha</strong> — não o
              e-mail. O username aparece na lista em <strong>Grupo Master → Usuários</strong> (coluna
              &quot;Usuário&quot;); em geral é o primeiro nome em minúsculas (ex.: <code>isabela</code>,{" "}
              <code>marcelo</code>).
            </p>
            <p>
              <strong>Novos usuários</strong> recebem senha padrão definida pelo administrador e{" "}
              <strong>devem trocá-la no primeiro acesso</strong>: após entrar, a plataforma abre a tela de nova
              senha antes do dashboard. A senha pessoal precisa atender aos requisitos (mínimo 8 caracteres,
              maiúscula, minúscula, número e caractere especial).
            </p>
            <p>
              Quem cadastra usuários em <strong>Usuários → Novo</strong> informa e-mail, nome e username; a
              senha inicial é aplicada automaticamente. Para alterar nome, e-mail, username ou empresas de
              acesso, use editar na lista de usuários.
            </p>
            <p>
              Perfis comuns: <strong>super admin</strong> (tudo), <strong>admin da empresa</strong>,{" "}
              <strong>editor</strong>, <strong>gerente</strong>, <strong>administrativo</strong>,{" "}
              <strong>diretoria</strong>, <strong>comissão</strong>, <strong>médico</strong>,{" "}
              <strong>psicólogo</strong>, etc.
            </p>
            <p>
              <strong>Exemplo:</strong> um coordenador de base pode ter apenas Depto Futebol (jogadores,
              categorias) e Estoque, sem Financeiro nem Usuários.
            </p>
          </Section>

          <Section id="permissoes-modulos" title="Permissões por perfil (Configurações → Módulos)">
            <p>
              Somente <strong>super admin</strong> altera permissões em{" "}
              <strong>Configurações → Módulos</strong>. A tela trabalha por <strong>perfil</strong> (papel do
              usuário) e por <strong>seção</strong> do menu — não é necessário marcar item a item.
            </p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Escolha o <strong>perfil</strong> no topo (ex.: Administrativo para o financeiro, RH ou
                compras).
              </li>
              <li>
                Em cada <strong>seção</strong>, use o interruptor para liberar ou bloquear todos os módulos
                daquela área de uma vez.
              </li>
              <li>
                A lista abaixo do interruptor mostra o que esse perfil passa a ver no menu (Financeiro,
                Compras, Estoque, etc.).
              </li>
              <li>
                Clique em <strong>Salvar alterações</strong> ao terminar. Super admin continua com acesso total
                sem depender da matriz.
              </li>
            </ol>
            <p>
              <strong>Financeiro (Adm):</strong> perfil <strong>Administrativo</strong> → seção{" "}
              <strong>Administrativo &amp; financeiro</strong> → liberar. O usuário precisa ter role{" "}
              <strong>administrativo</strong> em Usuários.
            </p>
            <p>
              <strong>Pacotes prontos</strong> só <em>acrescentam</em> permissões; para restringir, bloqueie a
              seção e salve. <strong>Exportar JSON</strong> gera backup da política (sem dados de usuários).
            </p>
          </Section>

          <Section id="dashboard" title="Dashboard e Grupo Master">
            <p>
              O <strong>Dashboard</strong> mostra números rápidos (empresas, usuários, emails, páginas) e
              atalhos. <strong>Grupo Master</strong> concentra identidade e conteúdo do grupo.
            </p>
            <p>
              <strong>Exemplo:</strong> após criar uma nova empresa, ela passa a aparecer nos contadores e na
              listagem “Últimas empresas”.
            </p>
          </Section>

          <Section id="diretoria" title="Diretoria">
            <p>
              <strong>Dashboard gerencial</strong> reúne visão multi-empresa: gráficos, indicadores e, quando
              configurado, totais financeiros e de compras via integração Omie por empresa.
            </p>
            <p>
              <strong>Exemplo:</strong> a diretoria compara receber x pagar aberto entre clubes sem abrir o
              financeiro operacional de cada um.
            </p>
          </Section>

          <Section id="empresas" title="Empresas e cadastros base">
            <p>
              <strong>Empresas</strong> cadastram unidades do grupo (clube, holdings, etc.). Em cada empresa:
              dados de contato, logo, integrações (ex.: Omie), categorias de futebol (principal, sub-20… —
              usadas em estoque e outros módulos).
            </p>
            <p>
              <strong>Tipos de negócios</strong> classificam empresas. Nos cadastros de <strong>Futebol</strong>{" "}
              ficam <strong>jogadores</strong>, <strong>categorias</strong>, <strong>campeonatos</strong>,{" "}
              <strong>estádios</strong>, <strong>times adversários</strong>.
            </p>
            <p>
              <strong>Regra de digitação:</strong> nomes e textos de cadastro são gravados e exibidos em{" "}
              <strong>MAIÚSCULAS</strong>; <strong>e-mails</strong> ficam sempre em minúsculas.
            </p>
            <p>
              <strong>Exemplo:</strong> preencher <em>categorias</em> no cadastro do clube permite filtrar itens
              de estoque “só Sub-17” ou “só Feminino”.
            </p>
            <h3 id="cadastros-funcionarios" className="text-base font-semibold pt-2">
              Funcionários (cadastro mestre)
            </h3>
            <p>
              Cadastro único de pessoas do clube/empresa — funcionários, dirigentes, comissão técnica, saúde e
              demais departamentos. Cada pessoa tem departamento e foto na listagem (como atletas), evitando
              cadastros duplicados. O vínculo com o módulo <strong>Futebol</strong> (atleta) é opcional e só
              aparece para tipo Atleta. Convites de cadastro e aprovação pelo RH ficam em{" "}
              <strong>Depto Adm → RH</strong>.
            </p>
            <h3 id="cadastros-fornecedores" className="text-base font-semibold pt-2">
              Fornecedores
            </h3>
            <p>
              Cadastro mestre usado em contas a pagar, requisições de compra e ordens de compra. Mantenha CNPJ
              e contato atualizados para o fluxo de Compras.
            </p>
            <h3 id="cadastros-clientes" className="text-base font-semibold pt-2">
              Clientes
            </h3>
            <p>
              Cadastro mestre para contas a receber no Financeiro (empresas, parceiros, pagadores externos ao
              clube).
            </p>
          </Section>

          <Section id="adm" title="Área administrativa (Adm)">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Financeiro:</strong> contas a pagar e receber internas por empresa (lançamentos,
                vencimento, quitação). Relatórios Omie ficam na Diretoria.
              </li>
              <li>
                <strong>Compras:</strong> conexão e fluxos ligados ao ERP, quando habilitado.
              </li>
              <li>
                <strong>Estoque:</strong> catálogo por empresa, famílias (uniforme, treino, nutrição…),
                vínculo opcional às categorias de futebol do clube, movimentos de entrada/saída.
              </li>
              <li>
                <strong>RH:</strong> departamentos, cargos, colaboradores, vínculos, períodos de ausência.
              </li>
              <li>
                <strong>Patrimônio:</strong> bens por categoria (incl. uniformes com jogador associado).
              </li>
              <li>
                <strong>Nutrição</strong> (no menu do futebol em algumas instalações): cardápios e referências.
              </li>
            </ul>
            <p>
              <strong>Exemplo financeiro:</strong> registrar “Mensalidade academia — R$ 5.000 — vencimento
              10/06 — pendente”, depois marcar como pago com data de quitação.
            </p>
            <p>
              <strong>Exemplo estoque:</strong> criar item “Bola nº 5 — categoria Treino — mínimo 20 unidades”;
              dar entrada +50 após compra; saída -10 para torneio.
            </p>
          </Section>

          <Section id="requisicoes" title="Requisições — fluxo, aprovações e alertas">
            <p>
              <strong>Fluxo:</strong> requisição → cotações (2 a 4) → financeiro → diretoria (se acima do
              limite configurado) → ordem de compra → recebimento → assinatura.
            </p>
            <p>
              O solicitante envia a requisição; Compras registra de 2 a 4 cotações; Financeiro aprova; acima
              do limite em reais, a Diretoria também aprova; Compras gera a OP, confirma recebimento
              (patrimônio ou estoque) e dispara o termo de assinatura ao solicitante.
            </p>
            <p>
              <strong>Módulos envolvidos:</strong> Requisições, Compras, Financeiro, Diretoria e TI
              (requisições de equipamento e chamados de suporte).
            </p>
            <p>
              <strong>Configurações → Requisições:</strong> por clube/empresa, defina limite da diretoria,
              mínimo e máximo de cotações, e os e-mails/telefones dos responsáveis (Compras, Financeiro, TI,
              Diretoria). A tabela na tela lista todos os responsáveis já cadastrados por empresa.
            </p>
            <p>
              <strong>Alertas por e-mail:</strong> nova requisição enviada avisa Compras (e TI se for
              equipamento); envio para aprovação avisa Financeiro; valor acima do limite avisa Diretoria;
              novo chamado TI avisa o responsável de TI. Quem tem acesso à fila vê um banner com pendências.
              O envio usa SMTP do servidor (<code className="text-foreground">SMTP_HOST</code>,{" "}
              <code className="text-foreground">SMTP_USER</code>, <code className="text-foreground">SMTP_PASS</code>
              ). Telefone cadastrado aparece no e-mail como referência; SMS/WhatsApp automático ainda não
              está disponível.
            </p>
          </Section>

          <Section id="futebol" title="Depto Futebol">
            <p>
              Além dos cadastros, há <strong>Médico</strong> (prontuário por jogador, equipe),{" "}
              <strong>Psicologia</strong> (consultas, psicólogos), <strong>Jurídico</strong>,{" "}
              <strong>Comissão técnica</strong>, <strong>logística de deslocamentos</strong>,{" "}
              <strong>fisiologia</strong>, <strong>análise</strong> (avaliações e desempenho).
            </p>
            <p>
              <strong>Exemplo:</strong> em <em>Logística</em>, criar viagem com data do jogo, adversário e
              checklist de hotel/transporte.
            </p>

            <SubSection id="futebol-cadastro-atletas" title="Cadastro de atletas">
              <p>
                O formulário do atleta está organizado em abas (identificação, pessoal, esportivo, documentos e
                logística). O cabeçalho com foto e nome permanece fixo ao rolar a página; use <strong>Salvar</strong> no
                canto inferior da tela.
              </p>
              <p>
                <strong>Foto / avatar:</strong> PNG, JPG, WebP ou SVG — até 10 MB. Recomendado 800×600 px. O sistema
                otimiza automaticamente (WebP, tamanho máximo por pasta).
              </p>
              <p>
                <strong>Nome da foto:</strong> gerado automaticamente a partir do nome do atleta e da categoria (ex.:{" "}
                <em>NOME DO ATLETA sub15</em>). Preencha o nome completo antes de enviar a imagem.
              </p>
              <p>
                <strong>Imagens de apoio</strong> (aba Imagens): PNG, JPG ou WebP — até 10 MB, com a mesma otimização
                automática na pasta de mídia do atleta.
              </p>
              <p>
                <strong>Matrícula RH:</strong> quando o atleta está vinculado a um colaborador em ADM → RH, o campo é
                preenchido automaticamente e fica somente leitura.
              </p>
              <p>
                <strong>LGPD:</strong> este cadastro trata dados pessoais nos módulos da plataforma (cadastros,
                contratos, prontuários, logística, nutrição, entre outros), conforme o processo de cadastro e alteração
                do atleta no clube.
              </p>
            </SubSection>

            <SubSection id="futebol-logistica-convocacao" title="Logística — convocação e relatórios">
              <p>
                Fluxo: criar a <strong>viagem</strong> em Logística → abrir{" "}
                <strong>Convocação</strong> → escolher clube, viagem e marcar atletas (e comissão) →{" "}
                <strong>Salvar</strong> → gerar relatórios (Passageiros, Hóspedes, Programação).
              </p>
              <p>
                Cada atleta convocado fica ligado ao <strong>cadastro individual</strong> (histórico na
                ficha). O relatório de passageiros usa a convocação; sem convocação, cai para quartos ou
                elenco por categoria.
              </p>
              <p>
                Menu: Depto Futebol → Logística → Convocação / Relatórios. Atalho também na edição da
                viagem.
              </p>
            </SubSection>

            <SubSection id="futebol-press-kit" title="Press Kit">
              <p>
                Revista de pré-jogo em PDF (A4 retrato): capa, ficha do confronto, arbitragem, comissão,
                retrospecto contra o adversário, números da temporada, elenco relacionado com estatísticas,
                últimas escalações, artilharia, agenda da semana e classificação.
              </p>
              <p>
                Fluxo: convocar os atletas na <strong>Convocação</strong> → preencher arbitragem, diretoria,
                fase/horário e os 11 titulares no <strong>Press Kit</strong> → escolher clube e jogo,
                visualizar e imprimir. Os números
                vêm das partidas oficiais já importadas na temporada; o vínculo com o atleta usa o registro
                CBF do cadastro.
              </p>
              <p>
                Menu: Depto Futebol → Logística → Relatórios → Press Kit / Imprensa.
              </p>
              <p>
                <strong>Árbitros:</strong> cadastre nome e foto em Cadastros → Árbitros. No Press Kit, use a
                busca e o dropdown de cada função (árbitro principal, assistentes etc.) — nome e foto vão para
                a impressão automaticamente.
              </p>
            </SubSection>

            <SubSection id="futebol-captacao" title="Captação">
              <p>
                Ficha de <strong>captação</strong> (scouting) — separada do cadastro oficial de atletas. Após
                aprovação do supervisor, o prospect vira atleta do clube e segue para contratos no jurídico.
              </p>
              <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-foreground">1 · Captação</p>
                  <p className="text-muted-foreground">
                    Prospect com dados mínimos de scouting. Não é atleta do clube ainda.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">2 · Aprovação supervisor</p>
                  <p className="text-muted-foreground">
                    Try-out / negociação → supervisor aprova. Cadastro completo vem depois.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-violet-300">3 · Clube + jurídico</p>
                  <p className="text-muted-foreground">
                    Gera ficha em Cadastros → Jogadores e contratos em Jurídico.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-medium text-foreground">Checklist de captação assertiva</p>
              <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                <li>Perfil alinhado ao modelo de jogo do clube</li>
                <li>Situação contratual e agente mapeados</li>
                <li>Mínimo 2 observações antes de try-out</li>
                <li>Relatório com recomendação sem ambiguidade</li>
                <li>Captador responsável em cada prospect</li>
                <li>Categoria alvo definida (sub-17, profissional…)</li>
                <li>GPS em campo — modo ao vivo ou check-in no mapa</li>
                <li>Prospect ≠ atleta: cadastro oficial só após supervisor</li>
                <li>Contratos no Jurídico depois do cadastro no clube</li>
              </ul>
            </SubSection>
          </Section>

          <Section id="socio" title="Sócio Torcedor">
            <p>
              Planos (valores, benefícios), cadastro de sócios e acompanhamento da base. Útil para times que
              vendem associação recorrente.
            </p>
            <p>
              <strong>Exemplo:</strong> plano “Ouro — R$/mês” com desconto em loja; associar sócio ao plano e
              status ativo/inadimplente conforme o processo do clube.
            </p>
          </Section>

          <Section id="marketing" title="Marketing">
            <p>
              <strong>Planner:</strong> calendário de conteúdo. <strong>BCG TV</strong> (se habilitado):
              playlists e telas — veja a seção{" "}
              <a href="#boston-tv" className="text-primary underline-offset-2 hover:underline">
                BCG TV
              </a>{" "}
              abaixo.
            </p>
          </Section>

          <Section id="comunicacao" title="Communication Center">
            <p>
              Hub unificado de mensagens (WhatsApp primeiro; Instagram, e-mail e outros canais depois). Acesso
              pelo menu <strong>Communication Center</strong> — módulo <code>comunicacao</code>.
            </p>
            <p>
              <strong>Inbox:</strong> conversas por unidade de negócio. <strong>Canais:</strong> cadastro de
              números e departamentos. <strong>Templates:</strong> respostas prontas por canal.
            </p>

            <SubSection id="comunicacao-canais" title="Canais e WhatsApp Cloud API">
              <p>Como empresa, departamento e números se conectam no Cup360:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Empresa / clube</strong> — escolha no filtro da página Canais (Boston City FC USA,
                  Brazil, Hall, etc.). Corresponde ao <code>Tenant</code> do Cup360.
                </li>
                <li>
                  <strong>Departamento / área</strong> — no cadastro do canal (Comercial, Marketing, Mídia…).
                  Cada departamento pode ter um número WhatsApp próprio.
                </li>
                <li>
                  <strong>phone_number_id</strong> — ID do número no Meta Business (Configurações → WhatsApp →
                  engrenagem do número). O webhook da BCG identifica qual departamento recebeu a mensagem por
                  esse ID.
                </li>
                <li>
                  <strong>Número exibido</strong> — só referência visual (ex.: +1 339-241-7286).
                </li>
                <li>
                  <strong>Uma API, vários números</strong> — não precisa de app Meta separado por departamento.
                  Um webhook (<code>/api/comunicacao/webhooks/whatsapp</code>) e token de acesso servem todos os
                  números da mesma conta Business.
                </li>
              </ul>
              <p>
                <strong>Cadastrar um canal:</strong> Communication Center → Canais → filtrar a empresa → Novo
                canal → preencher departamento, <code>phone_number_id</code> e número exibido.
              </p>
              <p>
                <strong>EUA e Brasil:</strong> o primeiro número é só o piloto; depois adicione outros números
                no Meta e registre cada um como canal separado no Cup360.
              </p>
            </SubSection>
          </Section>

          <Section id="saude" title="Depto Saúde">
            <p>
              O hub <strong>Saúde</strong> reúne médicos, enfermeiros, psicólogos, estagiários, histórico médico,
              consultas online, avaliação psicológica e fisioterapia. O acesso depende do módulo{" "}
              <strong>saude</strong> liberado para o seu usuário.
            </p>
            <p>
              <strong>Estagiários:</strong> cadastro único em Depto Saúde → Estagiários. Informe a área de
              atuação (medicina, psicologia, fisioterapia, enfermagem, nutrição, etc.). Médicos e psicólogos
              profissionais continuam nos cadastros próprios; estagiário não se cadastra mais lá.
            </p>
            <p>
              <strong>Fisioterapia — desfecho do atendimento:</strong> após atender, registre o resultado na ficha:
              <strong> Alta</strong> (problema resolvido), <strong>Em tratamento</strong> (precisa de novo
              atendimento, mas pode treinar) ou <strong>Não apto</strong> (tratamento intensivo — não treina). Isso
              atualiza o status do atleta no cadastro para a comissão separar quem segue no treino normal.
            </p>

            <SubSection id="saude-material-apoio" title="Material de apoio (psicologia)">
              <p>
                Em <strong>Depto Saúde → Psicologia → Material de apoio</strong> (ou pelo card no hub Saúde), a
                equipe de psicologia e estagiários compartilha PDFs, imagens e documentos de uso no dia a dia.
              </p>
              <p>
                <strong>Como enviar um material:</strong>
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Abra <strong>Material de apoio</strong> no menu Psicologia.</li>
                <li>Clique em <strong>Enviar material</strong>.</li>
                <li>
                  Preencha o <strong>título</strong> (obrigatório) e, se quiser, a descrição e a categoria
                  (protocolo, material, apresentação, formulário ou outro).
                </li>
                <li>
                  Opcionalmente vincule a um <strong>clube/empresa</strong>; deixe em branco para material do grupo
                  inteiro.
                </li>
                <li>
                  Selecione o arquivo (PDF, imagem ou documento Office — até 25 MB) e confirme{" "}
                  <strong>Enviar</strong>.
                </li>
              </ol>
              <p>
                <strong>Como encontrar e baixar:</strong> use a busca por título, descrição ou nome do arquivo;
                filtre por categoria ou clube; clique em <strong>Baixar</strong> para abrir ou salvar o arquivo.
              </p>
              <p>
                <strong>Excluir:</strong> use o ícone de lixeira na linha do material — a ação remove o arquivo da
                biblioteca de forma permanente.
              </p>
            </SubSection>
          </Section>

          <Section id="boston-tv" title="BCG TV (Boston TV)">
            <p>
              Telas físicas abrem o link <code className="text-foreground">/tv/play/…</code> em tela cheia, sem
              som e sem menu de canais. Configure em <strong>Marketing → BCG TV</strong> — use as abas{" "}
              <strong>BC HALL</strong>, Playlists, Telas, Fontes vMix e IPTV.
            </p>

            <div className="rounded-lg border border-violet-500/25 bg-violet-950/20 px-4 py-3 text-sm">
              <p className="font-semibold text-violet-200">Ordem recomendada (primeira vez)</p>
              <ol className="mt-2 list-decimal pl-5 space-y-1">
                <li>Criar playlist(s) e adicionar itens (imagens, vídeos, YouTube, vMix ou IPTV no loop).</li>
                <li>Ativar o <strong>BC HALL</strong> escolhendo a playlist principal.</li>
                <li>Cadastrar telas e definir <em>Seguir BC HALL</em> ou <em>Individual</em>.</li>
                <li>Liberar canais IPTV e/ou fontes vMix, se necessário.</li>
                <li>Abrir o link na Smart TV (<code className="text-foreground">/tv</code> ou favorito curto).</li>
              </ol>
            </div>

            <SubSection id="boston-tv-bc-hall" title="BC HALL — canal sincronizado">
              <p>
                O <strong>BC HALL</strong> é o canal mestre do espaço multiuso. Você escolhe{" "}
                <strong>uma playlist</strong> e todas as telas em modo <strong>Seguir BC HALL</strong> tocam
                juntas, no mesmo segundo (pausar, próximo e reiniciar afetam todas).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Seguir BC HALL:</strong> usa a playlist ativa do BC HALL — ideal para o loop geral do
                  Hall.
                </li>
                <li>
                  <strong>Individual:</strong> playlist própria só naquela TV (ex.: tutorial em uma tela da
                  Argentina).
                </li>
                <li>
                  O browser da TV permanece aberto; <strong>Pausar</strong> só congela o conteúdo, não fecha o
                  player.
                </li>
              </ul>
              <p>
                Na aba <strong>BC HALL</strong>: escolha a playlist e clique <strong>Ativar BC HALL</strong>. Depois
                use Pausar, Próximo, Reiniciar, Trocar playlist ou Voltar todas ao BC HALL.
              </p>
              <p>
                Exemplo de nome de playlist: <code className="text-foreground">BC HALL - PL GERAL</code>.
              </p>
            </SubSection>

            <SubSection id="boston-tv-playlists" title="Playlists">
              <p>
                Loop de conteúdos para as TVs. Crie em <strong>Playlists → Nova playlist</strong> e monte os itens
                em <strong>Editar itens</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Imagem (URL):</strong> foto + segundos na tela (ex.: banner 15 s).
                </li>
                <li>
                  <strong>Vídeo (URL):</strong> link direto .mp4; ao terminar, passa ao próximo.
                </li>
                <li>
                  <strong>YouTube:</strong> link de um vídeo (não da playlist do YouTube); tempo máximo antes do
                  próximo (padrão 8 min).
                </li>
                <li>
                  <strong>Canal IPTV (live):</strong> canal liberado na lista M3U; permanece X segundos e passa ao
                  próximo (padrão 1 h).
                </li>
                <li>
                  <strong>Fonte vMix:</strong> saída cadastrada em Fontes vMix (NDI ou Stream HTTP).
                </li>
              </ul>
              <p>
                <strong>Imagem ou vídeo (arquivos BCG TV):</strong> escolha a pasta, depois o arquivo já salvo ou use{" "}
                <strong>Enviar imagem</strong> / <strong>Enviar vídeo</strong> para subir um novo. Em{" "}
                <em>Todas as pastas</em>, novos uploads vão para a pasta BCG TV.
              </p>
              <p>
                <strong>Exibição na TV:</strong> em <strong>Editar itens</strong>, escolha{" "}
                <strong>Horizontal</strong> (padrão) ou <strong>Vertical</strong> para TVs montadas em pé.
                No modo vertical o player gira a mídia 90° para preencher a tela em pé, sem zoom nem corte.
                Telas no BC HALL usam a orientação da playlist ativa do hall.
              </p>
              <p>
                <strong>Importante:</strong> imagens, vídeos e YouTube não se cadastram na tela — ficam nos itens
                da playlist. A tela só escolhe se segue o BC HALL ou uma playlist individual.
              </p>
            </SubSection>

            <SubSection id="boston-tv-telas" title="Telas">
              <p>
                Cada tela tem nome (ex.: <code className="text-foreground">1 - USA</code>), link único e modo de
                conteúdo.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Playlist (BC HALL ou individual):</strong> loop de mídia; sincronização na criação/edição
                  da tela.
                </li>
                <li>
                  <strong>Canal IPTV fixo:</strong> um canal ao vivo 24 h, sem playlist — use quando a TV for só um
                  canal.
                </li>
              </ul>
              <p>
                <strong>Instalação na Smart TV:</strong> abra{" "}
                <code className="text-foreground">/tv</code> (dropdown da tela + Abrir) ou favorito curto por
                número: <code className="text-foreground">/tv/1</code> …{" "}
                <code className="text-foreground">/tv/21</code>.
              </p>
              <p>
                Badge <strong>BC HALL</strong> na lista = sincronizada. Badge <strong>Individual</strong> = playlist
                própria.
              </p>
            </SubSection>

            <SubSection id="boston-tv-vmix" title="Fontes vMix">
              <p>Cadastre as saídas do vMix para usar em playlists ou telas.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Stream HTTP (LiveLAN):</strong> para navegador na TV na mesma rede do vMix. URL correta:{" "}
                  <code className="text-foreground">http://10.0.0.2:8088/livelan</code> — não cole o .m3u8 na barra
                  do Chrome.
                </li>
                <li>
                  <strong>NDI:</strong> latência mínima no app BCG TV Android. Nome igual ao NDI Studio Monitor (ex.:{" "}
                  <code className="text-foreground">vMix - Output 1</code>).
                </li>
              </ul>
            </SubSection>

            <SubSection id="boston-tv-iptv" title="Canais IPTV">
              <p>
                Informe a URL da lista M3U, salve e clique <strong>Sincronizar canais</strong>. Usuário e senha já
                vêm dentro da lista — não precisa cadastrar separado.
              </p>
              <p>
                Depois, <strong>libere</strong> os canais que deseja usar. Só os liberados aparecem ao montar
                playlist ou escolher canal fixo na TV.
              </p>
            </SubSection>

            <SubSection id="boston-tv-controle" title="Controle Hall (iPad)">
              <p>
                Na página <strong>BCG TV</strong>, use o botão <strong>Controle Hall (iPad)</strong> — abre em
                tela cheia, sem menu do dashboard. Aba <strong>Telas</strong> para escolher o que passa em cada
                TV; aba <strong>BC HALL</strong> para Pausar, Próximo e Reiniciar o canal sincronizado.
              </p>
              <p>
                O BC HALL precisa estar ativo na página BCG TV antes de usar o controle remoto.
              </p>
            </SubSection>
          </Section>

          <Section id="ferramentas" title="Ferramentas">
            <p>
              <strong>Emails</strong> (WorkMail), <strong>Senhas</strong> (cofre), <strong>Páginas</strong>{" "}
              (sites por empresa ou grupo), <strong>Eventos</strong>, <strong>Notícias</strong>,{" "}
              <strong>Mídia</strong>.
            </p>
            <p>
              <strong>Exemplo:</strong> em Páginas, editar blocos da landing do clube; em Notícias, publicar
              release que aparece no portal configurado.
            </p>
          </Section>

          <Section id="config" title="Configurações">
            <p>
              Ajustes gerais da instalação, <strong>usuários</strong> e políticas de módulo. Somente perfis com
              permissão alteram usuários e integrações críticas.
            </p>
          </Section>

          <Section id="exemplos" title="Exemplos práticos (roteiros)">
            <ol className="list-decimal pl-5 space-y-3">
              <li>
                <strong>Novo clube no grupo:</strong> Empresas → Nova → preencher tipo, contatos e categorias de
                futebol → (opcional) integração Omie → criar página pública em Páginas.
              </li>
              <li>
                <strong>Fechar mês no financeiro interno:</strong> Financeiro → filtrar “Pendente” → marcar
                títulos pagos ou registrar data de quitação em lote editando cada lançamento.
              </li>
              <li>
                <strong>Reposição de material:</strong> Estoque → alertas de mínimo → Compras/OP (quando
                existir) ou movimento de entrada manual com observação do fornecedor.
              </li>
              <li>
                <strong>Avaliação técnica:</strong> Futebol → Análise → preencher avaliação do atleta conforme
                modelo do clube; Desempenho para métricas agregadas.
              </li>
            </ol>
          </Section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">
            Manual interno da aplicação. Conteúdo alinhado à estrutura de menu atual; recursos dependem dos
            módulos ativos na sua organização.
          </p>
        </div>
      </div>
    </div>
  );
}
