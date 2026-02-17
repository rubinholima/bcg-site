# Como evitar erro "Out of Memory" (OOM) no Cursor

O Cursor pode fechar com **"The window terminated unexpectedly (reason: 'oom', code: '-536870904')"** mesmo com bastante RAM livre. O limite costuma ser do processo Electron/IDE, não da máquina.

---

## Solução definitiva: aumentar o limite de memória

O Cursor usa Node/Electron. Dá para **aumentar o heap do Node** de duas formas. Use **uma** delas.

### Opção A — Variável de ambiente no Windows (vale para sempre)

1. **Win + R** → digite `sysdm.cpl` → Enter.
2. Aba **Avançado** → **Variáveis de Ambiente**.
3. Em **Variáveis do sistema** (ou do usuário), clique em **Novo**:
   - Nome: `NODE_OPTIONS`
   - Valor: `--max-old-space-size=8192`  
     (8192 = 8 GB; com 64 GB RAM pode usar `16384` para 16 GB.)
4. **OK** em tudo e **reinicie o Cursor** (feche e abra de novo).

A partir daí todo processo Node usado pelo Cursor pode usar até esse limite.

**Como testar se a variável está em 16 GB:**  
- Abra um **novo** terminal (PowerShell ou CMD) **dentro do Cursor** (Terminal → Novo Terminal).  
- Rode: `echo %NODE_OPTIONS%` (CMD) ou `echo $env:NODE_OPTIONS` (PowerShell).  
  Deve aparecer: `--max-old-space-size=16384` (16384 MB = 16 GB).  
- Para ver o limite que o Node está usando de fato, rode no mesmo terminal:  
  `node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024**3, 'GB')"`  
  Deve mostrar um número próximo de 16 (ex.: 15.99...) se estiver com 16384.  
- Ou execute o script **`scripts\verificar-node-options.ps1`** no PowerShell (mostra a variável e o limite em GB). Não apague essa variável se usar Node no terminal para outras coisas; 8–16 GB só para o Cursor costuma ser aceitável.

### Opção B — Script que abre o Cursor com mais memória (só quando usar esse script)

1. Feche o Cursor.
2. No projeto, execute o script:  
   **`scripts\cursor-launch-com-mais-memoria.bat`**  
   (duplo clique ou pelo terminal).
3. O Cursor abre já com `NODE_OPTIONS=--max-old-space-size=8192` só para essa execução.

Dentro do script você pode alterar:
- `HEAP_MB` (ex.: 16384 para 16 GB).
- `CURSOR_EXE` se o Cursor estiver em outro caminho.
- **Por padrão o script não passa pasta:** o Cursor abre e restaura a última sessão (e o chat continua lá). Se passar uma pasta, abre uma janela “nova” e o chat pode sumir nessa janela. Para abrir direto numa pasta, descomente a linha `set "PROJETO=..."` no .bat.

**Observação:** O processo de renderização do Electron (janela da UI) tem um teto próprio (~4 GB em muitos casos). Aumentar o Node ajuda principalmente no processo principal e em extensões; mesmo assim costuma reduzir bastante OOM. Se no terminal integrado o comando `node -e "..."` ainda mostrar ~4 GB, pode ser o Node do terminal (processo separado); o que importa é o processo principal do Cursor ter o limite maior.

---

## O que fazer quando aparecer o diálogo

1. **Marque "Don't restore editors"** antes de clicar em Reopen. Assim o Cursor não reabre dezenas de abas e consome menos memória.
2. Depois de reabrir, abra só os arquivos que for usar naquela tarefa.

## Hábitos que reduzem OOM

| Ação | Por quê |
|------|--------|
| **Uma janela por projeto** | Evite workspace com várias pastas (ex.: BCG SITE + outros). Abra só a pasta do projeto em que está trabalhando. |
| **Poucas abas abertas** | Feche abas que não está usando (Ctrl+K W fecha as outras). |
| **Chat / Agent com escopo menor** | Evite @ em pastas enormes ou "tudo do projeto". Use @ em arquivos ou pastas específicas. |
| **Reiniciar o Cursor de tempos em tempos** | Especialmente depois de sessões longas de chat ou Agent. |
| **Desativar extensões que não usa** | Extensões pesadas aumentam o uso de memória. Teste com `cursor --disable-extensions` para ver se melhora. |
| **Privacy Mode** | Em Settings do Cursor, ativar Privacy Mode pode reduzir retenção de dados e um pouco de uso de memória. |

## Configurações do projeto

O `.vscode/settings.json` deste repositório já exclui `node_modules`, `.next`, `dist`, etc. de busca e do file watcher para o IDE não indexar pastas gigantes. Não remova essas exclusões.

## Se continuar travando

- Use **modo seguro** para testar: feche o Cursor e abra pelo terminal com:  
  `cursor --disable-extensions "e:\DEV\BCG SITE"`  
  (ajuste o caminho se for outro.)
- Trabalhe em **tarefas menores** no chat: em vez de "refatore todo o módulo X", use "refatore a função Y no arquivo Z".
- Em último caso, use outro editor (VS Code) para edição pesada e o Cursor só para perguntas pontuais.

---

*Referência: [Reduce Cursor IDE's RAM usage](https://forum.cursor.com/t/reduce-cursor-ides-ram-usage/54292), [OOM code -536870904](https://forum.cursor.com/t/oom-cursor-the-window-terminated-unexpectedly-reason-oom-code-536870904-we-are-sorry-for-the-inconvenience-you-can-reopen-the-window-to-continue-where-you-left-off/143579).*
