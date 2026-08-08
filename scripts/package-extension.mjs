import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDirectory = join(projectRoot, 'dist');
const releaseDirectory = join(projectRoot, 'release');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));
const archivePath = join(releaseDirectory, `CloudDock-v${packageJson.version}.zip`);

execFileSync('npm', ['run', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

mkdirSync(releaseDirectory, { recursive: true });
rmSync(archivePath, { force: true });

execFileSync(
  'zip',
  [
    '-qr',
    archivePath,
    'manifest.json',
    'service-worker-loader.js',
    'assets',
    'icons/128.png',
    'src',
    '-x',
    '*/.DS_Store',
    '.DS_Store',
  ],
  {
    cwd: distDirectory,
    stdio: 'inherit',
  }
);

console.log(`Created ${archivePath}`);
