import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { config } from './config.js';

const exec = promisify(execFile);
const LABEL_OWNER = 'lcva.session';

export async function createDesktopSession() {
  const id = randomUUID().slice(0, 12);
  const expiresAt = new Date(Date.now() + config.sessionTtlMinutes * 60 * 1000);
  const name = `lcva-${id}`;

  await docker([
    'run',
    '-d',
    '--rm',
    '--name', name,
    '--network', config.dockerNetwork,
    '--memory', config.containerMemory,
    '--cpus', String(config.containerCpus),
    '--pids-limit', '512',
    '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges:true',
    '--tmpfs', '/tmp:rw,nosuid,nodev,size=512m',
    '-p', '22',
    '-p', '3389',
    '-p', '6080',
    '--label', `${LABEL_OWNER}=true`,
    '--label', `lcva.session.id=${id}`,
    '--label', `lcva.session.expires_at=${expiresAt.toISOString()}`,
    '-e', 'DISPLAY=:1',
    '-e', 'VNC_PASSWORD=lcva',
    '-e', `LCVA_SESSION_ID=${id}`,
    config.image,
  ]);

  return getDesktopSession(id);
}

export async function listDesktopSessions() {
  const { stdout } = await docker([
    'ps',
    '--filter', `label=${LABEL_OWNER}=true`,
    '--format', '{{.ID}}',
  ]);

  const ids = stdout.trim().split('\n').filter(Boolean);
  return Promise.all(ids.map(inspectContainer));
}

export async function getDesktopSession(id) {
  const { stdout } = await docker([
    'ps',
    '--filter', `label=lcva.session.id=${id}`,
    '--format', '{{.ID}}',
  ]);

  const containerId = stdout.trim().split('\n').find(Boolean);
  return containerId ? inspectContainer(containerId) : null;
}

export async function stopDesktopSession(id) {
  const session = await getDesktopSession(id);
  if (!session) return;
  await docker(['stop', '--time', '10', session.containerId]);
}

export async function reapExpiredSessions() {
  const sessions = await listDesktopSessions();
  const now = Date.now();

  await Promise.all(sessions
    .filter((session) => new Date(session.expiresAt).getTime() <= now)
    .map((session) => stopDesktopSession(session.id)));
}

async function inspectContainer(containerId) {
  const { stdout } = await docker(['inspect', containerId]);
  const [info] = JSON.parse(stdout);
  return normalizeSession(info);
}

export function normalizeSession(containerInfo) {
  const labels = containerInfo.Config?.Labels || {};

  return {
    id: labels['lcva.session.id'],
    containerId: containerInfo.Id,
    name: containerInfo.Name.replace(/^\//, ''),
    image: containerInfo.Config?.Image,
    status: containerInfo.State?.Status || 'unknown',
    createdAt: containerInfo.Created,
    expiresAt: labels['lcva.session.expires_at'],
    ports: {
      ssh: parsePort(containerInfo, 22),
      rdp: parsePort(containerInfo, 3389),
      novnc: parsePort(containerInfo, 6080),
    },
  };
}

function parsePort(containerInfo, privatePort) {
  const bindings = containerInfo.NetworkSettings?.Ports?.[`${privatePort}/tcp`];
  return bindings?.[0]?.HostPort ? Number(bindings[0].HostPort) : null;
}

async function docker(args) {
  return exec('docker', args, { maxBuffer: 1024 * 1024 * 10 });
}
