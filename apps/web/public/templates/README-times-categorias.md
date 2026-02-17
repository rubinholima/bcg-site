# Template: Times por Categorias

Use o arquivo `times-categorias-template.csv` para importar jogadores via Google Sheets no módulo **Times por Categorias**.

## Como usar

1. Abra [Google Sheets](https://sheets.google.com) e crie uma nova planilha.
2. **Arquivo → Importar → Fazer upload** e escolha `times-categorias-template.csv` (ou copie e cole o conteúdo do CSV na primeira aba).
3. Preencha as linhas com os jogadores. Mantenha a **primeira linha como cabeçalho**.
4. Na coluna **categoria**, use um dos valores: `principal`, `sub20`, `sub17`, `sub15`, `sub13`, `sub11`, `sub9`, `feminino`.
5. Compartilhe a planilha: **Compartilhar → Qualquer pessoa com o link pode ver**.
6. No editor da página (bloco Times por Categorias), cole a URL da planilha e clique em **Atualizar com Google Sheets**.

## Colunas aceitas

| Coluna | Descrição | Exemplo |
|--------|-----------|--------|
| categoria | **Obrigatório.** Id da categoria (principal, sub20, sub17, etc.) | principal |
| nome | Nome do jogador | João Silva |
| foto_url | URL da foto | https://... |
| data_nascimento | Data de nascimento | 1995-03-15 |
| nacionalidade | País | Brasil |
| altura | Altura em cm (número) | 182 |
| peso | Peso em kg (número) | 78 |
| numero_camisa | Número da camisa | 10 |
| posicao | Posição (ex.: GK, MEI, ATA) | MEI |
| time_atual | Clube atual (pode deixar vazio; o sistema pode preencher com o nome da página) | |
| partidas | Partidas jogadas | 120 |
| gols | Gols | 15 |
| assistencias | Assistências | 20 |
| amarelos | Cartões amarelos | 2 |
| vermelhos | Cartões vermelhos | 0 |
| bio_pt | Biografia em português | Texto... |
| bio_en | Biografia em inglês | Text... |
| instagram | @ ou URL | @joaosilva |
| twitter | @ ou URL | |
| facebook | URL | |
| tiktok | @ ou URL | |
| youtube | URL | |
| website | URL | |
| melhores_momentos | URLs separadas por \| | https://a.com \| https://b.com |

Colunas em inglês também funcionam: `category`, `name`, `photo_url`, `birth_date`, `position`, `current_team`, `matches`, `goals`, `assists`, etc.
