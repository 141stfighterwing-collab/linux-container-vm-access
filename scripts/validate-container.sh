#!/usr/bin/env bash
set -euo pipefail

IMAGE="${LCVA_DESKTOP_IMAGE:-lcva/desktop:latest}"
CONTAINER_NAME="lcva-validate-$$"
REQUIRE_DOCKER="${LCVA_REQUIRE_DOCKER:-0}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed; skipping container validation. Set LCVA_REQUIRE_DOCKER=1 to fail when Docker is unavailable." >&2
  if [[ "$REQUIRE_DOCKER" == "1" ]]; then
    exit 1
  fi
  exit 0
fi

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build -t "$IMAGE" images/desktop
container_id="$(docker run -d --name "$CONTAINER_NAME" -p 22 -p 3389 -p 6080 "$IMAGE")"

for _ in {1..90}; do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    break
  fi
  if [[ "$status" == "unhealthy" ]]; then
    docker logs "$container_id" >&2 || true
    exit 1
  fi
  sleep 2
done

status="$(docker inspect -f '{{.State.Health.Status}}' "$container_id")"
[[ "$status" == "healthy" ]]

novnc_port="$(docker inspect -f '{{(index (index .NetworkSettings.Ports "6080/tcp") 0).HostPort}}' "$container_id")"
ssh_port="$(docker inspect -f '{{(index (index .NetworkSettings.Ports "22/tcp") 0).HostPort}}' "$container_id")"
rdp_port="$(docker inspect -f '{{(index (index .NetworkSettings.Ports "3389/tcp") 0).HostPort}}' "$container_id")"

curl -fsS "http://127.0.0.1:$novnc_port/" >/dev/null
python3 - <<PY
import socket
for name, port in {'ssh': $ssh_port, 'rdp': $rdp_port, 'novnc': $novnc_port}.items():
    with socket.create_connection(('127.0.0.1', int(port)), timeout=5):
        pass
    print(f'{name} port {port} is reachable')
PY

docker exec "$container_id" supervisorctl status | tee /tmp/lcva-supervisor-status.txt
python3 - <<'PY'
from pathlib import Path
lines = Path('/tmp/lcva-supervisor-status.txt').read_text().splitlines()
status_by_name = {line.split()[0]: line for line in lines if line.split()}
for name in ['sshd', 'vnc', 'novnc', 'xrdp']:
    line = status_by_name.get(name, '')
    assert 'RUNNING' in line, '\n'.join(lines)
PY
rm -f /tmp/lcva-supervisor-status.txt

echo "Container validation passed for $IMAGE"
