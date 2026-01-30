# Credenciais AWS — API (Cognito Admin)

A API em `apps/api` usa o AWS SDK para chamadas **admin** ao Cognito (listar usuários, criar usuário, alterar role). Essas chamadas exigem **credenciais AWS** com permissão no User Pool.

## Opções de credenciais

- **Não setar** `AWS_ACCESS_KEY_ID` nem `AWS_SECRET_ACCESS_KEY`: o SDK usa a **default credential provider chain** (perfil AWS CLI, `~/.aws/credentials`, SSO, ou em produção **IAM Role**).
- **Setar** `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY` no `.env`: usa essas chaves (útil em dev; **nunca commitar**).

---

## DEV local (Windows)

### Opção 1 (recomendada): AWS CLI profile

1. Instalar [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).
2. Configurar um perfil:
   ```powershell
   aws configure --profile bcg-dev
   ```
   Preencher: **AWS Access Key ID**, **AWS Secret Access Key**, **Default region** (ex.: `us-east-1`).
3. No `apps/api/.env`:
   ```env
   AWS_REGION=us-east-1
   AWS_PROFILE=bcg-dev
   ```
   Deixar **sem** `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`.

### Opção 2: Access keys no .env (somente dev)

1. Criar Access Key no IAM (Console AWS → IAM → Usuários → Sua usuário → Aba "Credenciais de segurança" → Criar chave de acesso).
2. No `apps/api/.env`:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```
3. **Nunca** commitar o `.env` (já está no `.gitignore`).

---

## IAM policy mínima (dev)

Usuário ou role que fornece as credenciais deve ter permissão no User Pool. Ajuste o `Resource` com o ARN real do seu User Pool (região e conta).

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:AdminListGroupsForUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:SUA_CONTA_ID:userpool/us-east-1_Etlo1rsA7"
    }
  ]
}
```

ARN do User Pool: no Console Cognito → User Pools → seu pool → "User pool ARN" (ou monte: `arn:aws:cognito-idp:REGIAO:CONTA:userpool/POOL_ID`).

---

## Produção

Em produção (ex.: API em EC2, ECS, Lambda), **não** usar access keys no código. Usar **IAM Role** associada ao serviço; o SDK detecta automaticamente e não é necessário setar `AWS_ACCESS_KEY_ID` nem `AWS_SECRET_ACCESS_KEY`.

---

## Teste

1. Subir a API: `cd apps/api && pnpm start:dev`.
2. Fazer login no front (Cognito Hosted UI) com usuário **admin** ou **super_admin**.
3. No browser ou Postman (com token no header): `GET http://localhost:3001/users` com `Authorization: Bearer <id_token ou access_token>`.

Se as credenciais não estiverem configuradas, a API retorna **500** com mensagem orientando a configurar (ver `docs/AWS_CREDENTIALS.md`).
