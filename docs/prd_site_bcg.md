Perfeito. Abaixo está um **PRD DETALHADO**, **pronto para colar direto no Cursor** e usar como documento base do projeto (referência técnica, de produto e de arquitetura).
Ele está escrito de forma **executável**, pensado para desenvolvimento real em produção na AWS desde o dia 1.

---

# 📘 PRD — Boston City Group Digital Platform

**Domínio:** `https://www.bostoncitygroup.biz`
**Status:** MVP em produção (fase 1)
**Owner:** Boston City Group
**Produto:** Portal institucional + Plataforma multi-empresas + Dashboard administrativo

---

## 1. Visão Geral do Produto

### 1.1 Objetivo

Criar uma **plataforma digital centralizada** para o Boston City Group, capaz de:

* Representar institucionalmente o **grupo empresarial**
* Exibir **todas as empresas do grupo** (clubes, restaurantes, construtoras, escolas etc.)
* Permitir que **cada empresa tenha sua própria página pública**
* Oferecer um **dashboard** onde cada empresa gerencie seus conteúdos e módulos
* Escalar facilmente para novas empresas, países e verticais de negócio

---

## 2. Escopo do MVP (Fase 1)

### Incluído

* Portal público do grupo
* Páginas públicas individuais por empresa
* Dashboard administrativo multi-tenant
* Autenticação e controle de acesso
* CMS básico (páginas, notícias, mídia)
* Infraestrutura 100% em AWS (produção)

### Fora do escopo (futuras fases)

* E-commerce
* Bilheteria
* Streaming ao vivo
* Financeiro / faturamento
* Integrações externas (SofaScore, Stripe, etc.)

---

## 3. Arquitetura Conceitual

### 3.1 Modelo Multi-Tenant

* Um único sistema
* Várias empresas (tenants)
* Cada tenant:

  * Tem seus próprios usuários
  * Seus próprios conteúdos
  * Seus próprios módulos
* Isolamento lógico via `tenant_id`

---

## 4. Tipos de Usuário e Permissões

### 4.1 Perfis

#### 🔑 Group Super Admin

* Gerencia o grupo inteiro
* Cria e remove empresas
* Define módulos disponíveis
* Acessa todos os dados

#### 🏢 Company Admin

* Administra apenas sua empresa
* Gerencia usuários da empresa
* Ativa/desativa módulos
* Publica conteúdos

#### ✏️ Editor

* Cria e edita conteúdo
* Não publica
* Sem acesso a configurações

#### 👁 Viewer

* Apenas leitura no dashboard

---

## 5. Estrutura do Portal Público

### 5.1 Home

* Hero institucional
* Apresentação do grupo
* Cards das empresas (com filtros por categoria)
* Destaques / números do grupo
* CTA para investidores/parcerias

### 5.2 Página “O Grupo”

* História
* Missão, visão e valores
* Governança
* Presença geográfica
* Estrutura empresarial

### 5.3 Página “Empresas”

* Grid de empresas
* Filtros por tipo:

  * Futebol
  * Alimentação
  * Construção
  * Educação
  * Outros
* Cada card direciona para página própria da empresa

### 5.4 Notícias do Grupo

* Feed agregado
* Filtro por empresa
* SEO-friendly

### 5.5 Página de Contato

* Contato geral do grupo
* Formulário
* Redirecionamento por tipo de interesse

---

## 6. Página Pública da Empresa (Tenant)

Cada empresa terá uma URL própria:

```
/empresa/{slug}
```

### 6.1 Estrutura Base

* Hero (logo + imagem + resumo)
* Blocos modulares (ativados no dashboard)
* SEO individual

### 6.2 Módulos Disponíveis (MVP)

* Sobre a Empresa
* Notícias
* Galeria (imagem/vídeo)
* Contato
* Links externos

### 6.3 Módulos Específicos (preparados para fase 2)

* Clubes: elenco, staff, calendário
* Restaurantes: cardápio, reservas
* Escolas: cursos, matrículas
* Construtoras: portfólio, obras

---

## 7. Dashboard Administrativo

### 7.1 Autenticação

* AWS Cognito
* Login por email/senha
* JWT
* Roles vinculadas ao tenant

### 7.2 Onboarding de Empresa

1. Criar empresa:

   * Nome
   * Slug
   * Tipo de negócio
   * Logo
   * Descrição
2. Selecionar módulos ativos
3. Criar usuários
4. Página pública publicada automaticamente

### 7.3 Gestão de Conteúdo

* CRUD de páginas
* Editor por blocos
* Publicação / rascunho
* SEO básico (title, description)

### 7.4 Notícias

* Criar post
* Upload de imagem
* Tags
* Associar a empresa
* Status: draft / published

### 7.5 Mídia

* Upload para S3
* Organização por tenant
* Reuso em páginas e posts

---

## 8. Requisitos Funcionais

* Multi-tenant com isolamento lógico
* Controle de acesso por role
* CMS por blocos
* URLs amigáveis
* SEO básico
* Cache de páginas públicas
* Logs de ações administrativas

---

## 9. Requisitos Não-Funcionais

* Alta disponibilidade
* Escalabilidade horizontal
* Segurança (IAM, Secrets Manager)
* Observabilidade (logs + métricas)
* LGPD básico (consentimento)

---

## 10. Stack Tecnológica

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* shadcn/ui

### Backend

* Node.js
* NestJS
* Prisma ORM

### Banco de Dados

* PostgreSQL
* Modelo multi-tenant (`tenant_id`)

### Storage

* AWS S3 (uploads)
* CloudFront (CDN)

### Auth

* AWS Cognito

---

## 11. Infraestrutura AWS (Produção)

* Route 53 (DNS)
* ACM (SSL)
* VPC (public/private subnets)
* ECS Fargate

  * Serviço Web
  * Serviço API
* ALB
* RDS ou Aurora PostgreSQL
* S3
* CloudFront
* Cognito
* Secrets Manager
* CloudWatch

---

## 12. Estrutura de Repositório (Monorepo)

```
/apps
  /web        → Next.js (portal + dashboard)
  /api        → NestJS
/packages
  /ui         → componentes
  /shared    → types e schemas
/infra       → IaC (Terraform ou CDK)
```

---

## 13. Modelo de Dados (MVP)

### Tabelas Principais

* tenants
* users
* memberships
* roles
* modules
* tenant_modules
* pages
* page_blocks
* posts
* media
* forms
* form_submissions

---

## 14. Roadmap Resumido

### Fase 1 (MVP)

* Portal + dashboard
* Empresas + páginas
* Notícias
* Infra em produção

### Fase 2

* Módulos específicos por negócio
* Atletas / elencos
* Calendários
* Multilíngue

### Fase 3

* Financeiro
* Streaming
* Mobile app

---

## 15. Critério de Sucesso do MVP

* Nova empresa criada em < 10 minutos
* Conteúdo publicado sem dev
* Página pública indexada no Google
* Infra rodando estável em produção


