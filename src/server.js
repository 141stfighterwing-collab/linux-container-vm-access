import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import {
  createDesktopSession,
  getDesktopSession,
  listDesktopSessions,
  reapExpiredSessions,
  stopDesktopSession,
} from './docker.js';

const publicDir = fileURLToPath(new URL('../public', import.meta.url));

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    console.error(error);
    json(response, 500, { error: error.message || 'Unexpected server error' });
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
    json(response, 200, { ok: true, service: 'linux-container-vm-access' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/sessions') {
    json(response, 200, { sessions: await listDesktopSessions() });
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/sessions') {
    const session = await createDesktopSession();
    json(response, 201, { session, urls: sessionUrls(request, session) });
    return;
  }

  if (parts[0] === 'api' && parts[1] === 'sessions' && parts[2]) {
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
