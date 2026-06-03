FROM debian:12-slim

ENV DEBIAN_FRONTEND=noninteractive \
    DISPLAY=:1 \
    USER=lcva \
    VNC_PASSWORD=lcva

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
      dbus-x11 \
      firefox-esr \
      mousepad \
      net-tools \
      novnc \
      openssh-server \
      procps \
      supervisor \
      tigervnc-standalone-server \
      tigervnc-tools \
      websockify \
      x11-xserver-utils \
      xfce4 \
      xfce4-terminal \
      xrdp \
    && useradd --create-home --shell /bin/bash "$USER" \
    && echo "$USER:$VNC_PASSWORD" | chpasswd \
    && adduser "$USER" ssl-cert \
    && mkdir -p /var/run/sshd /home/$USER/.vnc /var/log/supervisor \
    && printf '%s\n' "$VNC_PASSWORD" "$VNC_PASSWORD" n | vncpasswd /home/$USER/.vnc/passwd \
    && chown -R "$USER:$USER" /home/$USER/.vnc \
    && chmod 600 /home/$USER/.vnc/passwd \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY rootfs/supervisor/lcva.conf /etc/supervisor/conf.d/lcva.conf
COPY rootfs/start-vnc.sh /usr/local/bin/start-vnc.sh
COPY rootfs/start-novnc.sh /usr/local/bin/start-novnc.sh
COPY rootfs/start-xrdp.sh /usr/local/bin/start-xrdp.sh

RUN chmod +x /usr/local/bin/start-vnc.sh /usr/local/bin/start-novnc.sh /usr/local/bin/start-xrdp.sh

EXPOSE 22 3389 6080

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
