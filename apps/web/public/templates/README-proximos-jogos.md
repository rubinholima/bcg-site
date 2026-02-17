# Template: Próximos Jogos

Use o arquivo `proximos-jogos-template.csv` para importar próximos jogos via Google Sheets no módulo **Próximos Jogos**.

## Como usar

1. Abra [Google Sheets](https://sheets.google.com) e crie uma nova planilha.
2. **Arquivo → Importar → Fazer upload** e escolha `proximos-jogos-template.csv` (ou copie e cole o conteúdo na primeira aba).
3. **Configure validação de dados** (veja seção abaixo) para ter dropdowns com os dados já cadastrados.
4. Preencha as linhas com os jogos. Mantenha a **primeira linha como cabeçalho**.
5. Compartilhe: **Compartilhar → Qualquer pessoa com o link pode ver** (ou use **Arquivo → Publicar na Web**).
6. No editor da página (bloco Próximos Jogos, fonte Manual), cole a URL da planilha e clique em **Atualizar com Google Sheets**.

## Sincronização em duas vias

- **App → Planilha (dropdowns):** O que está cadastrado no app (times adversários, competições, locais, categorias) alimenta os dropdowns da planilha. Use **Baixar listas para dropdowns** no editor ou as URLs CSV (`?format=csv`); ao criar/editar cadastros no app, rebaixe as listas ou use IMPORTDATA para atualizar.
- **Planilha → App:** Ao clicar em **Atualizar com Google Sheets**, os jogos da planilha são importados para o app.

## O que é o campo "destaque"?

**destaque** = se o jogo deve aparecer **em destaque** no site (ex.: clássico, final). Valores: **sim** ou **não**. Jogos com `sim` podem ter visual diferenciado na página pública.

## Configurar Validação de Dados (Dropdowns)

Para ter dropdowns que mostram apenas os dados já cadastrados no sistema:

### Método 1: Baixar listas e colar na aba "Listas" (recomendado)

1. No editor da página, bloco **Próximos Jogos** (fonte Manual), clique em **Baixar listas para dropdowns**. Será baixado um CSV com colunas: competicao, local, time_visitante, **url_logo_time**, categoria, destaque, nosso_time (nome e URL do logo do clube vêm juntos).
2. Na planilha, crie uma aba **Listas** e cole o conteúdo do CSV (célula A1).
3. Na aba dos jogos: **Dados → Validação de dados** → Lista de uma faixa:
   - competicao: `Listas!A2:A200`
   - local: `Listas!B2:B200`
   - time_visitante/time_casa: `Listas!C2:C200`
   - Para **logo_casa** ou **logo_visitante**: use PROCV (ou XLOOKUP) pelo nome do time na coluna C da Listas; a coluna D tem a url_logo_time.
   - categoria: `Listas!E2:E200`
   - destaque: `Listas!F2:F10`
   - nosso_time: `Listas!G2:G10`
4. Ao cadastrar novos times/competições/estádios no app, baixe de novo as listas e cole na aba Listas.

### Método 2: IMPORTDATA (atualização automática na planilha)

Se o app estiver acessível por URL pública:

1. Crie uma aba **Listas**. Use as URLs CSV (retornam uma coluna "name" cada):
   - A1: `=IMPORTDATA("https://SEU_DOMINIO/api/public/cadastros/championships?format=csv")`
   - B1: `=IMPORTDATA("https://SEU_DOMINIO/api/public/cadastros/stadiums?format=csv")`
   - C1: `=IMPORTDATA("https://SEU_DOMINIO/api/public/cadastros/visiting-teams?format=csv")`
2. Na aba dos jogos: validação competicao = Listas!A2:A, local = Listas!B2:B, time_visitante = Listas!C2:C.
3. Categoria, destaque e nosso_time: use lista fixa (categoria = principal, sub20, sub17, …; destaque = sim, não; nosso_time = casa, visitante).

Assim, ao criar/editar cadastros no app, a planilha passa a mostrar as novas opções nos dropdowns (após refresh do IMPORTDATA).

### Validações por Coluna

| Coluna | Valores | Como configurar |
|--------|---------|-----------------|
| **competicao** | Competições cadastradas | Listas!A2:A |
| **local** | Estádios cadastrados | Listas!B2:B |
| **time_visitante** / **time_casa** | Nome do time | Listas!C2:C |
| **url_logo_time** (coluna D na Listas) | URL do logo do time (mesma linha do nome) | Use PROCV pelo nome do time para preencher logo_casa/logo_visitante nos jogos |
| **categoria** | principal, sub20, sub17, … | Listas!E2:E |
| **destaque** | sim, não | Listas!F2:F |
| **nosso_time** | casa, visitante | Listas!G2:G |

### Atualização Automática

Quando você cadastrar novos clubes adversários, competições ou estádios no sistema (Dashboard → Cadastros), eles aparecerão automaticamente nos dropdowns se você usar o Método 2 com `IMPORTDATA`. Se usar o Método 1, você precisará atualizar manualmente a lista de validação.

## Colunas aceitas

| Coluna | Descrição | Exemplo | Validação |
|--------|-----------|---------|-----------|
| data | Data do jogo (YYYY-MM-DD) | 2025-03-15 | Formato de data |
| hora | Horário (HH:MM ou HH:MM:SS) | 20:00 | Formato de hora |
| time_casa | Nome do time mandante | Nosso Clube | Texto livre ou dropdown |
| time_visitante | Nome do time visitante | Adversário A | Dropdown (times cadastrados) |
| competicao | Nome da competição | Campeonato Estadual | Dropdown (competições cadastradas) |
| local | Estádio/local (opcional) | Estádio Municipal | Dropdown (estádios cadastrados) |
| url_assistir | Link para assistir (opcional) | https://... | URL válida |
| url_ingresso | Link para ingressos (opcional) | https://... | URL válida |
| categoria | principal, sub20, sub17, sub15, sub13, sub11, sub9, feminino | principal | Dropdown (lista fixa) |
| **destaque** | **sim** = jogo em destaque (clássico, final, etc.); **não** = jogo normal | não | Dropdown (sim/não) |
| logo_casa | URL do logo do time da casa (opcional) | | URL válida |
| logo_visitante | URL do logo do visitante (opcional) | | URL válida |
| nosso_time | **casa** = nosso time joga em casa; **visitante** = nosso time joga fora | casa | Dropdown (casa/visitante) |

**Sobre "destaque":** Marque como `sim` para jogos importantes que devem aparecer destacados no site (ex.: clássicos, finais, jogos decisivos). Jogos destacados podem ter visual diferenciado na página pública.

Colunas em inglês também funcionam: `date`, `time`, `home_team`, `away_team`, `competition`, `venue`, `watch_url`, `ticket_url`, `category`, `featured`, `our_team`.

## Exportar jogos já cadastrados

Para preencher a planilha com os jogos que já estão cadastrados no módulo:

1. No editor da página, vá até o bloco **Próximos Jogos**.
2. Se houver jogos na lista manual, você pode copiar os dados manualmente ou usar a funcionalidade de exportação (se disponível).

**Nota:** Quando você cadastrar novos clubes adversários, competições ou estádios no sistema (Dashboard → Cadastros), eles aparecerão automaticamente nos dropdowns da planilha (se você configurou validação de dados usando as APIs acima).
