# Football-Data.org — Setup para Próximos Jogos (AUTO)

API gratuita e estável para buscar jogos dos clubes. Alternativa ao SofaScore (que pode bloquear com 403).

## 1. Cadastro

1. Acesse https://www.football-data.org/client/register
2. Aceite os termos e gere sua API key
3. Copie a chave (ex.: `abc123def456...`)

## 2. Configurar no servidor

No `.env` da API (ou variáveis de ambiente):

```
FOOTBALL_DATA_API_KEY=sua_chave_aqui
```

## 3. Encontrar o Team ID

1. Acesse https://www.football-data.org/coverage
2. Verifique as competições disponíveis no plano gratuito (inclui Campeonato Brasileiro Série A)
3. Para encontrar o ID do time, use a API ou consulte a documentação

Exemplo de times brasileiros (IDs podem variar):
- Bahia: consulte GET /v4/competitions/BSA/teams ou busque na cobertura

## 4. Configurar no BCG

1. **Empresas** → [clube] → Editar
2. Preencha **Football-Data.org Team ID**
3. Salve

4. **Páginas** → [clube] → Editar
5. No módulo **Próximos jogos**, escolha **Fonte de dados** = **AUTO (Football-Data.org)**
6. Salve a página

## 5. Limites

- Plano gratuito: 10 requisições/minuto
- Cache no backend: 10 minutos
- Inclui logos dos times e competições quando disponíveis
