# Security

This repository is an MVP scaffold. Do not expose it to untrusted users until the production controls below are implemented.

## Required production work

- Add authentication and per-user authorization.
- Put the service behind TLS.
- Replace default passwords with generated per-session secrets.
- Store session secrets server-side and never hard-code them in the image.
- Add quotas for CPU, memory, session count, session duration, and network bandwidth.
- Use a dedicated Docker network and restrict outbound egress.
- Run containers as non-root where possible and keep Linux capabilities dropped.
- Add image patching, vulnerability scanning, and SBOM generation.
- Add audit logging for session creation, stop events, and admin actions.
- Add CSRF protection for browser-triggered state changes.
- Consider rootless Docker, gVisor, Kata Containers, or microVM isolation for hostile workloads.

## Current hardening defaults

The host launcher applies memory, CPU, PID limits, `no-new-privileges`, and drops Linux capabilities for session containers. These are useful defaults, but they are not a complete sandbox.
