"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardDeptHeader } from "@/components/dashboard/DashboardDeptHeader";
import { BookOpen } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { id: "intro", label: "Introdução" },
  { id: "acesso", label: "Acesso e perfis" },
  { id: "permissoes-modulos", label: "Permissões (módulos)" },
  { id: "dashboard", label: "Dashboard e Grupo" },
  { id: "diretoria", label: "Diretoria" },
  { id: "empresas", label: "Empresas" },
  { id: "adm", label: "Administrativo" },
  { id: "requisicoes", label: "Requisições" },
  { id: "futebol", label: "Depto Futebol" },
  { id: "socio", label: "Sócio Torcedor" },
  { id: "marketing", label: "Marketing" },
  { id: "boston-tv", label: "Boston TV" },
  { id: "ferramentas", label: "Ferramentas" },
  { id: "config", label: "Configurações" },
  { id: "exemplos", label: "Exemplos práticos" },
] as const;

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
                  className="text-foreground/80 hover:text-primary transition-colors block py-0.5"
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
              <strong>Planner:</strong> calendário de conteúdo. <strong>Boston TV</strong> (se habilitado):
              playlists e telas — veja a seção{" "}
              <a href="#boston-tv" className="text-primary underline-offset-2 hover:underline">
                Boston TV
              </a>{" "}
              abaixo.
            </p>
          </Section>

          <Section id="boston-tv" title="Boston TV">
            <p>
              Telas físicas abrem o link <code className="text-foreground">/tv/play/…</code> em tela cheia, sem
              som e sem menu de canais. Configure em <strong>Marketing → Boston TV</strong>.
            </p>
            <p>
              <strong>Ordem recomendada:</strong> (1) criar playlist e itens; (2) liberar canais IPTV se
              precisar; (3) criar tela e escolher playlist ou canal; (4) copiar link e abrir na TV.
            </p>
            <p>
              <strong>Playlist da TV</strong> — loop de conteúdos em marketing. Tipos de item:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Imagem (URL):</strong> link da foto + segundos na tela (ex.: banner 15 s).
              </li>
              <li>
                <strong>Vídeo (URL):</strong> link direto do .mp4; ao terminar, passa ao próximo.
              </li>
              <li>
                <strong>YouTube:</strong> link de um vídeo (não da playlist do YouTube); tempo máximo antes do
                próximo (padrão 8 min).
              </li>
              <li>
                <strong>Canal IPTV (live):</strong> canal liberado na lista M3U; fica X segundos e passa ao
                próximo (padrão 1 h).
              </li>
            </ul>
            <p>
              <strong>Canal IPTV fixo na tela</strong> — um canal ao vivo 24 h, sem alternar. Use{" "}
              <em>Nova tela → Canal IPTV fixo</em>, não a playlist.
            </p>
            <p>
              <strong>IPTV (lista M3U):</strong> sincronize a URL M3U, busque canais e clique em{" "}
              <strong>Liberar</strong>. Só os liberados aparecem ao montar playlist ou tela com canal fixo.
            </p>
            <p>
              <strong>Exemplo:</strong> playlist “Hall comercial” com banner 15 s + vídeo institucional MP4 →
              tela “TV Hall” com <em>Playlist da TV</em> → abrir link na smart TV.
            </p>
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
