# Management Console

The web console is intentionally small, but it now includes the main control surfaces expected from an early Kasm/Guacamole-style host.

## Login

The first boot creates an admin user from `LCVA_ADMIN_USERNAME` and `LCVA_ADMIN_PASSWORD`. Set both variables before deploying. If you do not set them, the service creates `admin` / `admin` and prints a warning.

## Settings

Admins can edit basic service settings from the Settings tab. The settings are stored in `data/settings.json` so they survive server restarts.

## User management

Admins can create and delete local users. Users are stored in `data/users.json` with PBKDF2 password hashes. Roles are scaffolded as `admin`, `operator`, and `viewer` so authorization can be expanded later.

## Linux management

The Linux Management tab shows local host stats while you are remotely connected to a desktop session:

- CPU core count, model, and load averages.
- Memory used/free values.
- Root filesystem disk usage.
- Host uptime and active session count.

## VM management

The VM Management tab lists disposable Linux desktop containers, starts new sessions, opens noVNC, and stops sessions. The API aliases `/api/vms` to the existing session lifecycle so the UI can use VM language while the runtime remains container-backed.

## Socket and app health

The Dashboard tab reports application uptime, Docker availability, active VM count, and published socket state for noVNC, SSH, and RDP ports.
