// Builds the downloadable release archives in RELEASES/ (needs the `zip` command).
//   node tools/package-release.mjs
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const out = join(root, 'RELEASES');
mkdirSync(out, { recursive: true });
const name = `Project-Grim-${version}`;
const exclude = ['.git/*', 'node_modules/*', '*/node_modules/*', 'qa-reports/*', 'RELEASES/*', 'assets/music/*/*.mp3', 'assets/music/*/*.ogg', 'assets/music/*/*.wav', 'assets/music/*/*.flac', '*.DS_Store', '.env*'];
const build = (file, extra = []) => {
  rmSync(join(out, file), { force: true });
  execFileSync('zip', ['-r', '-q', '-X', join(out, file), '.', '-x', ...exclude, ...extra], { cwd: root, stdio: 'inherit' });
  console.log(`${file}  ${(statSync(join(out, file)).size / 1048576).toFixed(1)} MB`);
};
build(`${name}.zip`);
build(`${name}-website-only.zip`, ['assets/audio/*']);
