import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const dataDir = join(rootDir, 'data');
const usersPath = join(dataDir, 'users.json');
const settingsPath = join(dataDir, 'settings.json');

const defaultSettings = {
  registrationOpen: false,
  maxSessionsPerUser: 2,
  defaultSessionTtlMinutes: 120,
  allowRdp: true,
  allowSsh: true,
  banner: 'Linux Container VM Access admin console',
};

export async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    await mkdir(dirname(filePath), { recursive: true });
    await writeJson(filePath, fallback);
    return structuredClone(fallback);
  }
}

export async function writeJson(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readUsers() {
  return readJson(usersPath, []);
}

export async function writeUsers(users) {
  await writeJson(usersPath, users);
}

export async function readSettings() {
  return readJson(settingsPath, defaultSettings);
}

export async function writeSettings(settings) {
  await writeJson(settingsPath, { ...defaultSettings, ...settings });
}

export function publicUser(user) {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}
