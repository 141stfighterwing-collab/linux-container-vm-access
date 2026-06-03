import { readFile } from 'node:fs/promises';

const requiredFiles = [
  'src/server.js',
  'src/docker.js',
  'public/index.html',
  'images/desktop/Dockerfile',
  'docs/ARCHITECTURE.md',
  'docs/SECURITY.md',
  'docs/ROADMAP.md',
];

for (const file of requiredFiles) {
  const contents = await readFile(file, 'utf8');
  if (!contents.trim()) {
    throw new Error(`${file} is empty`);
  }
}

console.log(`Smoke check passed for ${requiredFiles.length} project files.`);
