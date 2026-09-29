#!/usr/bin/env bash
# Fetch CDK-synth secrets from Secrets Manager into env vars, then exec the
# passed command. The secret never hits stdout — it's piped straight into
# python and assigned to an env var. Used by diff:stage, deploy:stage, etc.
#
# Usage: scripts/with-secrets.sh <command...>
set -euo pipefail

# Force the yorkie profile regardless of whatever's already in the parent
# shell — fuel2 deploys always target the same account. Override via
# FUEL2_AWS_PROFILE if you really need a different one.
export AWS_PROFILE="${FUEL2_AWS_PROFILE:-yorkie}"

export FUEL2_GOOGLE_CLIENT_SECRET
FUEL2_GOOGLE_CLIENT_SECRET=$(
  aws secretsmanager get-secret-value \
    --secret-id GoogleOAuth \
    --region us-east-2 \
    --query 'SecretString' \
    --output text \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["client_secret"], end="")'
)

if [ -z "$FUEL2_GOOGLE_CLIENT_SECRET" ]; then
  echo "Failed to fetch FUEL2_GOOGLE_CLIENT_SECRET from Secrets Manager" >&2
  exit 1
fi

exec "$@"
