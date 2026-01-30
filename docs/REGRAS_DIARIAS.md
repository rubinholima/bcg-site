# 📋 REGRAS DIÁRIAS — BCG PLATFORM

> **Este documento é a ÚNICA FONTE DE VERDADE das regras do projeto BCG Platform.**
> Deve ser lido **TODO DIA** antes de qualquer desenvolvimento.

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
cd apps/web && pnpm dev
cd apps/api && pnpm start:dev
docker ps
pnpm dlx prisma studio
```
