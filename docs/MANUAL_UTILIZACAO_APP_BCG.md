# Manual de utilização do app — BCG Platform

> **Documento 2 — Como usar o produto**  
> Guia de **operação** no dia a dia: acesso, menu, fluxos por área, permissões, rotinas e solução de problemas.  
> **Metodologia de implantação** (kickoff, go-live, handover, curso para implementadores): [**Manual de implantação**](./MANUAL_CURSO_ONLINE_APP.md).

---

## 1. Finalidade deste manual

Este documento é o guia oficial de uso do app BCG no dia a dia.  
Objetivo: permitir que qualquer usuário autorizado navegue, cadastre, edite e acompanhe informações com segurança.

---

## 2. Acesso ao sistema

## 2.1 Endereços padrão

- Frontend (web): `http://localhost:3000`
- API (backend): `http://localhost:3001`

## 2.2 Login

1. Acesse a tela de login.
2. Informe usuário e senha.
3. Clique em entrar.
4. Aguarde o redirecionamento para o dashboard.

Se não entrar:
- Verifique usuário/senha.
- Verifique se API e web estão ativas.
- Verifique se seu usuário tem permissão de dashboard.

---

## 3. Estrutura do dashboard

O menu lateral organiza o sistema por áreas:

- Dashboard
- Grupo Master
- Diretoria
- Empresas
- Adm
- Depto Futebol
- Sócio Torcedor
- Marketing
- Relatórios
- Ferramentas
- Configurações

Cada área exibe módulos conforme a permissão do usuário.

---

## 4. Regras gerais de utilização

- Sempre confirmar em qual módulo está antes de editar.
- Pesquisar antes de cadastrar para evitar duplicidade.
- Salvar e validar imediatamente o resultado.
- Evitar apagar registros sem validação prévia.
- Em caso de dúvida, solicitar revisão de um responsável.

---

## 5. Utilização por área

## 5.1 Dashboard (visão geral)

Uso principal:
- Visualização rápida de status e indicadores.
- Acesso rápido às áreas operacionais.

Boas práticas:
- Usar como ponto de entrada diário.
- Priorizar alertas e pendências primeiro.

## 5.2 Grupo Master

Uso principal:
- Visão institucional consolidada.
- Consulta de informações globais do grupo.

## 5.3 Diretoria

Módulo:
- `Dashboard gerencial`

Uso principal:
- Acompanhar indicadores estratégicos.
- Comparar evolução por período.
- Apoiar decisão executiva.

Passo rápido:
1. Acessar `Diretoria -> Dashboard gerencial`.
2. Definir período/filtro.
3. Ler KPIs e gráficos.
4. Registrar ações prioritárias.

## 5.4 Empresas

Módulos:
- `Listagem`
- `Tipos de Negócios`

Uso principal:
- Cadastrar e manter empresas.
- Classificar empresas por tipo.

Passo rápido:
1. Abrir `Empresas -> Listagem`.
2. Pesquisar para evitar duplicidade.
3. Criar ou editar empresa.
4. Salvar e validar.
5. Revisar tipologia em `Tipos de Negócios`.

## 5.5 Adm

Módulos:
- `Financeiro`
- `Compras`
- `Estoque`
- `RH`
- `Patrimônio`

Uso principal:
- Operações administrativas e de apoio.

Boas práticas:
- Manter dados atualizados por rotina diária/semanal.
- Validar informações críticas antes de fechamento.

## 5.6 Depto Futebol

Módulos principais:
- Atletas
- Categorias
- Campeonatos
- Estádios
- Times
- Depto Médico
- Depto Psicologia
- Depto Jurídico
- Comissão técnica
- Logística
- Fisiologia
- Nutrição
- Análise (Avaliações e Desempenho)

Uso principal:
- Gestão esportiva ponta a ponta.

Fluxo recomendado:
1. Cadastrar base (categorias, campeonatos, estádios, times).
2. Manter atletas atualizados.
3. Operar áreas técnicas (médico, psicologia, comissão, fisiologia).
4. Acompanhar desempenho em análise.

## 5.7 Sócio Torcedor

Módulos:
- Visão geral
- Planos
- Sócios

Uso principal:
- Gestão de relacionamento com torcedor e planos ativos.

## 5.8 Marketing

Módulo:
- Planner

Uso principal:
- Planejar e organizar ações de conteúdo.

## 5.9 Relatórios

Módulo:
- Relatórios

Uso principal:
- Consulta consolidada para acompanhamento e gestão.

## 5.10 Ferramentas

Módulos:
- Emails
- Senhas
- Páginas
- Eventos
- Notícias
- Mídia

Uso principal:
- Operação de comunicação e conteúdo.

Fluxo recomendado para conteúdo:
1. Preparar texto/título.
2. Validar mídia.
3. Publicar.
4. Conferir visualização final.

## 5.11 Configurações

Módulos:
- Geral
- Usuários

Uso principal:
- Administração da plataforma e controle de acesso.

Regra crítica:
- Permissão define o que aparece no menu do usuário.

---

## 6. Gestão de usuários e permissões

Passo a passo:
1. Abrir `Configurações -> Usuários`.
2. Criar/editar usuário.
3. Associar módulos permitidos.
4. Salvar.
5. Pedir novo login do usuário para validar acesso.

Sinais de problema de permissão:
- Módulo não aparece no menu.
- Tela abre com bloqueio de acesso.

---

## 7. Rotina operacional recomendada (dia a dia)

Início do dia:
1. Acessar dashboard.
2. Ver pendências e prioridades.
3. Executar tarefas críticas primeiro.

Durante o dia:
1. Trabalhar por módulo.
2. Salvar em ciclos curtos.
3. Validar após cada alteração.

Fim do dia:
1. Revisar o que foi atualizado.
2. Confirmar registros críticos.
3. Registrar pendências do próximo dia.

---

## 8. Erros comuns e prevenção

- Cadastro duplicado -> pesquisar antes de criar.
- Edição no registro errado -> confirmar nome/ID antes de salvar.
- Falha de acesso -> revisar permissões do usuário.
- Conteúdo sem imagem correta -> validar mídia antes de publicar.
- Dados incompletos -> usar checklist do módulo.

---

## 9. Solução de problemas rápida

## 9.1 Não consigo acessar

- Conferir URL correta.
- Verificar API/Web ativos.
- Verificar credenciais.

## 9.2 Não vejo um módulo

- Provável falta de permissão.
- Solicitar ajuste em `Configurações -> Usuários`.

## 9.3 Salvei e não apareceu

- Atualizar tela.
- Revisar filtro/período.
- Confirmar que salvou no registro correto.

## 9.4 Sistema lento

- Fechar abas sem uso.
- Recarregar aplicação.
- Confirmar estabilidade da rede/local.

---

## 10. Checklist de uso seguro (rápido)

- Estou no módulo correto.
- Validei se o registro já existe.
- Conferi campos obrigatórios.
- Salvei e confirmei resultado.
- Não removi dados sem validação.

---

## 11. Glossário rápido

- **Módulo:** área funcional do sistema.
- **Key user:** usuário de referência da empresa (ponto de contato com suporte ou implantação).
- **Tenant / empresa:** no sistema, a unidade (clube ou empresa) cujos dados você está vendo ou editando, conforme seu acesso.

---

## 12. Encerramento

Se este manual for seguido, o uso do app fica padronizado, seguro e previsível, reduzindo retrabalho no dia a dia.

Para **como implantar** o app numa nova empresa (cronograma, go-live, handover), use o [manual de implantação](./MANUAL_CURSO_ONLINE_APP.md).

