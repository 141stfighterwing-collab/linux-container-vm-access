# Architecture

Linux Container VM Access (LCVA) is designed as a small host service plus a reusable Linux desktop container image.

## Components

## Host server

`src/server.js` exposes the HTTP API, static UI, and session lifecycle routes. It uses the Docker CLI to create, inspect, list, and stop session containers, so the MVP has no runtime npm dependencies.

## Session container

`images/desktop/Dockerfile` builds a Debian XFCE container with:

- TigerVNC on `5901` for the Linux desktop.
- noVNC/websockify on `6080` for browser WebSocket access.
- OpenSSH on `22` for terminal access.
- xrdp on `3389` for direct RDP access.
- Firefox ESR, Mousepad, XFCE Terminal, and a minimal desktop environment.

## Session lifecycle

1. User opens the host UI.
2. User clicks **Start Linux Desktop**.
3. The host server creates a labeled Docker container with short-lived metadata.
4. Docker assigns random host ports for SSH, RDP, and noVNC.
5. The UI opens the generated noVNC host port, and the browser connects by WebSocket to the container's noVNC service.
6. A reaper checks once per minute and stops expired sessions.

## Why containers instead of VMs?

This project aims for speed and low resource usage. Containers launch faster and use less RAM than full virtual machines, but they share the host kernel. If you need stronger isolation, run this service inside a hardened VM, use microVMs, or adapt the session launcher to Firecracker/Kata Containers.
