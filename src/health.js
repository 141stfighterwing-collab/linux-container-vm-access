import { execFile } from 'node:child_process';
import { Socket } from 'node:net';
import { cpus, freemem, loadavg, totalmem, uptime } from 'node:os';
import { promisify } from 'node:util';
import { listDesktopSessions } from './docker.js';

const exec = promisify(execFile);
const startedAt = new Date();

export async function appHealth() {
  const [docker, sessions] = await Promise.all([
    commandHealth('docker', ['version', '--format', '{{.Server.Version}}']),
    listDesktopSessions().catch(() => []),
  ]);

  return {
    ok: docker.ok,
    service: 'linux-container-vm-access',
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    docker,
    activeSessions: sessions.length,
  };
}

export async function hostStats() {
  const [disk, sessions] = await Promise.all([
    diskStats(),
    listDesktopSessions().catch(() => []),
  ]);
  const totalMemory = totalmem();
  const freeMemory = freemem();

  return {
    hostname: process.env.HOSTNAME || 'localhost',
    platform: process.platform,
    arch: process.arch,
    uptimeSeconds: uptime(),
    cpu: {
      cores: cpus().length,
      model: cpus()[0]?.model || 'unknown',
      loadAverage: loadavg(),
    },
    memory: {
      totalBytes: totalMemory,
      freeBytes: freeMemory,
      usedBytes: totalMemory - freeMemory,
      usedPercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
    },
    disk,
    sessions: {
      active: sessions.length,
      items: sessions,
    },
  };
}

export async function socketHealth() {
  const sessions = await listDesktopSessions().catch(() => []);
  const sockets = await Promise.all(sessions.map(async (session) => ({
    sessionId: session.id,
    name: session.name,
    novnc: await portState(session.ports.novnc),
    ssh: await portState(session.ports.ssh),
    rdp: await portState(session.ports.rdp),
  })));

  return {
    checkedAt: new Date().toISOString(),
    sockets,
  };
}

async function diskStats() {
  try {
    const { stdout } = await exec('df', ['-kP', '/']);
    const [, line] = stdout.trim().split('\n');
    const [filesystem, blocks, used, available, capacity, mountedOn] = line.split(/\s+/);
    return {
      filesystem,
      mountedOn,
      totalBytes: Number(blocks) * 1024,
      usedBytes: Number(used) * 1024,
      freeBytes: Number(available) * 1024,
      usedPercent: Number(capacity.replace('%', '')),
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function commandHealth(command, args) {
  try {
    const { stdout } = await exec(command, args, { timeout: 3000 });
    return { ok: true, version: stdout.trim() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

async function portState(port) {
  if (!port) return { port, state: 'missing' };
  const open = await canConnect(port);
  return {
    port,
    state: open ? 'open' : 'published-unreachable',
  };
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = new Socket();
    socket.setTimeout(750);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, '127.0.0.1');
  });
}
