// main.ts — SOLMAR entry program for make.fun gta6-01.
// Copies game/ and screenshots/ from this repository into the output directory
// and writes dossier.json there with buildDossier from vendor/makefun-game.ts.
// The output directory is $MAKEFUN_OUTPUT_DIR, defaulting to /output; the
// program never deletes the output directory itself, it only writes into it.
import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

await mkdir(outputDir, { recursive: true });
await mkdir(join(outputDir, "game"), { recursive: true });
await mkdir(join(outputDir, "screenshots"), { recursive: true });

await cp(join(repoRoot, "game"), join(outputDir, "game"), { recursive: true });
await cp(join(repoRoot, "screenshots"), join(outputDir, "screenshots"), { recursive: true });

const dossier = await buildDossier(repoRoot, { text_max_bytes: 163840 });
await writeFile(join(outputDir, "dossier.json"), dossier);

console.log("SOLMAR entry written to " + outputDir);
console.log("dossier.json bytes: " + dossier.length);
