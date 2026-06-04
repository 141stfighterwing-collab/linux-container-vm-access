# Six-Month Roadmap

This roadmap turns the current LCVA MVP into a robust Linux-only container desktop platform. It is organized by month and by workstream: robustness, features, add-ons, optimization, and security.

## Current MVP baseline

- [x] Host web server and admin console.
- [x] Docker-backed session launcher.
- [x] Browser UI with noVNC access.
- [x] SSH and RDP host port publication.
- [x] Disposable XFCE desktop image.
- [x] Local admin login, user scaffolding, settings, app health, socket health, Linux host stats, and validation scripts.

## Month 1: Production foundation

### Robustness

- Add structured logging with request IDs, session IDs, user IDs, and container IDs.
- Add API error types and consistent JSON error responses for auth, Docker, validation, and configuration failures.
- Add database-backed persistence option for users, settings, audit events, and session records.
- Add CI jobs for lint, smoke, API validation, and Docker container validation.

### Features

- Generate per-session VNC/RDP/SSH passwords instead of using the fixed `lcva` password.
- Add session ownership so users only see and stop sessions they own unless they are admins.
- Add basic session limits: max concurrent sessions per user, max global sessions, and max TTL.
- Add session launch profiles for CPU, memory, resolution, and allowed protocols.

### Add-ons

- Add a template registry for multiple desktop images such as base XFCE, browser-only, developer, and support workstation.
- Add optional bind-mounted user home directories for persistent workspaces.

### Optimization

- Measure cold-start time for the desktop image and record startup timing in session metadata.
- Split the image into base and profile layers so common desktop packages are cached.
- Add image size tracking in CI.

### Security

- Require non-default admin credentials before binding to non-loopback addresses.
- Add CSRF protection for state-changing browser routes.
- Add secure cookie options for TLS deployments.
- Add audit logging for login, logout, session create, session stop, user changes, and settings changes.

## Month 2: Identity, access, and session hardening

### Robustness

- Add graceful Docker error recovery and clearer degraded-mode health states.
- Add stale session reconciliation on startup by scanning labeled containers.
- Add automatic cleanup for orphaned containers and expired persistent volumes.

### Features

- Add role-based access control for admin, operator, and viewer actions.
- Add user profile pages with active sessions, recent sessions, and personal limits.
- Add admin controls to pause, extend, terminate, and inspect sessions.

### Add-ons

- Add OIDC login support for providers such as Authentik, Keycloak, Azure AD, and Google Workspace.
- Add LDAP group-to-role mapping as an optional connector.

### Optimization

- Add pre-warmed standby containers for selected templates.
- Add session start queueing with status updates in the UI.
- Add lazy loading for heavy dashboard panels.

### Security

- Move session credentials into server-side secret storage and never expose them in static HTML.
- Add one-time noVNC launch tokens with short expiration.
- Add container egress allow/deny policy support.
- Add rate limits for login and session creation.

## Month 3: Networking, observability, and admin operations

### Robustness

- Add Prometheus metrics for API latency, session starts, session failures, active sessions, and container resource usage.
- Add health probes for host dependencies: Docker daemon, disk pressure, memory pressure, and image availability.
- Add log export hooks for syslog, Loki, and JSON file output.

### Features

- Add admin dashboards for host usage, session usage, failed launches, and image inventory.
- Add container log viewer and downloadable support bundles.
- Add per-session notes and tags for support/admin workflows.

### Add-ons

- Add Apache Guacamole as an optional gateway mode for VNC/RDP/SSH.
- Add file transfer add-on with admin policy controls.
- Add clipboard policy controls for noVNC sessions.

### Optimization

- Add CPU/memory telemetry per session and display it in VM management.
- Tune XFCE/noVNC defaults for bandwidth, resolution, and reconnect behavior.
- Add optional WebP/JPEG noVNC compression presets per profile.

### Security

- Add isolated Docker networks per session or per tenant.
- Add DNS controls and outbound proxy integration.
- Add vulnerability scanning for desktop images in CI.
- Add SBOM generation for host app and desktop images.

## Month 4: Scale-out and persistence

### Robustness

- Add a scheduler abstraction so sessions can run on more than one Linux host.
- Add host registration, heartbeats, and draining mode for maintenance.
- Add retry/backoff rules for session placement failures.

### Features

- Add persistent workspace volumes with quota enforcement.
- Add volume snapshot, restore, and delete controls.
- Add image/template assignment per user or group.
- Add scheduled session expiration warnings and user-visible countdowns.

### Add-ons

- Add developer workstation templates with VS Code, Git, Docker CLI, and language runtimes.
- Add browser kiosk templates with managed policies.
- Add support-tool templates with SSH clients, RDP clients, terminal tools, and documentation shortcuts.

### Optimization

- Add node-level image pre-pull and cache warming.
- Add bin-packing by available CPU and memory.
- Add idle detection and automatic suspend/terminate policies.

### Security

- Add rootless Docker support documentation and validation.
- Evaluate gVisor, Kata Containers, or Firecracker-backed launchers for higher-risk workloads.
- Add per-template capability, seccomp, AppArmor, and mount policies.
- Add admin approval workflow for privileged templates.

## Month 5: Enterprise controls and extensibility

### Robustness

- Add backup/restore tooling for database, settings, templates, and persistent volumes.
- Add migration tooling for schema and settings changes.
- Add disaster recovery documentation and restore validation.

### Features

- Add policy engine for who can launch which templates, from which networks, and for how long.
- Add notification hooks for Slack, Teams, email, and webhooks.
- Add API tokens for automation with scoped permissions.
- Add import/export for templates and settings.

### Add-ons

- Add marketplace-style add-on manifest support for templates, sidecars, and integrations.
- Add optional malware scanning for uploaded/downloaded files.
- Add browser recording or screenshot audit add-on with explicit policy controls.

### Optimization

- Add load testing targets for API throughput and session launch concurrency.
- Add noVNC latency tests and browser performance budgets.
- Add image package pruning and multi-stage build improvements.

### Security

- Add tenant isolation model with separate networks, quotas, templates, and audit views.
- Add secrets rotation for session credentials and API tokens.
- Add configurable password policy and optional MFA for local accounts.
- Add compliance-oriented audit export formats.

## Month 6: Hardening, polish, and release readiness

### Robustness

- Run failure drills for Docker outages, disk exhaustion, host reboots, and network failures.
- Add end-to-end tests for login, session creation, noVNC availability, SSH/RDP reachability, and cleanup.
- Add release checklist, changelog process, semantic versioning, and upgrade notes.

### Features

- Add guided setup wizard for admin account, Docker checks, TLS hints, first template, and validation.
- Add polished admin dashboards with filters, search, pagination, and bulk actions.
- Add user-facing session portal separate from admin operations.

### Add-ons

- Publish supported template packs and add-on examples.
- Add documented plugin points for launchers, auth providers, storage providers, and telemetry exporters.

### Optimization

- Tune default resource profiles from real validation data.
- Add autoscaling guidance for multi-host deployments.
- Add cost/resource reporting by user, group, template, and host.

### Security

- Complete external security review and threat model update.
- Add hardening benchmark documentation for Linux hosts.
- Add production TLS/reverse-proxy examples.
- Freeze production defaults: no default passwords, least-privilege containers, restricted egress, audit logging enabled, and validation required before deployment.

## Cross-cutting success metrics

- **Reliability**: 95%+ successful session launch rate in validation and staging.
- **Performance**: common templates start in under 20 seconds on a warmed host.
- **Security**: no fixed session credentials, audit logs for all privileged actions, and passing image vulnerability gates.
- **Operations**: admins can identify unhealthy hosts, failing sockets, and stuck sessions from the console.
- **Extensibility**: at least three supported desktop templates and one documented add-on integration.
