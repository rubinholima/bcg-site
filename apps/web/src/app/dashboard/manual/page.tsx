"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const NAV = [
  { id: "intro", label: "Introdução" },
  { id: "acesso", label: "Acesso e perfis" },
  { id: "dashboard", label: "Dashboard e Grupo" },
  { id: "diretoria", label: "Diretoria" },
  { id: "empresas", label: "Empresas" },
  { id: "adm", label: "Administrativo" },
  { id: "futebol", label: "Depto Futebol" },
  { id: "socio", label: "Sócio Torcedor" },
  { id: "marketing", label: "Marketing" },
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0 mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-primary mb-1">
              <BookOpen className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-wider">Documentação</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Manual da plataforma</h1>
          </div>
        </div>
      </div>

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
              O item <strong>Manual</strong> no menu lateral (ícone de livro) abre esta página a qualquer momento.
            </p>
            <p>
              O menu à esquerda reflete os <strong>módulos</strong> liberados para o seu usuário. Se não vir
              um item, o administrador precisa conceder o módulo em <strong>Configurações → Módulos</strong> (ou
              equivalente na sua instalação).
            </p>
          </Section>

          <Section id="acesso" title="Acesso e perfis">
            <p>
              O login pode ser corporativo (OIDC/Cognito ou fluxo definido no ambiente). Perfis comuns:{" "}
              <strong>super admin</strong> (tudo), <strong>company admin</strong>, <strong>editor</strong>,{" "}
              <strong>gerente</strong>, <strong>diretoria</strong>, funções médicas/psico, etc.
            </p>
            <p>
              <strong>Exemplo:</strong> um coordenador de base pode ter apenas Depto Futebol (jogadores,
              categorias) e Estoque, sem Financeiro nem Usuários.
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
              <strong>Exemplo:</strong> preencher <em>categorias</em> no cadastro do clube permite filtrar itens
              de estoque “só Sub-17” ou “só Feminino”.
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
              playlists e telas.
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
