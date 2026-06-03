# Roadmap

## MVP

- [x] Host web server.
- [x] Docker-backed session launcher.
- [x] Browser UI.
- [x] noVNC WebSocket proxy.
- [x] SSH and RDP host port publication.
- [x] Disposable XFCE desktop image.

## Next milestones

1. **Authentication**: local admin account, OIDC/SAML support, user-specific sessions.
2. **Session secrets**: generated VNC/RDP/SSH credentials per session.
3. **Persistence**: optional bind-mounted home directories or volume snapshots.
4. **Templates**: multiple desktop images with different software bundles.
5. **Admin panel**: active sessions, resource usage, force-stop, audit events.
6. **Networking**: isolated per-session networks and outbound allow/deny policies.
7. **Scale-out**: queue sessions and schedule them across multiple Linux hosts.
8. **Observability**: Prometheus metrics, structured logs, health checks.
9. **Guacamole mode**: add Apache Guacamole as an alternate RDP/VNC/SSH gateway.
