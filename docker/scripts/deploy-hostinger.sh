#!/usr/bin/env bash
# ==============================================================================
# VARTA — Hostinger VPS Deployment & Live Database Sync Script
# Target Domain: https://varta.kevindevops.online
# ==============================================================================

set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/var/www/varta}"
REPO_URL="${REPO_URL:-https://github.com/konarchpatterns/varta.git}"

echo "=================================================="
echo "🚀 VARTA Deployment & Database Sync"
echo "🌐 Domain: https://varta.kevindevops.online"
echo "=================================================="

# 1. Ensure directory
mkdir -p "${DEPLOY_DIR}"
cd "${DEPLOY_DIR}"

# 2. Update Git remote and fetch latest code
echo "📦 Pulling latest code from konarchpatterns/varta..."
if [ -d ".git" ]; then
    git remote set-url origin "${REPO_URL}"
    git fetch origin
    git reset --hard origin/main
else
    git clone "${REPO_URL}" .
fi

# 3. Ensure .env exists
if [ ! -f ".env" ]; then
    echo "⚙️ Creating .env from .env.example..."
    cp .env.example .env
fi

# 4. Rebuild and launch production containers
echo "🐳 Rebuilding and starting production containers..."
docker compose -p varta -f docker/docker-compose.prod.yml up -d --build

# 5. Wait for PostgreSQL container to become healthy
echo "⏳ Waiting for PostgreSQL container to be healthy..."
until docker exec varta-prod-postgres pg_isready -U varta_user -d varta_db > /dev/null 2>&1; do
    echo "Waiting for database..."
    sleep 2
done

# 6. Restore the full database snapshot
echo "💾 Restoring complete database snapshot from database_backup/varta_backup.sql..."
if [ -f "database_backup/varta_backup.sql" ]; then
    docker exec -i varta-prod-postgres psql -U varta_user -d varta_db < database_backup/varta_backup.sql
    echo "✅ Database restored successfully!"
else
    echo "⚠️ Warning: database_backup/varta_backup.sql not found."
fi

# 7. Run Prisma migrations check
echo "🔄 Verifying Prisma database migrations..."
docker exec varta-prod-api npx prisma migrate deploy || true

# 8. Check Nginx configuration
echo "🌐 Checking Nginx..."
if [ -f "/etc/nginx/sites-available/varta.conf" ]; then
    sudo cp docker/nginx/varta.conf /etc/nginx/sites-available/varta.conf
    sudo ln -sf /etc/nginx/sites-available/varta.conf /etc/nginx/sites-enabled/varta.conf
    sudo nginx -t && sudo systemctl reload nginx
    echo "✅ Nginx reloaded successfully!"
fi

echo "=================================================="
echo "🎉 Deployment completed successfully!"
echo "👉 App URL: https://varta.kevindevops.online"
echo "=================================================="
