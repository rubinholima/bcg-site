# Desenho da sidebar por módulos (produção segura)

> Arquivo separado só para referência hoje. Conteúdo consolidado em `docs/DESENVOLVIMENTO_DIARIO.md` (seção DOCS CONSOLIDADOS → MODULOS_SIDEBAR_DESENHO).

---

## Contexto

Reorganizar o menu do dashboard em áreas (Adm, Futebol, Sócio Torcedor, Marketing, etc.) sem quebrar produção. Todas as URLs atuais continuam funcionando; nenhum slug de módulo existente é alterado no banco.

---

## Regras para produção

- **URLs:** Nenhuma rota existente é removida nem renomeada. Links antigos (ex.: `/dashboard/cadastros/jogadores`) continuam válidos.
- **Módulos (Module/ModuleRole):** Nenhum slug já usado em permissões ou abas do jogador é alterado (`tipos`, `empresas`, `usuarios`, `medico`, `psicologia`, `diretoria`, `juridico`, etc.).
- **Sidebar:** Apenas reorganização visual (grupos e rótulos). Cada item continua com o mesmo `moduleSlug` e `href` que hoje.
- **Escopo por tenant:** Todos os módulos serão ajustados e separados por empresa/clube; cada menu e dado é filtrado pelo tenant (empresa ou clube) em que o usuário está atuando.

---

## Árvore desejada do menu (desenho)

**Diretoria** = dashboard gerencial com todas as informações de todas as empresas, exclusivo da diretoria (acima de Empresas). **Empresas** = só esse nome (sem "Negócios"); Listagem + Tipos dentro. **Status** e **Avaliações** (hoje em Diretoria) passam para **Futebol → Análise**. **Relatórios** = novo menu para relatórios do app. Todos os módulos separados por empresa/clube (tenant).

```
Dashboard                    → href: /dashboard              moduleSlug: dashboard
Grupo Master                 → href: /dashboard/grupo        moduleSlug: grupo_master

Diretoria (grupo — exclusivo diretoria; dashboard gerencial)
├── Dashboard gerencial      → /dashboard/diretoria          diretoria
│   (visão de todas as empresas/clubes do grupo)
└── (outros itens exclusivos da diretoria)

Empresas (grupo colapsável — estrutura: empresas/clubes do grupo)
├── Listagem                 → /dashboard/empresas           empresas
└── Tipos de Negócios        → /dashboard/cadastros/tipos    tipos

Adm (grupo colapsável — departamento administrativo)
├── Financeiro               → /dashboard/adm/financeiro     adm_financeiro   [NOVO – fase 3]
├── Compras                  → /dashboard/adm/compras       adm_compras      [NOVO – fase 3]
├── RH                       → /dashboard/adm/rh            adm_rh           [NOVO – fase 3]
├── Patrimônio               → /dashboard/adm/patrimonio    adm_patrimonio   [NOVO – fase 3]
├── Nutrição                 → /dashboard/adm/nutricao     adm_nutricao     [NOVO – fase 3]
└── Estoque                  → /dashboard/adm/estoque       adm_estoque      [NOVO – fase 3]

Futebol (grupo colapsável)
├── Categorias               → /dashboard/cadastros/categorias    tipos
├── Campeonatos              → /dashboard/cadastros/campeonatos   tipos
├── Estádios                 → /dashboard/cadastros/estadios     tipos
├── Times adversários        → /dashboard/cadastros/times         tipos
├── Jogadores                → /dashboard/cadastros/jogadores     tipos
├── Comissão técnica         → /dashboard/futebol/comissao        futebol_comissao [NOVO – fase 3]
│   (técnicos, assistentes, etc.)
├── Fisiologia               → /dashboard/futebol/fisiologia  futebol_fisiologia [NOVO – fase 3]
└── Análise (subgrupo)
    ├── Avaliações            → (aba do jogador + listagem)  diretoria
    ├── Status                → (aba do jogador + listagem)  diretoria
    └── Desempenho            → /dashboard/futebol/analise    futebol_analise   [NOVO – fase 3]

Médico (módulo transversal)
└── Histórico médico         → /dashboard/medico             medico
    (ou submenu futuro: Consultas médicas, Laudos)

Psicologia (módulo transversal)
├── Avaliação psicológica    → (dentro do jogador; aba)      psicologia
└── Consultas                → /dashboard/consultas         psicologia

Jurídico (módulo transversal)
└── Contratos / Documentos   → (dentro do jogador; aba + lista)   juridico
    (opcional: /dashboard/juridico para listagem global depois)

Sócio Torcedor (grupo – fase 3)
└── (a definir: Ingressos, Benefícios, Cadastro)  slugs: socio_*   [NOVO]

Marketing (grupo – fase 3)
└── (a definir: Campanhas, Redes; ou agrupar Notícias/Mídia)  [NOVO]

Relatórios (grupo colapsável)
└── (relatórios do app)      → /dashboard/relatorios/*       relatorios [NOVO]

Ferramentas (grupo colapsável)
├── Emails                   → /dashboard/emails            emails
├── Senhas                   → /dashboard/senhas             vault
├── Páginas                  → /dashboard/paginas           paginas
├── Notícias                 → /dashboard/noticias          noticias
└── Mídia                    → /dashboard/midia             midia

Configurações                → /dashboard/configuracoes      configuracoes
├── Usuários                 → /dashboard/usuarios          usuarios
```

---

## Mapeamento: item atual → nova localização

| Hoje (menu)            | Nova localização (grupo) | href (mantido?)     | moduleSlug (mantido?) |
|------------------------|---------------------------|---------------------|------------------------|
| Cadastros → Usuários   | **Configurações** → Usuários | /dashboard/usuarios | usuarios               |
| Cadastros → Empresas   | **Empresas** (Listagem + Tipos) | /dashboard/empresas, /dashboard/cadastros/tipos | empresas, tipos |
| Cadastros → Clubes     | Futebol                   | /dashboard/cadastros/* | tipos (todos)       |
| (não existe)           | **Diretoria** (dashboard gerencial) | /dashboard/diretoria | diretoria        |
| (não existe)           | **Futebol** → Comissão técnica, Análise (Avaliações, Status) | /dashboard/futebol/* | futebol_*, diretoria |
| (não existe)           | **Relatórios**            | /dashboard/relatorios/* | relatorios [NOVO]  |
| (não existe)           | **Adm** (só depto. adm)   | /dashboard/adm/*    | adm_* (novos – fase 3) |
| (não existe na sidebar)| Médico                    | /dashboard/medico   | medico (já existe)     |
| (não existe na sidebar)| Psicologia                | /dashboard/consultas | psicologia (já existe)  |
| (não existe na sidebar)| Jurídico                  | abas do jogador     | juridico               |
| Abas Avaliações/Status | **Futebol → Análise** (menu); permissão continua `diretoria` | — | diretoria        |
| Emails, Senhas, Páginas, Notícias, Mídia | **Ferramentas** (submenu) | mesmos hrefs | mesmos slugs           |

**Resumo:** **Diretoria** acima de Empresas; dashboard gerencial com visão de todas as empresas. **Empresas** = só esse nome (Listagem + Tipos). **Futebol** inclui Comissão técnica e Análise (Avaliações, Status, Desempenho). **Relatórios** = novo menu. Todos os módulos separados por empresa/clube.

---

## Fases de implementação (seguro para produção)

**Fase 1 — Só reorganização (zero risco):**
- Alterar apenas `dashboard-menu.config.ts`: o grupo "Cadastros" vira **Empresas** (Listagem + Tipos — sem nome "Negócios") e **Futebol** (Categorias, …, Jogadores). **Diretoria** vira grupo no topo (acima de Empresas) com link para dashboard gerencial. **Usuários** dentro de **Configurações**. **Emails, Senhas, Páginas, Notícias, Mídia** dentro de **Ferramentas**. **Mantendo todos os href e moduleSlug atuais**.
- Atualizar `sidebar.tsx` para: Diretoria (acima), Empresas, Futebol, Ferramentas, Configurações (com Usuários). Lógica de `canAccessModule` e rotas permanece idêntica.
- **Não** criar novos módulos no banco; **não** criar novas rotas. URLs continuam iguais.
- Resultado: usuário vê "Diretoria", "Empresas", "Futebol", "Ferramentas", "Configurações". Nada quebra.

**Fase 2 — Módulos transversais e Diretoria/Relatórios:**
- Adicionar itens de primeiro nível: **Médico**, **Psicologia**, **Jurídico**. **Diretoria** já no topo (Fase 1) com dashboard gerencial. **Relatórios** como grupo (menu) com rotas futuras.
- Módulos `medico`, `psicologia`, `juridico`, `diretoria` já existem no banco — só exibir na sidebar para quem tem acesso. Avaliações e Status no jogador continuam com permissão `diretoria`; no menu aparecem em **Futebol → Análise**.

**Fase 3 — Novos módulos e rotas (incremental):**
- Criar no banco novos Module: **Adm** (`adm_financeiro`, `adm_compras`, `adm_rh`, …), **Futebol** (`futebol_comissao`, `futebol_fisiologia`, `futebol_analise`), **Relatórios** (`relatorios`), Sócio Torcedor, Marketing.
- Rotas: `/dashboard/adm/*`, `/dashboard/futebol/*` (incl. Comissão técnica e Análise com Avaliações/Status), `/dashboard/relatorios/*`. Todos os módulos separados por empresa/clube.

---

## Abas do jogador

**Avaliações** e **Status** continuam com `moduleSlug: diretoria` (quem tem acesso à diretoria vê). No **menu** da sidebar ficam em **Futebol → Análise**. Demais abas inalteradas; filtro por `canAccessModule(tab.moduleSlug)`.

---

## Resumo

- **Escopo:** Todos os módulos ajustados e separados por empresa/clube (tenant).
- **Diretoria** = acima de Empresas; dashboard gerencial com todas as informações de todas as empresas, exclusivo da diretoria. Não é mais o menu de “Avaliações/Status” — esses vão para Futebol → Análise.
- **Empresas** = só esse nome (sem “Negócios”): Listagem + Tipos de Negócios.
- **Adm** = departamento administrativo (Financeiro, Compras, RH, Patrimônio, Nutrição, Estoque).
- **Futebol** = Categorias, Campeonatos, Estádios, Times, Jogadores, **Comissão técnica** (técnicos, assistentes), Fisiologia, **Análise** (Avaliações, Status, Desempenho — Avaliações e Status continuam com permissão `diretoria`).
- **Relatórios** = novo menu para relatórios do app.
- **Ferramentas** = Emails, Senhas, Páginas, Notícias, Mídia.
- **Configurações** = Usuários (submenu) + telas atuais.
- **Fase 1:** Diretoria (topo), Empresas, Futebol, Ferramentas, Configurações. Deploy seguro.
- **Fase 2:** Médico, Psicologia, Jurídico, Relatórios (menu).
- **Fase 3:** Adm, Futebol (Comissão técnica, Fisiologia, Análise), Relatórios (rotas), Sócio Torcedor, Marketing.
