#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local name="$1"

  if [ -z "${!name:-}" ]; then
    echo "DEPLOY_CONFIGURATION_MISSING: $name is required" >&2
    exit 1
  fi
}

for required_env in \
  BACKEND_DEPLOY_HOST \
  BACKEND_DEPLOY_USER \
  BACKEND_DEPLOY_SSH_PRIVATE_KEY \
  BACKEND_PM2_APP_NAME; do
  require_env "$required_env"
done

SSH_PORT="${BACKEND_DEPLOY_SSH_PORT:-233}"
REMOTE_DEPLOY_PATH="${BACKEND_REMOTE_DEPLOY_PATH:-/www/wwwroot/hydcraft-portal}"
REMOTE_TEMP_DIR="/tmp/hydcraft-portal-deploy-${CNB_BUILD_ID:-manual}"

case "${BASELINE_EXISTING_DB:-false}" in
  true | false) ;;
  *)
    echo 'DEPLOY_CONFIGURATION_INVALID: BASELINE_EXISTING_DB must be true or false' >&2
    exit 1
    ;;
esac

case "${RUN_PRODUCTION_INIT:-false}" in
  true | false) ;;
  *)
    echo 'DEPLOY_CONFIGURATION_INVALID: RUN_PRODUCTION_INIT must be true or false' >&2
    exit 1
    ;;
esac

test -f deploy-artifact/.output/server/index.mjs
test -f deploy-artifact/dist-cli/scripts/production-init.js
test -f deploy-artifact/prisma.config.ts
test -f deploy-artifact/prisma/schema/migrations/migration_lock.toml
test -f deploy-artifact/node_modules/.bin/prisma

install -d -m 700 ~/.ssh
printf '%s\n' "$BACKEND_DEPLOY_SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
chmod 600 ~/.ssh/deploy_key
ssh-keyscan -p "$SSH_PORT" "$BACKEND_DEPLOY_HOST" >> ~/.ssh/known_hosts

cat > ~/.ssh/config <<EOF
Host deploy-host
  HostName $BACKEND_DEPLOY_HOST
  User $BACKEND_DEPLOY_USER
  Port $SSH_PORT
  IdentityFile ~/.ssh/deploy_key
  StrictHostKeyChecking yes
  ServerAliveInterval 10
  ServerAliveCountMax 3
  ConnectTimeout 30
EOF
chmod 600 ~/.ssh/config

ssh deploy-host "mkdir -p '$REMOTE_TEMP_DIR'"
rsync -az --delete deploy-artifact/ "deploy-host:$REMOTE_TEMP_DIR/"

ssh deploy-host \
  "export REMOTE_DEPLOY_PATH='$REMOTE_DEPLOY_PATH' \
  REMOTE_TEMP_DIR='$REMOTE_TEMP_DIR' \
  PM2_APP_NAME='$BACKEND_PM2_APP_NAME' \
  BASELINE_EXISTING_DB='${BASELINE_EXISTING_DB:-false}' \
  RUN_PRODUCTION_INIT='${RUN_PRODUCTION_INIT:-false}'; bash -s" <<'EOF'
set -euo pipefail

if [ ! -f "$REMOTE_DEPLOY_PATH/.env" ]; then
  echo 'DEPLOY_RUNTIME_MISSING_ENV: .env is required on the remote host' >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo 'DEPLOY_RUNTIME_MISSING_NODE: node is required on remote host' >&2
  exit 1
fi

rsync -a --no-owner --no-group --delete --exclude='.env' \
  "$REMOTE_TEMP_DIR/" \
  "$REMOTE_DEPLOY_PATH/"

cd "$REMOTE_DEPLOY_PATH"
set -a
source <(sed 's/\r$//' ./.env)
set +a

PRISMA_CLI='./node_modules/.bin/prisma'
if [ ! -x "$PRISMA_CLI" ]; then
  echo 'DEPLOY_ARTIFACT_MISSING_PRISMA: Prisma CLI is required in the deployment artifact' >&2
  exit 1
fi

if [ "$BASELINE_EXISTING_DB" = 'true' ]; then
  "$PRISMA_CLI" migrate resolve --applied 0_init
fi

"$PRISMA_CLI" migrate deploy

if [ "$RUN_PRODUCTION_INIT" = 'true' ]; then
  node ./dist-cli/scripts/production-init.js
fi

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start "$REMOTE_DEPLOY_PATH/.output/server/index.mjs" --name "$PM2_APP_NAME" --cwd "$REMOTE_DEPLOY_PATH"
fi

pm2 save
rm -rf "$REMOTE_TEMP_DIR"
EOF
