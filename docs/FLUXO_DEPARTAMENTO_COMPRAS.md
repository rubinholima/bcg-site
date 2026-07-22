# Como usar o módulo de Compras — guia para iniciantes

Este guia é para **quem nunca usou** o sistema. Explica, passo a passo, o que fazer no dia a day no departamento de Compras da Boston City Group.

**Site:** [bostoncitygroup.biz](https://bostoncitygroup.biz)  
**Onde entrar:** faça login → menu lateral → **ADM** → **Compras**

---

## Antes de começar

### O que é o módulo de Compras?

É a área do sistema onde você:

1. **Organiza** os tipos de produto (categorias)  
2. **Cadastra** o que o clube compra e guarda (produtos)  
3. **Controla** quanto tem em estoque e a que preço comprou  
4. **Pedidos de compra** quando alguém do clube precisa de material  

Pense assim: **categoria** = gaveta do armário · **produto** = o item dentro · **estoque** = quantas unidades você tem · **requisição** = pedido formal para comprar mais.

### O que você precisa ter

- Usuário e senha com acesso a **Compras** (perfil COMPRAS ou similar)  
- Saber **qual clube/empresa** você está cadastrando (ex.: Boston City FC)  
- Na primeira vez, vale conferir se sua senha já foi trocada (o sistema pode pedir isso no login)

### Outras telas que combinam com Compras

| Menu | Para quê |
|------|----------|
| **ADM → Compras** | Categorias, produtos e requisições |
| **ADM → Estoque** | Ver saldo, dar entrada e saída |
| **ADM → Fornecedores** | Cadastrar quem vende para o clube |

---

## Passo 1 — Entrar na tela de Compras

1. Abra o site e faça **login**  
2. No menu à esquerda, clique em **ADM**  
3. Clique em **Compras**  
4. Você verá **três abas** (igual ao Patrimônio):
   - **Produtos** — cadastro e lista de itens  
   - **Categorias** — tipos/gavetas (Uniforme de treino, Jogo, Saúde, etc.)  
   - **Requisições** — pedidos de compra  

Se não aparecer o menu **Compras**, peça ao administrador para liberar seu acesso.

---

## Passo 2 — Aba **Categorias** (cadastrar tipos de produto)

Igual ao **Patrimônio**, Compras tem uma **aba só para categorias**:

1. **ADM → Compras**  
2. Clique na aba **Categorias** (ao lado de Produtos)  
3. Selecione o **clube**  
4. Veja as categorias **Padrão do sistema** (já prontas)  
5. Para criar uma nova: botão **Nova categoria** (canto superior direito)  
6. Digite o nome e clique em **Criar**  

As categorias que você criar aparecem em **Cadastradas por você** e passam a sair na hora de cadastrar produto (aba Produtos).

### Categorias que já vêm prontas

O sistema já traz várias categorias **padrão**. Você **não precisa** criá-las de novo. Elas aparecem na seção **Padrão (sistema)**, por exemplo:

- Material de treino, Uniforme de jogo, Saúde, Nutrição…  
- Alimentação, Uniforme ADM, Limpeza, Uso e consumo…  
- Atalhos: **Uniforme de treino**, **Jogo**, **Saúde**, **Outros**

Use a que fizer mais sentido para o produto. Se faltar alguma, você cria (abaixo).

### Como criar uma categoria nova (só do seu clube)

1. Aba **Categorias** → selecione o clube  
2. **Nova categoria** → nome → **Criar**  

**Dicas:**

- Categorias **padrão** não podem ser apagadas (só visualizar)  
- Categoria **sua** só apaga se **nenhum produto** estiver usando ela  
- Nome claro ajuda todo mundo na hora de buscar depois  

---

## Passo 3 — Cadastrar um produto

Produto = o item em si (ex.: *Detergente 5L*, *Camisa treino M*, *Bola oficial*).

### Quando cadastrar?

- Na **primeira vez** que o clube passa a controlar aquele item no sistema  
- Quando chega um material **novo** que nunca entrou no cadastro  

### Passo a passo

1. Aba **Produtos** → botão **Novo produto** (canto superior direito)  
2. Preencha o formulário:

| Campo | O que colocar | Obrigatório? |
|-------|----------------|--------------|
| **Clube/Empresa** | O clube dono do estoque | Sim |
| **Categoria** | Ex.: Produtos de limpeza | Sim |
| **Nome** | Nome do produto | Sim |
| **SKU / código** | Código interno, se tiver | Não |
| **Unidade** | `un`, `cx`, `kg`, `L`… | Não (padrão: un) |
| **Estoque mínimo** | Aviso quando chegar nesse número | Não (0 = sem aviso) |

3. **Entrada inicial no estoque** (opcional):
   - Se **já tem** o material na mão hoje: informe **Quantidade** e **Preço unitário (R$)**  
   - Se **só quer cadastrar** o nome e comprar depois: deixe quantidade **0**  
   - **Regra importante:** se colocar quantidade maior que zero, **tem que** colocar o preço  

4. Clique em **Cadastrar**

**Exemplo prático**

> Fernanda comprou 10 caixas de copo descartável a R$ 12,50 cada.  
> Categoria: *Uso e consumo* · Nome: *Copo descartável 200ml* · Quantidade: 10 · Preço: 12,50  

O produto entra no catálogo **e** no estoque com saldo 10.

### O que são os preços (depois de cadastrado)?

Na **edição** do produto você vê três valores (o sistema calcula sozinho):

| Nome na tela | Significado simples |
|--------------|---------------------|
| **Última compra** | Quanto pagou na última entrada |
| **Preço atual** | Preço da entrada mais recente |
| **Preço médio** | Média de tudo que entrou (útil para relatório) |

Você **não digita** esses preços na edição. Eles mudam quando você dá **entrada** no estoque (Passo 4).

---

## Passo 4 — Estoque (entrada e saída)

O **estoque** mostra **quantas unidades** você tem de cada produto.

**Como chegar:** menu **ADM → Estoque** (ou link dentro de Compras).

### Dar entrada (chegou material)

Use quando a mercadoria **chegou** — compra, doação ou ajuste.

1. Abra **Estoque** e selecione o **clube**  
2. Encontre o produto (busca ou rolando a lista)  
3. Clique em **Movimentar**  
4. Escolha **Entrada**  
5. Informe **Quantidade** e **Preço unitário (R$)** — os dois são obrigatórios na entrada  
6. Observação (opcional): ex. `NF 1234 — Fornecedor X`  
7. **Confirmar**  

O saldo sobe e os preços do produto atualizam.

### Dar saída (saiu material)

Use quando alguém **retirou** ou **consumiu** (ex.: copos usados no jogo).

1. **Movimentar** → **Saída**  
2. Informe só a **quantidade** (preço não precisa na saída)  
3. **Confirmar**  

### Alerta de estoque baixo

Se você definiu **estoque mínimo** (ex.: mínimo 5) e o saldo chegar nesse número ou abaixo, o card fica em **alerta** — hora de comprar de novo ou abrir uma requisição.

### Editar produto x movimentar

- **Editar** = mudar nome, categoria, estoque mínimo (não muda saldo direto)  
- **Movimentar** = única forma correta de aumentar ou diminuir quantidade  

---

## Passo 5 — Requisição de compra

**Requisição** = pedido formal: “precisamos comprar X”. Outras pessoas podem **aprovar** antes de gastar.

### Quem faz o quê (visão simples)

```text
1. Alguém PEDE        →  Nova requisição (itens + motivo)
2. Compras ANALISA    →  Cotações, fornecedor, valores
3. Diretoria/FINANCEIRO (se precisar)  →  Aprova ou recusa
4. Compra FEITA       →  Registra recebimento
5. Estoque ATUALIZADO →  Entrada com quantidade e preço
```

Nem todo pedido passa por todas as etapas — depende do valor e das regras do clube. O sistema mostra o **status** de cada requisição (rascunho, em análise, aprovada, etc.).

### Como abrir uma requisição (quem solicita)

1. Em **Compras**, role até a área de **Requisições**  
2. Clique em **Nova requisição**  
3. Escolha o **clube**  
4. Descreva os **itens** (o quê, quantidade, unidade)  
5. Explique o **motivo** (justificativa) — ajuda na aprovação  
6. Envie / salve conforme os botões na tela  

### O que o setor de Compras faz depois

1. Abre a requisição na lista  
2. Compara **fornecedores** e **preços** (cotações)  
3. Encaminha para **aprovação** se necessário  
4. Após comprar, registra o **recebimento**  
5. Vai em **Estoque** e dá **entrada** com o preço pago (Passo 4)  

Assim o pedido fica documentado do início ao fim.

---

## Passo 6 — Fornecedores (opcional mas recomendado)

Antes de cotar, cadastre quem vende:

1. Menu **ADM → Fornecedores**  
2. **Novo fornecedor** — nome, contato, etc.  
3. Na requisição, você escolhe esse fornecedor na cotação  

---

## Erros comuns (e como evitar)

| Problema | Solução |
|----------|---------|
| “Preço obrigatório” ao cadastrar | Se colocou quantidade inicial, preencha o preço — ou deixe quantidade 0 |
| Não acho minha categoria | Veja **Categorias de produtos** ou crie uma nova |
| Saldo errado | Não edite saldo no cadastro — use **Movimentar** no Estoque |
| Não vejo o menu Compras | Peça liberação de acesso ao administrador |
| Apaguei categoria e deu erro | Tem produto usando ela — mude a categoria dos produtos antes |

---

## Rotina sugerida para o dia a day (Compras)

**De manhã**

- [ ] Abrir **Estoque** e ver alertas (abaixo do mínimo)  
- [ ] Ver requisições **pendentes** em Compras  

**Quando chega mercadoria**

- [ ] Conferir nota/conferência física  
- [ ] **Estoque → Movimentar → Entrada** com quantidade e preço  

**Produto novo no clube**

- [ ] Conferir **categoria** (criar se faltar)  
- [ ] **Novo produto** + entrada inicial se já tiver em mãos  

**Quando alguém pede material**

- [ ] Abrir **requisição** (ou orientar o solicitante a abrir)  
- [ ] Cotar, aprovar, comprar, receber, lançar estoque  

---

## Glossário rápido

| Palavra | Significado |
|---------|-------------|
| **Clube / Empresa** | Unidade no sistema (cada time ou empresa do grupo) |
| **Categoria** | Tipo do produto (limpeza, uniforme, alimentação…) |
| **SKU** | Código interno opcional |
| **Unidade** | Como conta: unidade, caixa, quilo… |
| **Estoque mínimo** | Quantidade mínima antes do alerta |
| **Entrada** | Aumenta estoque (+) |
| **Saída** | Diminui estoque (−) |
| **Requisição** | Pedido de compra no sistema |
| **Cotação** | Preço oferecido por um fornecedor |

---

## Precisa de ajuda?

- Acesso ou senha: administrador do sistema / TI  
- Dúvida de **qual categoria** usar: combine com seu supervisor ou use *Outros* temporariamente e ajuste depois  
- Erro na tela (mensagem vermelha): anote o texto exato e envie para suporte  

---

*Guia atualizado em julho/2026 — módulo Compras com categorias padrão + cadastro personalizado por clube, produtos com preço e estoque integrado.*
