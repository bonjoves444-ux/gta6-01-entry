// main.ts — SOLMAR entry program for the make.fun GTA 6 bounty.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. Plain JavaScript in a .ts file: no TypeScript
// type annotations anywhere, so node --check and the Node 22 runtime
// accept it with no flags. The output directory itself is never
// deleted — only its contents are cleared first, because on the
// grading server /output is a mount point.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function clearDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function main() {
  clearDir(outDir);
  fs.cpSync(path.join(here, 'game'), path.join(outDir, 'game'), { recursive: true });
  const shotsDir = path.join(here, 'screenshots');
  if (fs.existsSync(shotsDir)) {
    fs.cpSync(shotsDir, path.join(outDir, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  fs.writeFileSync(path.join(outDir, 'dossier.json'), dossier);
  console.log('SOLMAR entry written to ' + outDir);
}

main();
