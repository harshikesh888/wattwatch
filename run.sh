#!/usr/bin/env bash
# WattWatch one-command runner: ./run.sh
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install --no-audit --no-fund
fi
echo "Starting WattWatch → http://localhost:5173/"
npm run dev
