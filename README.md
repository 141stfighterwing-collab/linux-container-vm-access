# Linux Container VM Access

A Linux-only, self-hosted starter repo for building a lightweight Kasm/Apache Guacamole-style service that launches disposable Linux desktop containers on demand.

> Containers are not full virtual machines. This project intentionally targets a **super-lite Linux desktop container** model: one isolated container per session with browser VNC, optional RDP, SSH, a browser, editor, and terminal tools.

## What it does

- Runs a host web server that waits for incoming browser connections.
- Provides an admin login with settings, user, Linux host, VM, socket health, and app health panels.
- Creates an ephemeral Linux desktop container when a user starts a session.
- Exposes a browser-based VNC client through noVNC/websockify on a generated host port.
- Publishes SSH and RDP ports for direct client connections.
- Automatically cleans up expired sessions.
- Keeps the architecture small enough to extend into auth, persistence, auditing, and orchestration later.

## Quick start

### Requirements

- Linux host
- Docker Engine
- Node.js 20+

### Run locally

```bash
cp .env.example .env
npm install
npm run build:image
npm start
```

Open <http://localhost:8080>, click **Start Linux Desktop**, then connect through the embedded noVNC client. The session card also shows SSH/RDP host ports.

## Architecture

```text
Browser
  |
  | HTTP control plane
  v
Host Node.js server
  |
  | Docker CLI
  v
Ephemeral desktop container
  ^
  | noVNC WebSocket data plane
  |- XFCE desktop
  |- TigerVNC :5901
  |- noVNC/websockify :6080
  |- xrdp :3389
  `- OpenSSH :22
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/MANAGEMENT.md](docs/MANAGEMENT.md), and [docs/ROADMAP.md](docs/ROADMAP.md) for implementation details and next steps.

## Security notes

This is an MVP scaffold, not production-ready software. Before exposing it to the internet, add authentication, TLS, authorization, quotas, container hardening, secrets management, audit logs, and network isolation. See [docs/SECURITY.md](docs/SECURITY.md).
