#!/usr/bin/env bash
set -euo pipefail

rm -f /var/run/xrdp/xrdp.pid /var/run/xrdp/xrdp-sesman.pid
xrdp-sesman --nodaemon &
exec xrdp --nodaemon
