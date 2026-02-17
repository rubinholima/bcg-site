# Melhorar a planilha Times por Categorias no Google Sheets

Você pode deixar a planilha mais fácil de preencher usando **dropdowns** (listas) e outras opções do Google Sheets.

## 1. Congelar a primeira linha (cabeçalho)

- **Visualizar** → **Congelar** → **1 linha**  
Assim o cabeçalho continua visível ao rolar.

## 2. Dropdowns (Validação de dados)

Selecione a coluna (ou o intervalo de células) e use **Dados** → **Validação de dados**.

### Categoria (coluna A, a partir da linha 2)

- **Critério:** Lista de itens  
- **Itens:** (cole exatamente, separado por vírgula)  
  `principal, sub20, sub17, sub15, sub13, sub11, sub9, feminino`  
- Marque **Mostrar lista suspensa na célula** e, se quiser, **Rejeitar entrada** para não permitir outro texto.

### Posição (coluna I – posicao)

Use **nomes** (o sistema aceita códigos e nomes):

- **Itens:**  
  `Goleiro, Zagueiro Central, Lateral Esquerdo, Lateral Direito, Ala Esquerdo, Ala Direito, Volante, Meio-Campista, Meia-Atacante, Meia Esquerda, Meia Direita, Ponta Esquerda, Ponta Direita, Atacante, Centroavante`

Ou use **códigos** (GK, CB, etc.) se preferir:  
`GK, CB, LB, RB, LWB, RWB, CDM, CM, CAM, LM, RM, LW, RW, CF, ST`

### Pé dominante (coluna J – pe_dominante)

- **Itens:**  
  `Esquerdo, Direito, Ambos`

## 3. Usar uma aba “Opções” com as listas

Para não digitar a lista toda na validação:

1. Crie uma aba chamada **Opções** (ou **Config**).
2. Na coluna A dessa aba, coloque uma lista por célula, por exemplo:
   - A1: `principal`
   - A2: `sub20`
   - A3: `sub17`
   - … (uma categoria por linha)
3. Na planilha principal, na **Validação de dados** da coluna de categoria:
   - **Critério:** Lista de um intervalo  
   - **Intervalo:** `Opções!A1:A8` (ajuste se tiver mais/menos linhas)

Você pode fazer o mesmo para **posição** (outra coluna na aba Opções) e **pe_dominante**.

## 4. Formatação rápida

- **Cabeçalho:** negrito e cor de fundo (ex.: cinza escuro com texto branco).
- **Largura das colunas:** arraste o divisor do cabeçalho para deixar `nome`, `bio_pt`, `bio_en` e `melhores_momentos` mais largos.
- **Alinhamento:** números (altura, peso, número, gols, etc.) centralizados; texto à esquerda.

## 5. Dicas

- A **primeira linha** deve ser sempre o cabeçalho com os nomes das colunas (categoria, nome, posicao, pe_dominante, etc.).
- Para **Publicar na Web** e usar no dashboard: **Arquivo** → **Compartilhar** → **Publicar na Web** → escolha a aba → Formato CSV.
- O template CSV para importar está em: **Baixar template CSV** no bloco Times por Categorias do dashboard.
