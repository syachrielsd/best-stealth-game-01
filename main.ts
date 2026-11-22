// main.ts — the entrypoint for "The Last Lantern".
// Copies game/ and screenshots/ from this repository into the output
// directory (MAKEFUN_OUTPUT_DIR, or /output) and writes /output/dossier.json
// with buildDossier from vendor/makefun-game.ts. Standard library only.
// Deterministic: two runs write the same bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in, never the
// process's working directory: the grader runs us from anywhere.
const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function copyTreeInto(srcDir: string, destDir: string): void {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dest = join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyTreeInto(src, dest);
    } else if (entry.isFile()) {
      cpSync(src, dest);
    }
  }
}

function main(): void {
  const gameDir = join(REPO_ROOT, 'game');
  const shotsDir = join(REPO_ROOT, 'screenshots');
  if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
    throw new Error('main.ts: game/ is missing from the repository');
  }
  if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
    throw new Error('main.ts: screenshots/ is missing from the repository');
  }
  // Start from a clean output directory so stale files never leak in.
  // Clear the directory's CONTENTS, not the directory itself: under the
  // grader /output's parent is not writable by uid 65534, so removing
  // /output itself throws EACCES and exits 1.
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const entry of readdirSync(OUTPUT_DIR)) {
    rmSync(join(OUTPUT_DIR, entry), { recursive: true, force: true });
  }
  copyTreeInto(gameDir, join(OUTPUT_DIR, 'game'));
  copyTreeInto(shotsDir, join(OUTPUT_DIR, 'screenshots'));
  const dossier = buildDossier(OUTPUT_DIR, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(OUTPUT_DIR, 'dossier.json'), dossier);
}

main();
