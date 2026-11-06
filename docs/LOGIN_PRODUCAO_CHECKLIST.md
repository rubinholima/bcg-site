# Login em produção — checklist completo

Este doc reúne **tudo** que foi feito para o login funcionar em produção (www.bostoncitygroup.biz) com CloudFront na frente.

## Por que esse desenho

- **CloudFront** remove o header **Set-Cookie** das respostas quando a cache policy não encaminha cookies. Por isso o POST de login **não** pode passar pelo CloudFront.
- **Solução:** o formulário de login faz POST direto para **auth.bostoncitygroup.biz** (acesso direto ao Lightsail), onde a resposta define o cookie. Depois o redirect leva o usuário para **www**, e o restante do app (dashboard, `/api/me`) continua passando pelo CloudFront — mas aí o CloudFront precisa **encaminhar o header Cookie** para a origem, senão o Next não recebe o token e devolve 401.

---

## 1. DNS

- Criar registro **A** para o subdomínio **auth** (não o nome completo).
- **Tipo:** A  
- **Nome/host:** `auth` (o painel acrescenta `.bostoncitygroup.biz`)  
- **Valor:** IP do Lightsail (ex.: 44.196.14.114)  
- **TTL:** padrão (ex.: 300)
- Conferir: `nslookup auth.bostoncitygroup.biz` deve retornar esse IP.  
- **Erro comum:** usar `auth.bostoncitygroup.biz` no campo de nome e acabar com `auth.bostoncitygroup.biz.bostoncitygroup.biz` — usar só `auth`.

---

## 2. Lightsail — firewall

- **Networking** da instância → **Firewall**.
- Garantir que **HTTPS (443)** está permitido (e HTTP 80 se usar redirect).
- Sem isso, o navegador não consegue conectar em auth.bostoncitygroup.biz (ERR_CONNECTION_TIMED_OUT).

---

## 3. Certificado SSL para auth (servidor)

- No servidor (Lightsail):
  ```bash
  sudo apt update && sudo apt install -y certbot python3-certbot-nginx
  sudo certbot certonly --nginx -d auth.bostoncitygroup.biz
  ```
- Certificado fica em `/etc/letsencrypt/live/auth.bostoncitygroup.biz/` (fullchain.pem, privkey.pem).

---

## 4. Nginx

- Config ativo: ex.: `/etc/nginx/sites-enabled/bostoncitygroup.biz`.
- **Não** pode ter linha com só uma vírgula (ex.: primeira linha `,`) — gera `unknown directive ","`.
- **Dois blocos HTTPS:**
  1. **Bloco auth** (antes do principal):  
     - `server_name auth.bostoncitygroup.biz;`  
     - `ssl_certificate` e `ssl_certificate_key` = caminhos do certbot para **auth.bostoncitygroup.biz** (não o cert de www).  
     - Locations: `^~ /api/auth/` e `location /` → proxy para `http://127.0.0.1:3000` com `proxy_set_header Cookie $http_cookie` e `proxy_buffer_size 16k; proxy_buffers 4 16k;` em `/api/auth/`.
  2. **Bloco principal:**  
     - `server_name bostoncitygroup.biz www.bostoncitygroup.biz origin.bostoncitygroup.biz;` — **sem** auth.  
     - Certificado do www (ex.: `/etc/letsencrypt/live/bostoncitygroup.biz/...`).  
     - Mesmas locations do exemplo: `/api/media/proxy`, `/api/auth/`, `/api/public/`, `/api/me`, `/api/`, `/`.
- Testar e recarregar:
  ```bash
  sudo nginx -t && sudo systemctl reload nginx
  ```
- Exemplo completo: `docs/nginx-bostoncitygroup.biz.example.conf`.

---

## 5. Variável de ambiente e deploy do web

- No ambiente onde o **Next (apps/web)** é buildado (CI ou servidor), definir:
  ```bash
  NEXT_PUBLIC_AUTH_API_URL=https://auth.bostoncitygroup.biz
  ```
- Fazer **build e deploy** do web para que a variável entre no bundle.  
- Com isso, o form de login usa `action="https://auth.bostoncitygroup.biz/api/auth/login"` e o POST vai direto para o auth (bypass CloudFront).

---

## 6. CloudFront — encaminhar Cookie para a origem

- **www** continua atrás do CloudFront. Após o login, o usuário cai em www/dashboard e o front chama `/api/me` em www; o navegador envia o cookie, mas o CloudFront precisa **repassar** esse header para a origem.
- No console **CloudFront** → distribuição de www → aba **Behaviors**.
- Selecionar o behavior **Default (*)** (que atende `/api/me` e o site) → **Edit**.
- Em **Origin request policy**, escolher uma política que encaminhe os headers do viewer, por exemplo:
  - **AllViewer**, ou  
  - **AllViewerExceptHostHeader**
- Salvar. Aguardar propagação (minutos).
- Sem isso, a origem recebe o request sem Cookie → Next retorna 401 → redirect para login (session_expired).

---

## 7. Código (já no repo)

- **Cookie domain:** em `apps/web/src/app/api/auth/login/route.ts`, `getCookieOptions` define `domain: ".bostoncitygroup.biz"` quando o host é `*.bostoncitygroup.biz`, para o cookie valer em www e auth.
- **Redirect HTTPS:** `getRedirectOrigin` usa `NEXT_PUBLIC_APP_URL` em produção para redirect pós-login sempre em https.
- **Form:** `apps/web/src/app/login/page.tsx` usa `loginAction = authApiUrl + "/api/auth/login"` quando `NEXT_PUBLIC_AUTH_API_URL` está definido e faz `form.submit()` para POST full-page em auth.

---

## Resumo rápido

| O quê | Onde |
|-------|------|
| DNS A auth | Painel DNS → host `auth` → IP Lightsail |
| Porta 443 | Lightsail → Networking → Firewall |
| Cert auth | Servidor: certbot -d auth.bostoncitygroup.biz |
| Nginx auth + principal | sites-enabled: bloco auth com cert auth; principal sem auth no server_name |
| NEXT_PUBLIC_AUTH_API_URL | Build do apps/web, depois deploy |
| Cookie na origem | CloudFront → Default (*) → Origin request policy = AllViewer (ou similar) |

Quando tudo estiver certo: POST login → auth.bostoncitygroup.biz (Set-Cookie com Domain=.bostoncitygroup.biz) → redirect www/dashboard → /api/me com Cookie → 200 → dashboard carrega.

---

## CUP360 — domínios públicos (provisionamento AWS, sem secrets no repositório)

Variáveis na **API** (Nest):

| Variável | Descrição |
|----------|-----------|
| `CUP360_PUBLIC_DOMAIN_AWS_ENABLED` | `1` para habilitar chamadas reais ACM/CloudFront/Route53 (IAM mínimo). |
| `CUP360_PUBLIC_DOMAIN_ORIGIN_DOMAIN` | Hostname HTTPS do origin compartilhado Lightsail/Nginx (ex.: `origin.bostoncitygroup.biz`) — **contrato final é HTTPS**; o certificado TLS do origin deve estar apto para CloudFront usar `https-only` sem erro. |
| `CUP360_PUBLIC_DOMAIN_ACM_REGION` | Região do certificado para CloudFront — usar `us-east-1`. |
| `CUP360_PUBLIC_DOMAIN_AWS_REGION` | Região AWS para clientes (Route53 global usa endpoint us-east-1 no código). |
| `CUP360_PUBLIC_DOMAIN_ROUTE53_MANAGE` | `1` para UPSERT automático de CNAME de validação ACM e ALIAS A → CloudFront **apenas** em `CUP360_PUBLIC_DOMAIN_ROUTE53_ALLOWED_ZONES`. |
| `CUP360_PUBLIC_DOMAIN_ROUTE53_ALLOWED_ZONES` | Lista separada por vírgula de **hosted zone IDs** onde mutação é permitida. |

Variáveis no **Web** (Next, middleware Edge):

| Variável | Descrição |
|----------|-----------|
| `CUP360_EDGE_HOST_SECRET` | Segredo HMAC (armazenamento seguro no servidor — **não** no frontend). A **CloudFront Function** (viewer-request) assina o contrato e envia `x-cup360-edge-v`, `x-cup360-edge-ts`, `x-cup360-edge-host`, `x-cup360-edge-sig`. O middleware encaminha esses headers para `GET /public/hostname-context`; a API valida **antes** da resolução de tenant. Em dev, sem esses headers e com segredo definido, domínio customizado falha fechado (403). |

**Modelo:** uma **distribuição CloudFront + certificado ACM + CloudFront Function** por site publicado (aliases apex+www); **não** usar a distribuição BCG do portal como “compartilhada” para tenants.

**CloudFront Function:** artefato em `apps/api/src/public-domain/cloudfront-viewer-request.template.js` — o provisionador substitui `__SECRET__` e injeta aliases; publicar com runtime `cloudfront-js-1.0`.

**IAM (resumo):** `acm:RequestCertificate`, `acm:DescribeCertificate` (us-east-1); `cloudfront:CreateDistribution`, `cloudfront:GetDistribution*`, `cloudfront:UpdateDistribution`; `cloudfront:CreateFunction`, `cloudfront:UpdateFunction`, `cloudfront:DescribeFunction`, `cloudfront:PublishFunction`; `route53:ChangeResourceRecordSets` e `route53:ListResourceRecordSets` apenas nas zonas permitidas. Nunca usar credencial root.
