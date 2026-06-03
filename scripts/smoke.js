import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/server.js',
  'src/docker.js',
  'src/auth.js',
  'src/health.js',
  'src/state.js',
  'public/index.html',
  'images/desktop/Dockerfile',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/ROADMAP.md',
  'docs/VALIDATION.md',
  'scripts/validate-api.sh',
  'scripts/validate-container.sh',
  'images/desktop/rootfs/xstartup',
  'images/desktop/rootfs/xsession',
];

for (const file of requiredFiles) {
  const contents = await readFile(file, 'utf8');
  if (!contents.trim()) {
    throw new Error(`${file} is empty`);
  }
}

console.log(`Smoke check passed for ${requiredFiles.length} project files.`);
