#!/usr/bin/env bash
# WattWatch FastAPI runner: ./run.sh
set -euo pipefail
cd "$(dirname "$0")"
if ! python3 -c "import fastapi, uvicorn" >/dev/null 2>&1; then
  echo "FastAPI dependencies are missing. Install them with: python3 -m pip install -r requirements.txt"
  exit 1
fi
echo "Starting WattWatch → http://localhost:${PORT:-8000}/"
exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
