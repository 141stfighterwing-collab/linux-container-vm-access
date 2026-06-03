#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-18080}"
TMP_DIR="$(mktemp -d)"
SERVER_LOG="$TMP_DIR/server.log"
COOKIE_JAR="$TMP_DIR/cookies.txt"
cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

PORT="$PORT" LCVA_DATA_DIR="$TMP_DIR/data" LCVA_ADMIN_USERNAME=admin LCVA_ADMIN_PASSWORD=admin node src/server.js >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for _ in {1..40}; do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS "http://127.0.0.1:$PORT/api/health" | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["service"] == "linux-container-vm-access"'

unauth_status="$(curl -sS -o "$TMP_DIR/me.json" -w '%{http_code}' "http://127.0.0.1:$PORT/api/me")"
[[ "$unauth_status" == "401" ]]

curl -fsS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' \
  "http://127.0.0.1:$PORT/api/login" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["user"]["role"] == "admin"'

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:$PORT/api/app-health" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert "docker" in data and "activeSessions" in data'

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:$PORT/api/socket-health" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert "sockets" in data'

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:$PORT/api/linux/stats" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["platform"] == "linux"; assert data["memory"]["totalBytes"] > 0'

curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"operator","password":"operator-pass","role":"operator"}' \
  "http://127.0.0.1:$PORT/api/users" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["user"]["username"] == "operator"'

curl -fsS -b "$COOKIE_JAR" "http://127.0.0.1:$PORT/api/users" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert len(data["users"]) == 2'

curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' -X PUT \
  -d '{"banner":"validated","maxSessionsPerUser":3,"defaultSessionTtlMinutes":90,"allowSsh":true,"allowRdp":true}' \
  "http://127.0.0.1:$PORT/api/settings" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["settings"]["banner"] == "validated"'

curl -fsS -b "$COOKIE_JAR" -X POST "http://127.0.0.1:$PORT/api/logout" \
  | python3 -c 'import json,sys; data=json.load(sys.stdin); assert data["ok"] is True'

echo "API validation passed on port $PORT"
