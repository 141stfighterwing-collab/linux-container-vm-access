import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clearSessionCookie,
  createUser,
  deleteUser,
  ensureAdminUser,
  getSessionUser,
  listUsers,
  login,
  logout,
  setSessionCookie,
  updateUser,
} from './auth.js';
import { config } from './config.js';
import {
  createDesktopSession,
  getDesktopSession,
  listDesktopSessions,
  reapExpiredSessions,
  stopDesktopSession,
} from './docker.js';
import { appHealth, hostStats, socketHealth } from './health.js';
import { readSettings, writeSettings } from './state.js';

const publicDir = fileURLToPath(new URL('../public', import.meta.url));

await ensureAdminUser();
if (config.adminPassword === 'admin') {
  console.warn('LCVA_ADMIN_PASSWORD is using the insecure default. Change it before exposing this service.');
}

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    console.error(error);
    json(response, error.statusCode || 500, { error: error.message || 'Unexpected server error' });
  }
});

server.listen(config.port, () => {
  console.log(`LCVA host server listening on http://0.0.0.0:${config.port}`);
});

setInterval(() => {
  reapExpiredSessions().catch((error) => console.error('session reaper failed', error));
}, 60_000).unref();

async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && url.pathname === '/api/health') {
    json(response, 200, await appHealth());
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/login') {
    const body = await readBody(request);
    const result = await login(body.username, body.password);
    if (!result) {
      json(response, 401, { error: 'Invalid username or password' });
      return;
    }

    setSessionCookie(response, result.token);
    json(response, 200, { user: result.user, expiresAt: result.expiresAt });
    return;
  }

  const user = await getSessionUser(request);

  if (request.method === 'GET' && url.pathname === '/api/me') {
    json(response, user ? 200 : 401, user ? { user } : { error: 'Not authenticated' });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/logout') {
    logout(request);
    clearSessionCookie(response);
    json(response, 200, { ok: true });
    return;
  }

  if (url.pathname.startsWith('/api/') && !user) {
    json(response, 401, { error: 'Login required' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/app-health') {
    json(response, 200, await appHealth());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/socket-health') {
    json(response, 200, await socketHealth());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/linux/stats') {
    json(response, 200, await hostStats());
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/settings') {
    json(response, 200, { settings: await readSettings() });
    return;
  }

  if (request.method === 'PUT' && url.pathname === '/api/settings') {
    requireAdmin(user);
    const settings = await readBody(request);
    await writeSettings(settings);
    json(response, 200, { settings: await readSettings() });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    requireAdmin(user);
    json(response, 200, { users: await listUsers() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/users') {
    requireAdmin(user);
    json(response, 201, { user: await createUser(await readBody(request)) });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'users' && parts[2]) {
    requireAdmin(user);
    const username = decodeURIComponent(parts[2]);

    if (request.method === 'PUT') {
      json(response, 200, { user: await updateUser(username, await readBody(request)) });
      return;
    }

    if (request.method === 'DELETE') {
      await deleteUser(username);
      response.writeHead(204).end();
      return;
    }
  }

  if (request.method === 'GET' && (url.pathname === '/api/sessions' || url.pathname === '/api/vms')) {
    json(response, 200, { sessions: await listDesktopSessions() });
    return;
  }

  if (request.method === 'POST' && (url.pathname === '/api/sessions' || url.pathname === '/api/vms')) {
    const session = await createDesktopSession();
    json(response, 201, { session, urls: sessionUrls(request, session) });
    return;
  }

  if (parts[0] === 'api' && (parts[1] === 'sessions' || parts[1] === 'vms') && parts[2]) {
    const sessionId = parts[2];

    if (request.method === 'GET') {
      const session = await getDesktopSession(sessionId);
      if (!session) {
        json(response, 404, { error: 'Session not found' });
        return;
      }

      json(response, 200, { session, urls: sessionUrls(request, session) });
      return;
    }

    if (request.method === 'DELETE') {
      await stopDesktopSession(sessionId);
      response.writeHead(204).end();
      return;
    }
  }

  await staticFile(url.pathname, response);
}

async function staticFile(pathname, response) {
  const safePath = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = join(publicDir, safePath);

  try {
    await readFile(filePath);
  } catch {
    json(response, 404, { error: 'Not found' });
    return;
  }

  response.writeHead(200, { 'Content-Type': contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

function sessionUrls(request, session) {
  const host = (request.headers.host || `127.0.0.1:${config.port}`).split(':')[0];
  const browserVnc = session.ports.novnc
    ? `http://${host}:${session.ports.novnc}/vnc.html?autoconnect=1&resize=scale&password=lcva`
    : null;

  return {
    browserVnc,
    ssh: session.ports.ssh ? `ssh lcva@${host} -p ${session.ports.ssh}` : null,
    rdp: session.ports.rdp ? `${host}:${session.ports.rdp}` : null,
  };
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function requireAdmin(user) {
  if (user?.role !== 'admin') {
    const error = new Error('Admin role required');
    error.statusCode = 403;
    throw error;
  }
}

function json(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
}

function contentType(filePath) {
  const types = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
  };

  return types[extname(filePath)] || 'application/octet-stream';
}
