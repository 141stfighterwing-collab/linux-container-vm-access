#!/usr/bin/env bash
set -euo pipefail

runuser -u "${USER:-lcva}" -- vncserver -kill "${DISPLAY:-:1}" >/dev/null 2>&1 || true
exec runuser -u "${USER:-lcva}" -- vncserver "${DISPLAY:-:1}" -fg -localhost no -geometry 1440x900 -depth 24
