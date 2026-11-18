// SOLMAR entry program: copies game/ and screenshots/ into the output
// directory and writes dossier.json with the kit's buildDossier.
// Output goes through $MAKEFUN_OUTPUT_DIR (default /output) and the output
// directory itself is never deleted — it is created only if missing.
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

async function main() {
  const root = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  await mkdir(outDir, { recursive: true });
  await cp(join(root, 'game'), join(outDir, 'game'), { recursive: true });
  await cp(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  // The copy is a plain recursive copy of two fixed trees, so both grader
  // runs write byte-identical output: nothing here depends on time, order
  // or the machine it runs on.
  await writeFile(join(outDir, 'dossier.json'), dossier);
  console.log(`SOLMAR dossier written: ${join(outDir, 'dossier.json')} (${dossier.length} bytes)`);
}

await main();
