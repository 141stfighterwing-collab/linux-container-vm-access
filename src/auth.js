import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { publicUser, readUsers, writeUsers } from './state.js';

const sessions = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function ensureAdminUser() {
  const users = await readUsers();
  if (users.length) return;

  users.push(newUser({
    username: config.adminUsername,
    password: config.adminPassword,
    role: 'admin',
    enabled: true,
  }));
  await writeUsers(users);
}

export async function login(username, password) {
  await ensureAdminUser();
  const users = await readUsers();
  const user = users.find((entry) => entry.username === username && entry.enabled !== false);

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return null;
  }

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  sessions.set(token, { username: user.username, role: user.role, expiresAt });
  return { token, user: publicUser(user), expiresAt };
}

export async function getSessionUser(request) {
  const token = cookieValue(request.headers.cookie || '', 'lcva_session');
  if (!token) return null;

  const session = sessions.get(token);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  const users = await readUsers();
  const user = users.find((entry) => entry.username === session.username && entry.enabled !== false);
  return user ? publicUser(user) : null;
}

export function logout(request) {
  const token = cookieValue(request.headers.cookie || '', 'lcva_session');
  if (token) sessions.delete(token);
}

export async function listUsers() {
  await ensureAdminUser();
  return (await readUsers()).map(publicUser);
}

export async function createUser({ username, password, role = 'operator', enabled = true }) {
  if (!username || !password) throw new Error('Username and password are required');
  if (!['admin', 'operator', 'viewer'].includes(role)) throw new Error('Invalid role');

  const users = await readUsers();
  if (users.some((entry) => entry.username === username)) throw new Error('User already exists');

  const user = newUser({ username, password, role, enabled });
  users.push(user);
  await writeUsers(users);
  return publicUser(user);
}

export async function updateUser(username, patch) {
  const users = await readUsers();
  const user = users.find((entry) => entry.username === username);
  if (!user) throw new Error('User not found');

  if (patch.role && ['admin', 'operator', 'viewer'].includes(patch.role)) user.role = patch.role;
  if (typeof patch.enabled === 'boolean') user.enabled = patch.enabled;
  if (patch.password) {
    const password = hashPassword(patch.password);
    user.passwordSalt = password.salt;
    user.passwordHash = password.hash;
  }
  user.updatedAt = new Date().toISOString();

  await writeUsers(users);
  return publicUser(user);
}

export async function deleteUser(username) {
  const users = await readUsers();
  if (users.length === 1) throw new Error('Cannot delete the last user');
  await writeUsers(users.filter((entry) => entry.username !== username));
}

export function setSessionCookie(response, token) {
  response.setHeader('Set-Cookie', `lcva_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
}

export function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', 'lcva_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
}

function newUser({ username, password, role, enabled }) {
  const passwordParts = hashPassword(password);
  const now = new Date().toISOString();
  return {
    id: randomBytes(12).toString('hex'),
    username,
    role,
    enabled,
    createdAt: now,
    updatedAt: now,
    passwordSalt: passwordParts.salt,
    passwordHash: passwordParts.hash,
  };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const hash = pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === hash.length && timingSafeEqual(hash, expected);
}

function cookieValue(cookieHeader, name) {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
