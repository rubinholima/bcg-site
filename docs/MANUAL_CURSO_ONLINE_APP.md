# Manual de implantação (curso online) — BCG Platform

> **Documento 1 — Como implementar**  
> Conteúdo para **implementadores**: metodologia, roteiro de aula, trilhas, checklists de rollout, versão expressa.  
> **Não** cobre o uso cotidiano tela a tela do produto: para isso use o [**Manual de utilização**](./MANUAL_UTILIZACAO_APP_BCG.md).

---

## 1) Objetivo do curso

Este curso ensina a **implantação prática da plataforma BCG nas empresas**, com foco em:

- Kickoff de implantação (escopo, responsáveis e cronograma)
- Parametrização inicial por empresa (cadastros base e permissões)
- Operação assistida no início do uso
- Plano de adoção para equipe local
- Boas práticas para evitar erros e retrabalho

Resultado esperado: ao final, o implementador consegue conduzir uma implantação ponta a ponta com autonomia.

---

## 2) Público-alvo

- Implementadores e consultores de implantação
- Coordenadores de projeto (rollout por empresa)
- Key users que apoiam entrada em produção
- Responsáveis por treinamento local e suporte inicial

---

## 3) Formato sugerido da aula (dinâmico e fácil de apresentar)

Tempo total recomendado: **2h30 a 3h**

- Bloco 1 (20 min): visão de implantação e critérios de sucesso
- Bloco 2 (35 min): setup inicial e permissões por perfil
- Bloco 3 (55 min): trilha de implantação por fases (hands-on)
- Bloco 4 (25 min): go-live assistido e plano de estabilização
- Bloco 5 (15 min): dúvidas, checklist final e handover

### Dica de condução

Use o ciclo: **Explica (2 min) -> Demonstra (4 min) -> Participante repete (5 min)**.

---

## 4) Pré-requisitos técnicos

Antes da aula, validar:

- API em `http://localhost:3001`
- Web em `http://localhost:3000`
- Usuário de treino com permissões adequadas
- Dados mínimos de teste cadastrados (empresa, jogador, evento, notícia)
- Conexão estável e compartilhamento de tela com fonte legível

---

## 5) Roteiro de abertura (script pronto)

Fala sugerida (1 a 2 minutos):

> "Hoje o foco é implantação real do app nas empresas.  
> Vamos seguir um método simples: preparar ambiente, parametrizar, treinar usuário-chave e fazer go-live assistido.  
> Ao final, você sai com um roteiro pronto para replicar em qualquer nova empresa."

---

## 6) Mapa do sistema (visão do menu)

### Núcleo principal

- Dashboard (visão geral)
- Grupo Master
- Diretoria (dashboard gerencial)
- Empresas (listagem e tipos de negócios)

### Operação administrativa

- Adm: Financeiro, Compras, Estoque, RH, Patrimônio

### Departamento de futebol

- Atletas
- Categorias
- Campeonatos
- Estádios
- Times adversários
- Depto Médico (histórico, equipe)
- Depto Psicologia (consultas, psicólogos)
- Depto Jurídico
- Comissão técnica
- Logística
- Fisiologia
- Nutrição
- Análise (avaliações e desempenho)

### Relacionamento e marketing

- Sócio Torcedor (visão geral, planos, sócios)
- Marketing (planner)
- Relatórios

### Ferramentas

- Emails
- Senhas
- Páginas
- Eventos
- Notícias
- Mídia

### Configuração

- Configurações gerais
- Usuários

---

## 7) Regras de ouro para os alunos

- Sempre confirmar o módulo correto antes de editar
- Fazer alterações pequenas e validar imediatamente
- Evitar cadastro duplicado (pesquisar antes)
- Respeitar permissões por perfil
- Em caso de dúvida, não apagar: revisar e pedir validação

---

## 8) Aula prática por trilhas (pedagógico)

## 8.1 Trilha 1 - Kickoff e diagnóstico da empresa (20 min)

Objetivo: mapear escopo de implantação e riscos antes de configurar.

Passo a passo:

1. Definir responsável da empresa e equipe de suporte local
2. Mapear módulos que entrarão na Fase 1 da implantação
3. Identificar dados mínimos necessários (empresa, usuários, cadastros)
4. Definir prazo de homologação e data de go-live
5. Registrar plano de implantação da empresa

Atividade:

- "Monte um mini cronograma de implantação para uma empresa em 7 dias."

## 8.2 Trilha 2 - Parametrização inicial (25 min)

Objetivo: deixar a empresa pronta para começar a operar.

Passo a passo:

1. Abrir `Empresas -> Listagem` e cadastrar/validar empresa
2. Revisar `Cadastros -> Tipos de Negócios`
3. Criar perfis de acesso em `Configurações -> Usuários`
4. Habilitar módulos conforme escopo do projeto
5. Executar checklist de validação técnica e funcional

Atividade:

- "Parametrize uma empresa do zero em ambiente de treino."

## 8.3 Trilha 3 - Operação assistida por área (35 min)

Objetivo: ensinar o key user local a operar os módulos prioritários.

Passo a passo:

1. Treinar fluxo base em `Depto Futebol -> Atletas`
2. Demonstrar operação em `Comissão`, `Fisiologia`, `Análise` e `Logística`
3. Treinar área administrativa (`Adm`) conforme escopo
4. Treinar publicação em `Ferramentas` (quando necessário)
5. Validar execução do key user sem ajuda do instrutor

Atividade:

- "O key user executa 3 tarefas reais enquanto o implementador observa."

## 8.4 Trilha 4 - Go-live assistido (20 min)

Objetivo: virar chave para produção com segurança.

Passo a passo:

1. Confirmar checklist de prontidão
2. Validar acessos de todos os perfis essenciais
3. Executar roteiro de 5 tarefas críticas em produção
4. Registrar evidências de sucesso
5. Definir canal e SLA de suporte inicial

Atividade:

- "Simule um go-live com checklist e aceite formal."

## 8.5 Trilha 5 - Estabilização e handover (20 min)

Objetivo: garantir continuidade após implantação.

Passo a passo:

1. Revisar incidentes dos primeiros dias
2. Corrigir ajustes finos de processo/permissão
3. Entregar guia operacional para empresa
4. Formalizar responsáveis internos (dono do processo)
5. Encerrar implantação com plano de evolução

Atividade:

- "Criar plano de 30 dias pós-go-live para a empresa."

---

## 9) Script de apresentação por bloco (fala pronta)

## Bloco A - Navegação

> "Tudo começa pelo menu lateral.  
> Primeiro escolhemos a área, depois o módulo, e só então editamos."

## Bloco B - Operação

> "Sempre que salvar, validamos na tela seguinte para garantir que a mudança foi aplicada.  
> Isso evita retrabalho e inconsistência."

## Bloco C - Governança

> "Permissão não é bloqueio, é segurança operacional.  
> Cada perfil enxerga o que precisa para trabalhar melhor."

## Bloco D - Fechamento

> "Se você repetir esse fluxo diariamente, terá previsibilidade, qualidade e menos erro manual."

---

## 10) Erros comuns e como evitar

- Editar no módulo errado -> confirmar título da tela antes de salvar
- Duplicar cadastro -> pesquisar por nome/código antes de criar
- Falta de permissão -> solicitar ajuste ao responsável por usuários/módulos
- Conteúdo sem mídia correta -> validar upload e pré-visualização
- Dado incompleto no atleta -> revisar abas obrigatórias antes de concluir

---

## 11) Checklist do instrutor (antes da turma)

- Ambiente aberto e logado
- Módulos essenciais funcionando
- Usuário de demonstração pronto
- Casos de teste separados (bom e com erro)
- Plano B para internet instável (ex.: gravação curta de apoio)

---

## 12) Checklist do participante (após a aula)

- Sei localizar qualquer módulo no menu
- Sei criar/editar sem duplicar dados
- Sei validar se a alteração foi aplicada
- Sei identificar quando é tema de permissão
- Sei qual fluxo usar no meu setor

---

## 13) Plano de aula rápido (resumo de bolso)

- 00:00-00:10 -> abertura + método de implantação
- 00:10-00:30 -> kickoff e diagnóstico da empresa
- 00:30-01:25 -> parametrização + operação assistida
- 01:25-01:50 -> go-live assistido e gestão de riscos
- 01:50-02:10 -> estabilização e handover
- 02:10-02:30 -> dúvidas e plano de execução

---

## 14) Banco de atividades (para deixar a aula dinâmica)

Atividade 1 - Missão relâmpago (5 min):
- "Encontre e abra o módulo correto para atualizar um atleta."

Atividade 2 - Correção guiada (8 min):
- "Identifique um erro comum em cadastro e corrija ao vivo."

Atividade 3 - Decisão gerencial (10 min):
- "Com base no dashboard, escolha uma ação prioritária e justifique."

Atividade 4 - Publicação rápida (8 min):
- "Criar um conteúdo simples com título e mídia."

---

## 15) FAQ da turma

**1) Não vejo o módulo no menu.**  
Provável causa: permissão de usuário. Validar em Configurações/Usuários e módulos habilitados.

**2) Salvei, mas não aparece.**  
Validar se salvou no registro correto; atualizar tela e confirmar filtro/período.

**3) Qual sequência correta de implantação?**  
Kickoff -> parametrização -> operação assistida -> go-live -> estabilização.

**4) Quando considerar implantação concluída?**  
Quando key users executam o fluxo crítico sem apoio e o handover foi aceito.

---

## 16) Encerramento da aula (script final)

> "Hoje vocês aprenderam o fluxo completo para operar o app com segurança.  
> O ganho principal é autonomia com padrão de qualidade.  
> Na prática, a regra é: escolher módulo certo, executar, validar e registrar."

---

## 17) Personalização rápida (edite estes pontos)

- Nome oficial do curso: `[AJUSTAR]`
- Carga horária final: `[AJUSTAR]`
- Público desta turma: `Implementadores`
- Módulos prioritários da turma: `[AJUSTAR CONFORME EMPRESA]`
- Instrutor(a): `[AJUSTAR]`
- Data e link da aula online: `[AJUSTAR]`
- Quantidade de empresas no rollout: `[AJUSTAR]`
- Critérios de aceite do go-live: `[AJUSTAR]`

---

## 18) Materiais de apoio sugeridos

- Checklist operacional por setor (1 página)
- Guia de permissões (quem libera o quê)
- Lista de contatos de suporte
- Mini gravações de tarefas críticas (2-4 min cada)

---

## 19) Versão expressa do curso (máximo 70 minutos)

Objetivo da versão expressa: capacitar implementadores para executar uma implantação básica com segurança, sem aprofundamentos longos.

### Agenda de 70 minutos (minuto a minuto)

- 00:00-00:05 -> Abertura e meta da sessão
- 00:05-00:15 -> Método de implantação (5 fases)
- 00:15-00:30 -> Parametrização inicial ao vivo
- 00:30-00:45 -> Operação assistida (fluxos críticos)
- 00:45-00:58 -> Simulação de go-live + checklist de aceite
- 00:58-01:05 -> Estabilização e handover
- 01:05-01:10 -> Dúvidas e próximos passos

### Conteúdo obrigatório (não cortar)

1. Sequência oficial: kickoff -> parametrização -> operação assistida -> go-live -> handover
2. Configuração de usuário/permissão e validação de acesso
3. Execução de pelo menos 3 tarefas críticas por um key user
4. Checklist de prontidão para go-live
5. Definição de responsável local e canal de suporte

### Conteúdo opcional (cortar se faltar tempo)

- Navegação detalhada de todos os módulos
- Exemplos avançados de análise
- Casos extras de conteúdo (eventos/notícias/mídia)
- FAQ estendido

### Script curto do instrutor (pronto para usar)

> "Nesta versão expressa, vamos focar no essencial para implantar com segurança em uma empresa.  
> Em 70 minutos, vocês vão sair com o método completo e um checklist prático de execução.  
> Nosso foco é: configurar certo, validar rápido e entrar em operação com controle."

### Dinâmica recomendada (rápida)

- 40% explicação guiada
- 60% execução prática do participante

Regra: se a turma travar em detalhes, voltar ao fluxo principal e manter ritmo de implantação.

### Checklist final da versão expressa

- Empresa parametrizada em ambiente de treino
- Perfis principais com acesso validado
- 3 fluxos críticos executados com sucesso
- Critério de aceite de go-live registrado
- Responsável de suporte pós-implantação definido

Fim do manual.
