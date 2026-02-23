# Para colar no ChatGPT (onde o código errava no servidor)

Use o texto abaixo para explicar ao ChatGPT o que não funciona no servidor e evitar que ele repita os mesmos erros.

---

**Copia e cola:**

---

No servidor (AWS Lightsail, Ubuntu, Node + PM2) o código que você sugeria quebrava por estes motivos:

1. **PrismaService com `super()` vazio**  
   No Prisma 7, `PrismaClient` exige um objeto de opções não vazio. Chamar só `super()` sem argumentos gera:  
   `PrismaClientInitializationError: PrismaClient needs to be constructed with a non-empty, valid PrismaClientOptions`.  
   **Solução:** Chamar `super({ log: ['error', 'warn'] })` (ou `['query', 'error', 'warn']` em dev). Não passar `datasource` no construtor; a URL vem do `prisma.config.ts` e do `DATABASE_URL` no ambiente.

2. **Uso de `localhost` na DATABASE_URL**  
   No Linux, o Node pode resolver `localhost` para IPv6 e a conexão com o Postgres falha.  
   **Solução:** Em produção usar `127.0.0.1` na URL (ex.: `postgresql://user:pass@127.0.0.1:5432/dbname`). O nosso `prisma.config.ts` troca `localhost` por `127.0.0.1` quando `NODE_ENV=production`.

3. **Arquivos com CRLF (Windows)**  
   Scripts e arquivos .ts com fim de linha Windows (CRLF) no repo podem quebrar no Linux (erro de parsing, “Expected ';' or '}'”).  
   **Solução:** Projeto com `.editorconfig` com `end_of_line = lf`. Commitar sempre com LF.

4. **Adapter pg / Pool no Prisma**  
   Usar `@prisma/adapter-pg` e `new Pool(pg)` no PrismaService fazia a API travar no startup no Lightsail.  
   **Solução:** Usar só o motor nativo do Prisma (sem adapter), com `super({ log: [...] })` e deixar o Prisma ler a URL do `prisma.config.ts`.

5. **Versões diferentes de Prisma**  
   `prisma` CLI e `@prisma/client` com versões diferentes podem gerar binários incompatíveis.  
   **Solução:** Manter os dois em exatamente a mesma versão (ex.: 7.3.0) no `package.json`.

Quando for sugerir código para o PrismaService, o NestJS ou o deploy, considere: Prisma 7 + `prisma.config.ts`, motor nativo (sem adapter-pg), opções não vazias no construtor, e DATABASE_URL com 127.0.0.1 em produção.

---

(Fim do texto para o ChatGPT.)
