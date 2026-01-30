# S3 — Bucket policy para logos públicos

Bucket: **bcg-platform-assets**

Para que o site público e o dashboard exibam os logos por URL direta (sem signed URL), é preciso liberar **leitura pública** apenas na pasta `logos/`. Sem essa policy, as imagens retornam 403 e aparecem **quebradas** no navegador. A escrita/remoção continua restrita ao IAM da API.

## 1. No Console S3

1. Abra o bucket **bcg-platform-assets**.
2. Aba **Permissions** → **Bucket policy** → **Edit**.
3. Cole a policy abaixo (substitua `BUCKET_ARN` pelo ARN do bucket, ex.: `arn:aws:s3:::bcg-platform-assets`).

## 2. Policy (leitura pública só em `logos/*`)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadLogos",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bcg-platform-assets/logos/*"
    }
  ]
}
```

- **Principal**: `*` = qualquer um pode **ler** objetos em `logos/*`.
- **Action**: só `s3:GetObject` (leitura).
- **Resource**: só o prefixo `logos/*`; o resto do bucket continua privado.

## 3. Block Public Access

Se o bucket tiver **Block all public access** ativado, a bucket policy acima **não** libera acesso até você desbloquear:

1. **Permissions** → **Block public access** → **Edit**.
2. Desmarque **Block all public access** (ou apenas **Block public access to buckets and policies granted through new public bucket or access point policies**).
3. Salve.

Assim, apenas a policy define o que é público (só `logos/*`).

## 4. URLs dos logos

Após a policy ativa:

- Logo BCG: `https://bcg-platform-assets.s3.us-east-1.amazonaws.com/logos/group/logo.{png|jpg|...}`
- Logo empresa (tenant): `https://bcg-platform-assets.s3.us-east-1.amazonaws.com/logos/tenants/{tenantId}/logo.{png|jpg|...}`

A API retorna essa URL no `POST /upload/logo` (campo `url`).

## 5. Logo quebrado (imagem não carrega)

Se o logo aparecer quebrado no dashboard após o upload:

1. **Bucket policy** — Confirme que a policy acima está aplicada e que o recurso é `arn:aws:s3:::SEU_BUCKET/logos/*`.
2. **Block Public Access** — Em **Permissions** → **Block public access**, desmarque o bloqueio que impede políticas públicas (ver seção 3).
3. **URL** — A URL deve ser `https://SEU_BUCKET.s3.REGIAO.amazonaws.com/logos/group/logo.xxx` (ou `logos/tenants/ID/logo.xxx`). Teste abrindo a URL no navegador; se retornar 403, o problema é permissão no S3.
