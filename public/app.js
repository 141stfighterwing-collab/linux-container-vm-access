const startButton = document.querySelector('#start');
const refreshButton = document.querySelector('#refresh');
const sessionsElement = document.querySelector('#sessions');
const viewer = document.querySelector('.viewer');
const frame = document.querySelector('#novnc');
const closeViewer = document.querySelector('#close-viewer');

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  startButton.textContent = 'Starting...';

  try {
    const result = await api('/api/sessions', { method: 'POST' });
    await renderSessions();
    openViewer(result.urls.browserVnc);
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Start Linux Desktop';
  }
});

refreshButton.addEventListener('click', renderSessions);
closeViewer.addEventListener('click', () => {
  frame.src = 'about:blank';
  viewer.hidden = true;
});

async function renderSessions() {
  const { sessions } = await api('/api/sessions');

  sessionsElement.innerHTML = sessions.length ? '' : '<p class="empty">No active sessions.</p>';
  for (const session of sessions) {
    const details = await api(`/api/sessions/${session.id}`);
    sessionsElement.appendChild(sessionCard(details.session, details.urls));
  }
}

function sessionCard(session, urls) {
  const card = document.createElement('article');
  card.className = 'session-card';
  card.innerHTML = `
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

  card.querySelector('[data-open]').addEventListener('click', () => openViewer(urls.browserVnc));
  card.querySelector('[data-stop]').addEventListener('click', async () => {
    await api(`/api/sessions/${session.id}`, { method: 'DELETE' });
    await renderSessions();
  });

  return card;
}

function openViewer(url) {
  viewer.hidden = false;
  frame.src = url;
  viewer.scrollIntoView({ behavior: 'smooth' });
}

async function api(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || response.statusText);
  }

  if (response.status === 204) return null;
  return response.json();
}

renderSessions().catch((error) => {
  sessionsElement.innerHTML = `<p class="empty">${error.message}</p>`;
});
