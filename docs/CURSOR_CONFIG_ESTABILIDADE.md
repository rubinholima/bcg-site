# Configuração do Cursor — Menos arquivos e mais estabilidade

**As alterações abaixo já foram aplicadas** no seu Cursor (User settings) e no projeto (`.vscode/settings.json`). Se ainda vir muitos arquivos ou o Cursor fechar, feche e reabra o Cursor.

---

## Por que aparecem tantos arquivos?

1. **Workspace com várias pastas** — Se você abriu um workspace com vários projetos (ex.: BCG SITE + ATRIUM-CHURCH-MANAGER + outros), o Cursor indexa tudo. Quanto mais pastas abertas, mais arquivos e mais uso de memória.
2. **Arquivos temporários** — Os `_tmp_*` são criados pelo editor; já estão no `.gitignore` e podem ser ignorados também no explorador.
3. **node_modules, .next, dist** — Pastas grandes que o editor pode vigiar e indexar se não forem excluídas.

## Por que o Cursor pode fechar sozinho?

Geralmente é **uso de memória (RAM)** alto:
- Muitos arquivos indexados (vários projetos abertos)
- File watcher em pastas grandes (node_modules, .next)
- Extensões pesadas (TypeScript, XML com muitos símbolos, etc.)
- IA/indexação em background

---

## Ajustes recomendados (Cursor estável + menos arquivos)

### 1. Abrir só o projeto do dia

- Em vez de abrir o workspace com **todos** os projetos, abra só a pasta em que está trabalhando (ex.: **File → Open Folder** → `E:\DEV\BCG SITE`).
- Assim o Cursor indexa menos arquivos e usa menos memória.

### 2. Configurações do usuário (Cursor)

Abra as configurações: **File → Preferences → Settings** (ou `Ctrl+,`).  
Clique no ícone **{}** (Open Settings JSON) e **adicione ou ajuste**:

```json
{
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.vite": true,
    "**/*.tsbuildinfo": true,
    "**/_tmp*": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true,
    "**/.vite": true,
    "**/coverage": true,
    "**/.next": true,
    "**/_tmp*": true
  },
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/build/**": true,
    "**/.vite/**": true,
    "**/.next/**": true,
    "**/coverage/**": true,
    "**/_tmp*": true
  }
}
```

- **files.exclude** — esconde pastas/arquivos do explorador (incluindo `_tmp*`).
- **search.exclude** — tira da busca para não indexar.
- **files.watcherExclude** — o editor deixa de “vigiar” essas pastas; reduz muito o uso de memória e evita travamentos.

### 3. (Opcional) Aumentar memória do TypeScript

Se o projeto for grande e o TS ficar lento ou o Cursor fechar ao abrir arquivos `.ts`/`.tsx`:

- No JSON de configurações do usuário, adicione:
  ```json
  "typescript.tsserver.maxTsServerMemory": 4096
  ```
  (4096 = 4 GB; use 2048 se tiver pouca RAM.)

### 4. Extensões

- Desative extensões que não usa (XML, Red Hat, etc.) em **Extensions** para ver se o Cursor fica mais estável.
- Quanto menos extensões pesadas, menor a chance de fechar sozinho.

### 5. Onde fica o settings.json (Windows)

- **Configurações do usuário:**  
  `%APPDATA%\Cursor\User\settings.json`  
  (ex.: `C:\Users\SEU_USUARIO\AppData\Roaming\Cursor\User\settings.json`)

---

## Resumo rápido

| Objetivo              | Ação |
|-----------------------|------|
| Menos arquivos visíveis | `files.exclude` com `**/_tmp*`, `**/node_modules`, etc. |
| Menos índice/busca    | `search.exclude` nas mesmas pastas. |
| Menos fechamentos     | `files.watcherExclude` em `.next`, `node_modules`, `dist`, etc. |
| Menos peso no workspace | Abrir **só a pasta do projeto** em que está trabalhando. |

Depois de alterar o `settings.json`, feche e reabra o Cursor para garantir que as opções foram aplicadas.

---

## Indexing & Docs (Cursor)

Em **Settings → Cursor → Indexing & Docs**:

1. **Index New Folders** — Recomendado **desligar** (toggle OFF). Assim o Cursor não indexa automaticamente toda pasta nova; você evita picos de uso e o editor fica mais estável.
2. **Ignore Files in .cursorignore** — Crie na **raiz do projeto** (ex.: `E:\DEV\BCG SITE`) um arquivo chamado **`.cursorignore`** com o conteúdo abaixo. Isso faz o índice da IA ignorar essas pastas/arquivos (menos arquivos indexados = menos memória e mais estabilidade):

```
node_modules
**/node_modules
.next
**/.next
dist
**/dist
build
**/build
.vite
**/.vite
coverage
**/coverage
*.tsbuildinfo
_tmp*
**/_tmp*
.env
.env.*
.git
**/.git
.DS_Store
pnpm-lock.yaml
package-lock.json
```

Depois de salvar o `.cursorignore`, em **Indexing & Docs** você pode clicar em **Compute index** para reindexar só o que importa (o Cursor passará a respeitar o `.cursorignore`).
