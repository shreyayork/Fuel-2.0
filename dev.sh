#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  local candidates=(
    "/opt/homebrew/bin/node"
    "/usr/local/bin/node"
    "$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" 2>/dev/null | sort -V | tail -1)/bin/node"
    "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"
  )
  for candidate in "${candidates[@]}"; do
    if [[ -x "$candidate" ]]; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

NODE_BIN="$(find_node)" || {
  echo "Node.js not found. Install Node LTS or open this project in Cursor and run ./dev.sh again."
  exit 1
}

if [[ ! -d node_modules ]]; then
  echo "Installing dependencies..."
  if command -v npm >/dev/null 2>&1; then
    npm install
  else
    echo "node_modules missing and npm is unavailable. Install Node.js, then run: npm install"
    exit 1
  fi
fi

exec "$NODE_BIN" node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173
