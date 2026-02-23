# Para colar no ChatGPT (onde o código errava no servidor)

Use o texto abaixo para explicar ao ChatGPT o que não funciona no servidor e evitar que ele repita os mesmos erros.

---

**Copia e cola:**

---

No servidor (AWS Lightsail, Ubuntu, Node + PM2) o código que você sugeria quebrava por estes motivos:

1. **Prisma 7 exige adapter ou Accelerate**  
   No Prisma 7, o motor exige `adapter` ou `accelerateUrl`. O adapter `@prisma/adapter-pg` travava a API no startup no Lightsail.  
   **Solução:** Usar **Prisma 6** (6.8.2). Schema com `url = env("DATABASE_URL")` no datasource. Sem `prisma.config.ts`.

2. **Uso de `localhost` na DATABASE_URL**  
   No Linux, o Node pode resolver `localhost` para IPv6 e a conexão com o Postgres falha.  
   **Solução:** Em produção usar `127.0.0.1`. O `main.ts` normaliza `localhost` → `127.0.0.1` quando `NODE_ENV=production`.

3. **Arquivos com CRLF (Windows)**  
   Scripts e arquivos .ts com fim de linha Windows (CRLF) no repo podem quebrar no Linux (erro de parsing).  
   **Solução:** Projeto com `.editorconfig` com `end_of_line = lf`. Commitar sempre com LF.

4. **Versões diferentes de Prisma**  
   `prisma` CLI e `@prisma/client` com versões diferentes podem gerar binários incompatíveis.  
   **Solução:** Manter os dois em exatamente a mesma versão (ex.: 6.8.2) no `package.json`.

Quando for sugerir código para o PrismaService, o NestJS ou o deploy, considere: **Prisma 6** (não 7), schema com `url = env("DATABASE_URL")`, `super({ log: [...] })`, e DATABASE_URL com 127.0.0.1 em produção.

---

(Fim do texto para o ChatGPT.)
