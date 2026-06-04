const loginPanel = document.querySelector('#login-panel');
const consolePanel = document.querySelector('#console');
const loginForm = document.querySelector('#login-form');
const logoutButton = document.querySelector('#logout');
const startButton = document.querySelector('#start');
const sessionsElement = document.querySelector('#sessions');
const viewer = document.querySelector('.viewer');
const frame = document.querySelector('#novnc');
const closeViewer = document.querySelector('#close-viewer');
const healthCards = document.querySelector('#health-cards');
const hostStats = document.querySelector('#host-stats');
const remoteStats = document.querySelector('#remote-stats');
const usersList = document.querySelector('#users-list');
const userForm = document.querySelector('#user-form');
const settingsForm = document.querySelector('#settings-form');

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(loginForm);
  await api('/api/login', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(form)),
  });
  await bootConsole();
});

logoutButton.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  consolePanel.hidden = true;
  loginPanel.hidden = false;
});

for (const tab of document.querySelectorAll('[data-tab]')) {
  tab.addEventListener('click', () => showTab(tab.dataset.tab));
}

document.querySelector('#refresh-health').addEventListener('click', renderHealth);
document.querySelector('#refresh-stats').addEventListener('click', renderHostStats);

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  startButton.textContent = 'Starting...';

  try {
    const result = await api('/api/vms', { method: 'POST' });
    await renderSessions();
    openViewer(result.urls.browserVnc);
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Start Linux Desktop';
  }
});

closeViewer.addEventListener('click', () => {
  frame.src = 'about:blank';
  viewer.hidden = true;
});

userForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(userForm);
  await api('/api/users', {
    method: 'POST',
    body: JSON.stringify(Object.fromEntries(form)),
  });
  userForm.reset();
  await renderUsers();
});

settingsForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(settingsForm);
  await api('/api/settings', {
    method: 'PUT',
    body: JSON.stringify({
      banner: form.get('banner'),
      maxSessionsPerUser: Number(form.get('maxSessionsPerUser')),
      defaultSessionTtlMinutes: Number(form.get('defaultSessionTtlMinutes')),
      allowSsh: form.get('allowSsh') === 'on',
      allowRdp: form.get('allowRdp') === 'on',
    }),
  });
  await renderSettings();
});

async function bootConsole() {
  loginPanel.hidden = true;
  consolePanel.hidden = false;
  showTab('dashboard');
  await Promise.all([renderHealth(), renderSessions(), renderHostStats(), renderUsers(), renderSettings()]);
}

function showTab(name) {
  for (const panel of document.querySelectorAll('[data-panel]')) {
    panel.hidden = panel.dataset.panel !== name;
  }
}

async function renderHealth() {
  const [app, sockets] = await Promise.all([api('/api/app-health'), api('/api/socket-health')]);
  healthCards.innerHTML = card('App health', [
    `Status: ${app.ok ? 'healthy' : 'degraded'}`,
    `Docker: ${app.docker.ok ? app.docker.version : app.docker.error}`,
    `Active VMs: ${app.activeSessions}`,
    `Uptime: ${formatDuration(app.uptimeSeconds)}`,
  ]) + card('Socket health', sockets.sockets.length
    ? sockets.sockets.flatMap((socket) => [`${socket.name}: noVNC ${socket.novnc.state}, SSH ${socket.ssh.state}, RDP ${socket.rdp.state}`])
    : ['No active sockets']);
}

async function renderSessions() {
  const { sessions } = await api('/api/vms');
  sessionsElement.innerHTML = sessions.length ? '' : '<p class="empty">No active VMs.</p>';

  for (const session of sessions) {
    const details = await api(`/api/vms/${session.id}`);
    sessionsElement.appendChild(sessionCard(details.session, details.urls));
  }
}

async function renderHostStats() {
  const stats = await api('/api/linux/stats');
  hostStats.innerHTML = card('CPU', [
    `${stats.cpu.cores} cores`,
    stats.cpu.model,
    `Load: ${stats.cpu.loadAverage.map((value) => value.toFixed(2)).join(', ')}`,
  ]) + card('Memory', [
    `${formatBytes(stats.memory.usedBytes)} / ${formatBytes(stats.memory.totalBytes)}`,
    `${stats.memory.usedPercent}% used`,
  ]) + card('Disk /', [
    `${formatBytes(stats.disk.usedBytes)} / ${formatBytes(stats.disk.totalBytes)}`,
    `${stats.disk.usedPercent}% used`,
  ]) + card('Remote host', [
    `${stats.hostname} (${stats.platform}/${stats.arch})`,
    `Host uptime: ${formatDuration(stats.uptimeSeconds)}`,
    `Active VMs: ${stats.sessions.active}`,
  ]);
  remoteStats.innerHTML = `Host: ${stats.hostname} · CPU load ${stats.cpu.loadAverage[0].toFixed(2)} · RAM ${stats.memory.usedPercent}% · Disk ${stats.disk.usedPercent}%`;
}

async function renderUsers() {
  const { users } = await api('/api/users');
  usersList.innerHTML = '';
  for (const user of users) {
    const row = document.createElement('article');
    row.className = 'session-card';
    row.innerHTML = `<div><h3>${user.username}</h3><p>Role: ${user.role}</p><p>Status: ${user.enabled ? 'enabled' : 'disabled'}</p></div>`;
    const button = document.createElement('button');
    button.className = 'danger';
    button.textContent = 'Delete';
    button.addEventListener('click', async () => {
      await api(`/api/users/${encodeURIComponent(user.username)}`, { method: 'DELETE' });
      await renderUsers();
    });
    row.appendChild(button);
    usersList.appendChild(row);
  }
}

async function renderSettings() {
  const { settings } = await api('/api/settings');
  settingsForm.banner.value = settings.banner;
  settingsForm.maxSessionsPerUser.value = settings.maxSessionsPerUser;
  settingsForm.defaultSessionTtlMinutes.value = settings.defaultSessionTtlMinutes;
  settingsForm.allowSsh.checked = settings.allowSsh;
  settingsForm.allowRdp.checked = settings.allowRdp;
}

function sessionCard(session, urls) {
  const cardElement = document.createElement('article');
  cardElement.className = 'session-card';
  cardElement.innerHTML = `
    <div>
      <h3>${session.name}</h3>
      <p>Status: <strong>${session.status}</strong></p>
      <p>Expires: ${new Date(session.expiresAt).toLocaleString()}</p>
      <code>${urls.ssh || 'SSH pending'}</code>
      <code>RDP: ${urls.rdp || 'pending'}</code>
    </div>
    <div class="actions">
      <button data-open>Open noVNC</button>
      <button data-stop class="danger">Stop</button>
    </div>
  `;

  cardElement.querySelector('[data-open]').addEventListener('click', () => openViewer(urls.browserVnc));
  cardElement.querySelector('[data-stop]').addEventListener('click', async () => {
    await api(`/api/vms/${session.id}`, { method: 'DELETE' });
    await renderSessions();
    await renderHealth();
  });

  return cardElement;
}

function openViewer(url) {
  viewer.hidden = false;
  frame.src = url;
  renderHostStats();
  viewer.scrollIntoView({ behavior: 'smooth' });
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  if (response.status === 204) return null;
  return response.json();
}

function card(title, lines) {
  return `<article class="stat-card"><h3>${title}</h3>${lines.map((line) => `<p>${line}</p>`).join('')}</article>`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return 'n/a';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(1)} ${units[index]}`;
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

api('/api/me').then(bootConsole).catch(() => {
  loginPanel.hidden = false;
  consolePanel.hidden = true;
});
