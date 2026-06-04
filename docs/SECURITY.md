# Security

This repository is an MVP scaffold. Do not expose it to untrusted users until the production controls below are implemented.

## Current authentication scaffold

- The first boot creates an admin account from `LCVA_ADMIN_USERNAME` and `LCVA_ADMIN_PASSWORD`.
- Passwords for local users are stored in `data/users.json` as PBKDF2 hashes with per-user salts.
- Login sessions use HttpOnly, SameSite cookies stored in memory. Restarting the host service logs users out.
- Change the default admin password before using the service outside a local lab.

## Required production work

- Put the service behind TLS.
- Add CSRF protection for browser-triggered state changes.
- Replace default VNC/RDP/SSH passwords with generated per-session secrets.
- Store session secrets server-side and never hard-code them in the image.
- Add stronger role-based authorization for admin, operator, and viewer actions.
- Add quotas for CPU, memory, session count, session duration, and network bandwidth.
- Use a dedicated Docker network and restrict outbound egress.
- Run containers as non-root where possible and keep Linux capabilities dropped.
- Add image patching, vulnerability scanning, and SBOM generation.
- Add audit logging for session creation, stop events, login events, and admin actions.
- Consider rootless Docker, gVisor, Kata Containers, or microVM isolation for hostile workloads.

## Current hardening defaults

The host launcher applies memory, CPU, PID limits, `no-new-privileges`, and drops Linux capabilities for session containers. These are useful defaults, but they are not a complete sandbox.
