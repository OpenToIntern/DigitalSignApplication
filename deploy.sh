#!/bin/bash
set -e

REF="$1"
ENV_NAME="$2"   # "sandbox" atau "production"

if [ -z "$ENV_NAME" ]; then
  echo "ERROR: environment name not provided (usage: deploy.sh <ref> <sandbox|production>)"
  exit 1
fi

APP_DIR="/var/www/signhere-$ENV_NAME/app"
PM2_NAME="signhere-$ENV_NAME"
HEALTH_URL="https://$([ "$ENV_NAME" = "production" ] && echo "signhere.my.id" || echo "sandbox.signhere.my.id")/api/users"

LOG_DIR="/var/log/deploys"
LOG_FILE="$LOG_DIR/signhere-$ENV_NAME.log"
sudo mkdir -p "$LOG_DIR"
sudo chown "$(whoami):$(whoami)" "$LOG_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "===================================================="
echo "[$TIMESTAMP] Deploy started — env: $ENV_NAME — ref: $REF"
echo "===================================================="

trap 'echo "[$(date "+%Y-%m-%d %H:%M:%S")] DEPLOY FAILED — env: $ENV_NAME — ref: $REF"; exit 1' ERR

cd "$APP_DIR"

echo "Checking out ref: $REF"
git fetch origin
git checkout "$REF"
git pull origin "$REF" || true

echo "Installing backend deps..."
cd backend && npm ci

echo "Syncing DB schema..."
npx prisma generate
npx prisma db push

echo "Building backend..."
npm run build

echo "Installing frontend deps..."
cd ../frontend && npm ci

echo "Building frontend..."
npm run build

echo "Restarting backend ($PM2_NAME)..."
pm2 restart "$PM2_NAME" --update-env

echo "Verifying health..."
sleep 2
if curl -sf -o /dev/null "$HEALTH_URL"; then
  echo "Health check passed."
else
  echo "WARNING: health check failed after deploy — check pm2 logs manually."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy SUCCEEDED — env: $ENV_NAME — ref: $REF"