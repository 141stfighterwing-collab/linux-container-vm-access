# Validation

Use these checks while iterating on LCVA. The validation scripts are designed to prove both the host API and the desktop container are wired correctly.

## Host API validation

```bash
npm run validate:api
```

This starts the Node host service on a temporary port with a temporary `LCVA_DATA_DIR`, then validates:

- Public health endpoint responds.
- Unauthenticated requests are rejected.
- Admin login succeeds.
- App health, socket health, and Linux stats endpoints return expected JSON.
- User creation/listing works.
- Settings updates persist for the running service.
- Logout succeeds.

## Desktop container validation

```bash
npm run validate:container
```

When Docker is installed, this script builds `images/desktop`, runs a disposable validation container, waits for the Docker healthcheck, and verifies:

- noVNC HTTP responds on the generated host port.
- SSH, RDP, and noVNC ports accept TCP connections.
- Supervisor reports `sshd`, `vnc`, `novnc`, and `xrdp` as `RUNNING`.

If Docker is not installed, the script exits successfully with a warning so non-Docker CI can still run `npm run validate`. Set `LCVA_REQUIRE_DOCKER=1` to make missing Docker a failure.

## Full validation

```bash
npm run validate
```

This runs syntax checks, smoke checks, host API validation, and container validation.
