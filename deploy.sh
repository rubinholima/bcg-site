#!/bin/bash
set -e

# 1. Navegar para a raiz e atualizar o código
echo "🚀 Puxando atualizações do Git..."
cd ~/bcg-site
git pull origin develop

# 2. Instalar dependências
echo "📦 Instalando dependências..."
pnpm install

# 3. API: Prisma generate + build
echo "💎 Gerando Prisma Client..."
cd apps/api
pnpm exec prisma generate
echo "🔨 Build da API..."
pnpm run build
cd ../..

# 4. Web: build
echo "🔨 Build do Web..."
pnpm --filter web build

# 5. Reiniciar API (cwd = apps/api, dist/main.js)
echo "⚡ Reiniciando API (bcg-api)..."
pm2 delete bcg-api 2>/dev/null || true
cd apps/api
pm2 start dist/src/main.js --name bcg-api --update-env
cd ../..

# 6. Reiniciar Web (cwd = apps/web para next start encontrar .next)
echo "🌐 Reiniciando Web (bcg-web)..."
pm2 delete bcg-web 2>/dev/null || true
cd apps/web
pm2 start "pnpm start" --name bcg-web --cwd "$(pwd)"
cd ../..

# 7. Salvar e status
pm2 save
pm2 status

echo "✅ Deploy finalizado com sucesso!"
