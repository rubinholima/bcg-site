# Módulos de página (Home e Páginas por Tenant)

> Regras para os blocos/módulos editáveis na Home e nas páginas de portfolio (tenant).
> **Leia ao implementar ou alterar qualquer módulo.**

---

## Imagens e mídia (S3)

- **Página Mídia** (Dashboard → Mídia): centraliza todas as imagens usadas nos sites. Conectada ao S3 (pasta `media/`). Permite ver miniatura, tamanho em bytes e URL, enviar novas imagens e filtrar por **tamanho de placeholder**.
- **Placeholders com tamanho**: todo uso de imagem que não seja logo (fundos, hero, cards, CTA, etc.) deve ter uma **definição de tamanho** (ex.: Hero 1920×1080, Card 800×600). O tamanho é usado para filtrar a lista no dropdown e para orientar a criação de artes.
- **Dropdown da mídia**: nos editores (Conteúdo da Home, Editar página do tenant), onde for preciso escolher imagem, a opção principal é um **dropdown** com as imagens já existentes na pasta de mídia (filtradas pelo tamanho do placeholder). Opcionalmente mantém-se campo para colar URL manualmente.
- **Logos**: não usam placeholder de tamanho; continuam em `logos/` (group e tenants) e são gerenciados nos fluxos de Grupo Master e Empresas.

---

## Padrão de todos os módulos

Todo módulo deve expor, quando fizer sentido, os seguintes campos de **aparência e conteúdo**:

| Campo                                                 | Descrição                                                  | Uso                                     |
| ----------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| **Cor de fundo** (`backgroundColor`)                  | Cor hex (ex: `#18181b`). Vazio = padrão da seção.          | Todos os módulos que têm área de fundo. |
| **Opacidade do overlay** (`backgroundOverlayOpacity`) | Número 0–1 sobre imagem de fundo (ex: 0,8 = escurece 80%). | Módulos com imagem de fundo.            |
| **Títulos**                                           | `titlePt` e `titleEn` para override do título da seção.    | Módulos que exibem título.              |

Ou seja: **cor de fundo, opacidades e títulos são padrão para todos os módulos.**
No editor, esses campos aparecem na área comum de cada bloco; na renderização, cada módulo usa esses valores quando aplicável.

---

## Hero

- **Múltiplas fotos**: o Hero deve permitir **mais de uma imagem**, exibidas em formato de **carrossel**.
- **Tamanho da tela no enunciado**: na interface de edição do Hero, deve constar o **tamanho recomendado da arte** (ex: **1920×1080** ou **1920×800**) para que quem for criar a arte saiba as dimensões do placeholder.
- **Efeitos do carrossel**: oferecer **2 ou 3 tipos de efeito** (ex: **fade**, **slide**, **zoom**), selecionáveis na configuração do módulo.
- **Temporizador**: opção de **tempo em cada foto** (ex: **5, 10 ou 15 segundos**) para passar automaticamente para a próxima.
- **Título por foto**: cada slide pode ter **título em PT e EN**, exibido sobre a imagem no carrossel.
- **Navegação**: na programação (front), botões **anterior** e **próximo** para passar para trás e para frente manualmente.
- **Objetivo**: o Hero deve ser **atraente e criativo** (layout, animações e transições podem ser explorados).

Campos específicos do Hero (além do padrão):

- `heroSlides`: array de `{ url, titlePt?, titleEn? }` (URL da imagem e títulos por idioma).
- `heroCarouselEffect`: `"fade"` | `"slide"` | `"zoom"`.
- `heroCarouselIntervalSeconds`: `5` | `10` | `15` (tempo em cada foto).
- Dimensão recomendada: fixa na UI como texto (ex: “Tamanho recomendado: 1920×1080 px”). O botão **Adicionar imagem** fica logo abaixo do tamanho recomendado.

Se não houver slides configurados, usar fallback: uma única `backgroundImage` ou a imagem padrão do hero.

---

## Cabeçalho (Header)

- Módulo tipo **header** para definir o **cabeçalho** da página.
- Opções típicas: logo (URL), links de navegação (texto + URL ou âncora), posição (fixo/estático), estilo (com/sem fundo sólido).
- Os campos padrão (cor de fundo, opacidade, títulos) aplicam-se quando fizer sentido (ex: cor de fundo da barra).

---

## Rodapé (Footer)

- Módulo tipo **footer** para definir o **rodapé** da página.
- Opções típicas: texto do rodapé, links (ex: Home, Contato, política de privacidade), copyright, redes sociais.
- Os campos padrão aplicam-se quando fizer sentido (ex: cor de fundo do rodapé).

---

## Ordem e uso na página

- Na Home e nas páginas por tenant, a **ordem dos blocos** é definida pelo usuário (drag ou setas).
- **Header**: normalmente o primeiro bloco (ou o primeiro “layout”) define o cabeçalho; pode haver apenas um bloco tipo header por página.
- **Footer**: normalmente o último bloco (ou o último “layout”) define o rodapé; pode haver apenas um bloco tipo footer por página.
- Hero, cabeçalho e rodapé são **opcionais**; se não existirem, a página pode usar cabeçalho/rodapé padrão do tema.

---

## Referência rápida

| Item      | Regra                                                                                                       |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Aparência | Cor de fundo, opacidade overlay e títulos (PT/EN) em todos os módulos.                                      |
| Hero      | Múltiplas fotos em carrossel; 2–3 efeitos (fade/slide/zoom); enunciado com tamanho da tela (ex: 1920×1080). |
| Header    | Módulo com opções de cabeçalho (logo, links, etc.).                                                         |
| Footer    | Módulo com opções de rodapé (texto, links, etc.).                                                           |
