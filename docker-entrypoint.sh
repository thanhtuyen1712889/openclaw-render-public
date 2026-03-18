#!/bin/sh
set -eu

STATE_DIR="${OPENCLAW_STATE_DIR:-/tmp/.openclaw}"
WORKSPACE_DIR="${OPENCLAW_WORKSPACE_DIR:-/tmp/workspace}"
CONFIG_DIR="${OPENCLAW_CONFIG_DIR:-/tmp/openclaw-config}"
CONFIG_PATH="${OPENCLAW_CONFIG_PATH:-$CONFIG_DIR/openclaw.json}"
AUTH_SECRET_PATH="${OPENCLAW_AUTH_SECRET_PATH:-/etc/secrets/AUTH_PROFILES_JSON}"

mkdir -p "$STATE_DIR" "$WORKSPACE_DIR" "$CONFIG_DIR" "$STATE_DIR/agents/main/agent"

if [ -f "$AUTH_SECRET_PATH" ]; then
  cp "$AUTH_SECRET_PATH" "$STATE_DIR/agents/main/agent/auth-profiles.json"
fi

node /app/render-config.mjs "$CONFIG_PATH"

export OPENCLAW_STATE_DIR="$STATE_DIR"
export OPENCLAW_WORKSPACE_DIR="$WORKSPACE_DIR"
export OPENCLAW_CONFIG_PATH="$CONFIG_PATH"

exec openclaw gateway run \
  --allow-unconfigured \
  --port "${PORT:-8080}" \
  --auth token \
  --token "${OPENCLAW_GATEWAY_TOKEN:-}"
