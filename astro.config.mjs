import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

// The bug needs an .astro file whose path shares no directory with the project
// root except `/`. Put a component in the OS temp dir (or EXT_DIR) and import it
// through the `@ext` alias. Clone this project outside the temp dir, e.g. under ~.
const extDir = resolve(process.env.EXT_DIR ?? join(tmpdir(), 'astro-outside-root-style-repro'));
const root = fileURLToPath(new URL('.', import.meta.url));

const topLevelDir = (p) => p.split(sep)[1];
if (topLevelDir(extDir) === topLevelDir(root)) {
	console.warn(
		`[repro] ${extDir} and ${root} share "${sep}${topLevelDir(root)}", so the bug does not trigger.`,
	);
}

mkdirSync(extDir, { recursive: true });
writeFileSync(
	join(extDir, 'Card.astro'),
	'<p class="card">Hello from outside the project root</p>\n<style>.card { color: red; }</style>\n',
);

export default defineConfig({
	vite: { resolve: { alias: { '@ext': extDir } } },
});
