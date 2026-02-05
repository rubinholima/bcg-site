# Páginas por empresa/clube e subdomínios (AWS)

## Criar página no dev

1. **Cadastre a empresa/clube** em Dashboard → Empresas (ex.: Boston City FC).
2. Vá em **Dashboard → Páginas**.
3. No card da empresa, clique em **Criar página** (ou **Editar página** se já existir).
4. No construtor, use o dropdown **Adicionar módulo** para montar a página (Hero, Próximos jogos, Notícias, etc.). Em cada módulo: aparência (cor, imagem de fundo, opacidade), título PT/EN e, quando aplicável, corpo e imagem.
5. Salve. A página fica vinculada ao tenant (empresa/clube).

**Ver a página no dev:** hoje a página pública do tenant pode ser acessada por **/portfolio/[slug]** (ex.: `/portfolio/bostoncityfc`). No futuro, o conteúdo modular da “página” do tenant pode ser exibido nessa rota ou em uma rota dedicada.

---

## Subdomínio na AWS (ex.: bostoncityfc.bostoncitygroup.biz)

Na AWS, o subdomínio **bostoncityfc.bostoncitygroup.biz** deve apontar para o mesmo app (ex.: Vercel ou outro host).

- **DNS:** crie um registro CNAME (ou A/AAAA conforme o host) para `bostoncityfc.bostoncitygroup.biz` apontando para o domínio principal do app (ex.: `bostoncitygroup.biz` ou o endpoint da Vercel).
- **App:** o backend/frontend precisa identificar o tenant pelo subdomínio (ex.: extrair `bostoncityfc` do hostname) e carregar a página (e dados) daquele tenant. Isso pode ser feito em middleware (Next.js) ou no servidor que resolve a página.

Resumo: **no dev** você cria e edita a página normalmente em Páginas; **na AWS**, após configurar DNS e lógica de subdomínio, o mesmo conteúdo será exibido em **bostoncityfc.bostoncitygroup.biz**.
