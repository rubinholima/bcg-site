# Fisioterapia — Fluxo de trabalho completo (BCG)

Documento para quem **não acompanhou o desenvolvimento**. Explica o que foi feito, para que serve e como usar no dia a dia.

---

## 1. Objetivo

Substituir o controle genérico / planilha da fisioterapia por um fluxo **por atleta**, com:

- identificação (clube → categoria → atleta);
- marcação no **mapa do corpo**;
- sintomas, diagnóstico, tratamento e duração;
- possibilidade de **cadastrar novos** diagnósticos e tratamentos;
- anexos (laudos / exames);
- evolução até a **alta**;
- atleta marcado como **lesionado** enquanto houver tratamento ativo.

Base: reunião do departamento de fisioterapia (resumo em PDF) + implementação no sistema BCG.

---

## 2. Onde fica no sistema

| O quê | Caminho |
|--------|---------|
| Hub de Fisioterapia | **Dashboard → Saúde → Fisioterapia** |
| URL do hub | `/dashboard/saude/fisioterapia` |
| Novo atendimento | `/dashboard/saude/fisioterapia/novo` |
| Detalhe / evolução / alta | `/dashboard/saude/fisioterapia/[id]` |
| Aba na ficha do atleta | **Cadastros → Jogadores → [atleta] → aba Fisioterapia** |

**Quem acessa:** quem tem o módulo **Saúde** (`saude`), inclusive perfil de fisioterapia.

---

## 3. Visão geral do fluxo

```
Atleta chega na fisio
        │
        ▼
Seleciona Clube → Categoria → Atleta
        │
        ▼
Clica a região no mapa do corpo (frente / costas)
        │
        ▼
Preenche: sintomas, dor (0–10), diagnóstico, tratamento,
          duração estimada, anexos (opcional)
        │
        ▼
Salva atendimento  ──►  Status do atleta = "Lesionado"
        │                 (fica assim até a alta de TODOS
        │                  os tratamentos ativos)
        ▼
Evoluções (anotações ao longo do tratamento)
        │
        ▼
"Dar alta"  ──►  Se não houver outro tratamento ativo,
                  status volta para disponível
```

---

## 4. Passo a passo — novo atendimento

1. Abrir **Saúde → Fisioterapia**.
2. Clicar em **Novo atendimento**.
3. Escolher **Clube**.
4. (Opcional) filtrar **Categoria**.
5. Escolher o **Atleta**.
6. No **mapa corporal**:
   - alternar **Frente** / **Costas**;
   - clicar na região (ombro, joelho, tornozelo, etc.).
   - o sistema preenche região e lado (E / D) quando fizer sentido.
7. Preencher:
   - **Sintomas**
   - **Dor** de 0 a 10
   - **Fisioterapeuta** (nome)
   - **Diagnóstico** (lista da região; ou criar um novo)
   - **Tratamento** (lista; ou criar um novo / equipamento)
   - **Notas do tratamento**
   - **Duração estimada (dias)** e/ou **data prevista de alta**
   - **Anexos** — upload de PDF/imagem para a **pasta do atleta no S3** (não só URL)
8. Clicar em **Salvar atendimento**.

### Cadastro dinâmico (pedido da reunião)

- Se o diagnóstico não existir na lista da região: digite o nome e clique no **+**.
- Se o tratamento / equipamento for novo: digite e clique no **+**.
- Assim o catálogo cresce sem ficar preso só ao que veio do seed.

---

## 5. Depois de salvar

### Lista do hub

- Filtros por clube e status (**Em tratamento**, **Alta**, **Cancelados**, **Todos**).
- Mapa à esquerda com pins dos casos **ativos**.
- Clique no card abre o detalhe.

### Detalhe do atendimento

- Resumo (região, diagnóstico, tratamento, sintomas, dor, previsão, anexos).
- Link para a **ficha do atleta**.
- **Evolução:** novas anotações + dor opcional.
- **Dar alta:** encerra aquele tratamento.

### Status do atleta (automático)

| Situação | O que acontece |
|----------|----------------|
| Abriu atendimento ativo | Status → **lesionado** + detalhes começando com `Fisio: …` |
| Vários tratamentos ativos | Continua lesionado; detalhes listam todos |
| Deu alta em todos os ativos | Se o detalhe era da fisio, volta para **disponível** |

Ou seja: fica marcado **até o final do tratamento** (e se houver mais de um, até o final de todos os ativos).

---

## 6. Aba Fisioterapia na ficha do atleta

Em **Cadastros → Jogadores → editar atleta**:

1. Aba **Fisioterapia** (só aparece com acesso ao módulo Saúde).
2. Mostra:
   - quantos tratamentos ativos;
   - mapa corporal com lesões ativas;
   - histórico completo;
   - botão **Novo atendimento** (já com clube/atleta).

---

## 7. Mapa do corpo (body map)

- Silhueta **SVG** frente e costas (estilo clínico esportivo).
- Clique na região → atendimento já filtra diagnósticos daquela região.
- Pins vermelhos / destaque = lesões **ativas**.
- Regiões cobertas (catálogo):
  - Cabeça, coluna (cervical / torácica / lombar)
  - Ombro, braço, cotovelo, antebraço, punho, mão
  - Pelve, quadril, coxa, joelho
  - Perna, tornozelo, pé (incluídos para o futebol)

Diagnósticos iniciais vêm da lista da reunião (fraturas, LCA, entorses, etc.) e são carregados automaticamente na API.

---

## 8. O que existe no banco (resumo técnico)

Não precisa saber programação para usar; serve para TI / suporte.

| Tabela | Função |
|--------|--------|
| `PhysioBodyRegion` | Regiões do corpo (ombro, joelho…) |
| `PhysioDiagnosis` | Diagnósticos por região (seed + criados pelo fisio) |
| `PhysioTreatment` | Tratamentos / procedimentos / equipamentos |
| `PhysioSession` | Cada atendimento (ciclo até alta) |

**Status do atendimento:** `active` | `completed` | `cancelled`

API (protegida pelo módulo `saude`):

- `GET/POST /fisioterapia/regions`, `diagnoses`, `treatments`
- `GET/POST/PATCH /fisioterapia/sessions`
- `POST /fisioterapia/sessions/:id/evolution`
- `POST /fisioterapia/sessions/:id/complete`

---

## 9. O que NÃO está neste módulo (ainda)

- Upload de exames: **sim** — PDF/imagem vão para `media/jogadores-documentos/{playerId}/` no S3 e entram nos documentos médicos do atleta.
- Integração automática com Documentação Boston / planilhas antigas.
- RTP (return to play) com protocolo formal por fase.
- Agenda própria da fisio (usa a ficha + hub).

Isso pode ser fase seguinte, se o departamento pedir.

---

## 10. Checklist rápido para o fisio

- [ ] Abrir Saúde → Fisioterapia  
- [ ] Novo atendimento → clube / categoria / atleta  
- [ ] Marcar região no mapa  
- [ ] Diagnóstico + tratamento (criar novos se precisar)  
- [ ] Salvar → conferir se o atleta ficou **lesionado**  
- [ ] Registrar evoluções no detalhe  
- [ ] Dar alta quando terminar  
- [ ] Conferir aba Fisioterapia na ficha do atleta  

---

## 11. Referência de implementação

- Commit principal: `5b8c5ac` — *feat(saude): módulo completo de fisioterapia com body map e aba no atleta*
- Migration: `20260728190000_fisioterapia_module`
- Código API: `apps/api/src/fisioterapia/`
- Código Web: `apps/web/src/components/dashboard/fisioterapia/` e `apps/web/src/app/dashboard/saude/fisioterapia/`

---

*Documento gerado para o time operacional e para quem entra no fluxo sem contexto técnico.*
