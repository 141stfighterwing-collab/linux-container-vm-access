#!/usr/bin/env bash
set -euo pipefail

exec websockify --web=/usr/share/novnc 0.0.0.0:6080 localhost:5901
