ubuntu@cvm4:/var/www/signhere-sandbox/app$ cat deploy.sh
#!/bin/bash
set -e

LOG_DIR="/var/log/deploys"
LOG_FILE="$LOG_DIR/signhere-sandbox.log"
sudo mkdir -p "$LOG_DIR"
sudo chown "$(whoami):$(whoami)" "$LOG_DIR"

REF="$1"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Redirect all output (stdout+stderr) to both the terminal/CI log AND the file
exec > >(tee -a "$LOG_FILE") 2>&1

echo ""
echo "===================================================="
echo "[$TIMESTAMP] Deploy started — ref: $REF"
echo "===================================================="

# Trap: log failure with clear marker if anything below fails
trap 'echo "[$(date "+%Y-%m-%d %H:%M:%S")] DEPLOY FAILED — ref: $REF"; exit 1' ERR

cd /var/www/signhere-sandbox/app

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

echo "Restarting backend..."
pm2 restart signhere-sandbox --update-env

echo "Verifying health..."
sleep 2
if curl -sf -o /dev/null https://sandbox.signhere.my.id/api/users; then
  echo "Health check passed."
else
  echo "WARNING: health check failed after deploy — check pm2 logs manually."
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deploy SUCCEEDED — ref: $REF"
ubuntu@cvm4:/var/www/signhere-sandbox/app$