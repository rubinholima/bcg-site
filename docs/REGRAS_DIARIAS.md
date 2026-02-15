# 📋 REGRAS DIÁRIAS — BCG PLATFORM

> **Este documento é a ÚNICA FONTE DE VERDADE das regras do projeto BCG Platform.**
> Deve ser lido **TODO DIA** antes de qualquer desenvolvimento.

---

## 🚫 REGRA OBRIGATÓRIA — NUNCA MUDAR O QUE JÁ ESTÁ FUNCIONANDO

**NUNCA altere código ou comportamento que já está funcionando.**

- ❌ NÃO modifique o que o usuário confirmou que está ok
- ❌ NÃO adicione scrollbars, overflow ou mudanças de layout em áreas que já funcionam
- ❌ NÃO "melhore" ou "otimize" sem pedido explícito
- ✅ Só altere o que o usuário pediu
- ✅ Em dúvida, pergunte antes de mudar

**Se algo funciona, deixe como está.**

---

## 📜 CARROSSES E PÁGINAS PÚBLICAS — NUNCA VOLTAR AO MEIO

**Nenhuma página pública pode ter o scroll voltando para o meio.**

Em carrosséis horizontais (Próximos Jogos, Últimos Resultados, etc.):

- ❌ NUNCA usar `scrollIntoView` — altera o scroll vertical da página
- ✅ SEMPRE usar `el.scrollTo({ left: idx * (cardWidth + gap), behavior: "smooth" })` no container do carrossel

Assim só o carrossel rola na horizontal; o scroll da página permanece intacto.

---

## ⚠️ REGRA CRÍTICA — IDENTIDADE DO DASHBOARD (NÃO QUEBRAR O SHELL)

**NUNCA ALTERE A ESTRUTURA BASE DO DASHBOARD**
Arquivo crítico:
`apps/web/src/app/dashboard/layout.tsx`

O layout do dashboard DEVE sempre conter:

1. **Sidebar**
   - Logo/ícone
   - Nome do sistema: **BCG Platform**
   - Menu principal
2. **Header** no topo da área de conteúdo
   - Título da seção atual (ex: Empresas, Páginas)
   - Placeholder de usuário (até implementação de Auth)
3. **Área de conteúdo** (`children`)
   - Padding consistente
4. **Dark mode** como padrão visual

❌ NÃO remover Sidebar
❌ NÃO remover Header
❌ NÃO alterar o nome “BCG Platform” sem autorização
✅ Melhorias visuais são permitidas, **desde que a estrutura seja mantida**

---

## 🌅 ROTINA DE INÍCIO DO DIA (OBRIGATÓRIA)

**Primeira ação — banco de dados (fazer sem o usuário pedir):**

1. Verificar se o banco está no ar: `docker ps` (procurar container `bcg_db` ou serviço `db`).
2. Se **não** estiver rodando: subir o banco com `docker compose up -d db` na raiz do projeto (`E:\DEV\BCG SITE`).
3. Só então seguir com o resto do desenvolvimento.

Demais passos:

- Ler `docs/REGRAS_DIARIAS.md`
- Ler `docs/DESENVOLVIMENTO_DIARIO.md`
- Confirmar o objetivo do dia antes de codar

---

## 💻 REGRAS DE CÓDIGO (RESUMO)

- TypeScript sempre (`.ts` / `.tsx`)
- Tenant = Empresa (conceito técnico vs UI)
- Não quebrar monorepo
- Não apagar arquivos essenciais
- Não avançar passos sem validação

---

## 📄 MÓDULOS DE PÁGINA (HOME / PORTFOLIO)

**Ao implementar ou alterar blocos da Home ou das páginas por tenant, seguir:**
**`docs/MODULOS_PAGINA.md`**

Regras resumidas:

- **Padrão de todos os módulos:** cor de fundo, opacidade do overlay e títulos (PT/EN) disponíveis quando aplicável.
- **Hero:** múltiplas fotos em carrossel; 2–3 efeitos (fade, slide, zoom); indicar tamanho da tela no enunciado (ex: 1920×1080) para arte.
- **Cabeçalho e Rodapé:** módulos dedicados com opções de header e footer.

---

## 📦 MÓDULOS DO DASHBOARD

**Todo novo módulo do dashboard deve vir para a tela Configurações → Módulos.**

Ao criar uma nova página/módulo no dashboard:

1. Cadastrar no backend: tabelas **Module** e **ModuleRole** (slug, name, sortOrder; permissões por role).
2. Incluir o item no menu da sidebar com o mesmo **moduleSlug** usado no backend.
3. Proteger a página com `canAccessModule("slug_do_modulo")`.

Assim o módulo aparece em **Configurações → Módulos** e o super admin pode definir se Company Admin e Editor podem acessá-lo. Detalhes: **`docs/MODULOS_DASHBOARD.md`**.

---

## 🔀 GIT — BRANCH E COMMIT

- **Sempre trabalhar em branch** (não commitar direto em `main`).
- **Quando acertar** (páginas/API funcionando): commitar logo.
- **Repositório externo:** linkar com `git remote add origin <URL>` e dar push da branch.

**Fluxo:**

1. Abrir/criar branch: `git checkout -b feature/nome-da-feature`
2. Desenvolver e testar
3. Quando estiver ok: `git add .` → `git commit -m "descrição"` → `git push -u origin <branch>`
4. No Git externo: abrir PR ou merge quando validado

**Vincular ao Git externo (uma vez):**

```bash
cd "E:\DEV\BCG SITE"
git remote add origin <URL_DO_SEU_REPOSITORIO>
git branch -M main
git push -u origin main
```

**Abrir branch para próximas features:**

```bash
git checkout -b develop
# ou: git checkout -b feature/nome-da-feature
# quando acertar: git add . && git commit -m "descrição" && git push -u origin develop
```

---

## 🎯 COMANDOS PRINCIPAIS

```bash
# Banco (subir primeiro se não estiver rodando)
docker compose up -d db
docker ps   # conferir se bcg_db está Up

# App
cd apps/web && pnpm dev
cd apps/api && pnpm start:dev
pnpm dlx prisma studio
```
