#!/bin/bash
# Runs on the dev EC2 (i-0f610e556e9d1fe76) via SSM RunCommand from
# .github/workflows/deploy-dev.yml. Pulls the image whose tag is in $IMAGE,
# refreshes /etc/tds-backend-dev.env from /tds/dev/* SSM, pushes the schema
# via prisma db push, restarts the systemd unit, and health-probes locally.
#
# IMAGE is passed in by the workflow as an env var (set via SSM
# `--parameters environment=`). Defaults to dev-latest if unset.
set -euo pipefail

REGION=ap-south-1
IMG="${IMAGE:-985345988013.dkr.ecr.ap-south-1.amazonaws.com/tds-backend:dev-latest}"
REGISTRY="${IMG%%/*}"

# 1. ECR login (instance role grants ecr:GetAuthorizationToken)
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

# 2. Refresh /etc/tds-backend-dev.env from /tds/dev/* SSM + append IMAGE=
ENV_FILE=/etc/tds-backend-dev.env
TMP=$(mktemp)
aws ssm get-parameters-by-path \
  --path /tds/dev/ --recursive --with-decryption \
  --region "$REGION" --output json \
  | python3 -c '
import json, sys
for p in json.load(sys.stdin).get("Parameters", []):
    key = p["Name"].rsplit("/", 1)[-1]
    val = p["Value"].replace("\n", "\\n")
    print(f"{key}={val}")
' > "$TMP"
echo "IMAGE=$IMG" >> "$TMP"
chmod 600 "$TMP"
mv "$TMP" "$ENV_FILE"

# 3. Pull image
docker pull "$IMG"

# 4. Sync schema via prisma db push. We use `db push` instead of
#    `migrate deploy` on dev because the prod migration chain has an
#    out-of-band table (`colive_draft_bookings`) that breaks a clean
#    re-apply from the init migration. db push aligns the dev DB to
#    schema.prisma directly. See docs/todo/prisma-init-baseline.md.
docker run --rm --network tds-dev-net --env-file "$ENV_FILE" "$IMG" \
  sh -c "npx prisma db push --skip-generate --accept-data-loss"

# 5. Restart backend (systemd unit's EnvironmentFile picks up IMAGE)
systemctl restart tds-backend-dev

# 6. Local /health probe with backoff
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if curl -fsS -m 3 http://127.0.0.1:8080/health >/dev/null 2>&1; then
    echo "DEPLOY OK on attempt $i"
    exit 0
  fi
  sleep 3
done
echo "DEPLOY FAILED: backend not healthy after 45s"
journalctl -u tds-backend-dev -n 100 --no-pager || true
exit 1
