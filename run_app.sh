#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BACKEND_PID=""
FRONTEND_PID=""

cleanup_processes() {
  if [[ -n "$FRONTEND_PID" ]]; then
    if kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
      echo "Stopping frontend (PID $FRONTEND_PID)..."
      kill "$FRONTEND_PID" >/dev/null 2>&1 || true
      wait "$FRONTEND_PID" 2>/dev/null || true
    fi
    FRONTEND_PID=""
  fi

  if [[ -n "$BACKEND_PID" ]]; then
    if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
      echo "Stopping backend (PID $BACKEND_PID)..."
      kill "$BACKEND_PID" >/dev/null 2>&1 || true
      wait "$BACKEND_PID" 2>/dev/null || true
    fi
    BACKEND_PID=""
  fi
}

on_exit() {
  local exit_code="${1:-0}"
  trap - EXIT
  cleanup_processes
  exit "$exit_code"
}

terminate() {
  local code="$1"
  trap - EXIT
  cleanup_processes
  exit "$code"
}

trap 'on_exit "$?"' EXIT
trap 'terminate 130' INT
trap 'terminate 143' TERM

UVICORN_CMD=""
if [[ -d "$ROOT_DIR/backend/.venv" && -x "$ROOT_DIR/backend/.venv/bin/uvicorn" ]]; then
  UVICORN_CMD="$ROOT_DIR/backend/.venv/bin/uvicorn"
elif command -v uvicorn >/dev/null 2>&1; then
  UVICORN_CMD="$(command -v uvicorn)"
else
  echo "Error: uvicorn not found. Install backend dependencies with 'pip install -r backend/requirements.txt'." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm not found. Install Node.js 18+ before running this script." >&2
  exit 1
fi

echo "Starting backend (FastAPI) on port $BACKEND_PORT..."
(
  cd "$ROOT_DIR/backend"
  "$UVICORN_CMD" app.main:app --reload --host 0.0.0.0 --port "$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "Starting frontend (Next.js) on port $FRONTEND_PORT..."
(
  cd "$ROOT_DIR/frontend"
  if [[ ! -d node_modules ]]; then
    echo "Installing frontend dependencies..."
    npm install
  fi
  npm run dev -- --hostname 0.0.0.0 --port "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

cat <<INFO
Backend is running at http://localhost:$BACKEND_PORT
Frontend is running at http://localhost:$FRONTEND_PORT
Press Ctrl+C to stop both services.
INFO

EXIT_CODE=0
wait -n || EXIT_CODE=$?
wait || true
exit $EXIT_CODE
