# Astro: scoped styles break for `.astro` files outside the root

Minimal reproduction of an Astro bug. `astro build` fails, and `astro dev` returns a 500, when a component with a `<style>` lives outside the project root in a directory that shares nothing with the root except `/`:

```
No cached compile metadata found for "/tmp/astro-outside-root-style-repro/Card.astro?astro&type=style&index=0&lang.css".
The main Astro module "/home/user/astro-outside-root-style-repro/tmp/astro-outside-root-style-repro/Card.astro"
should have compiled and filled the metadata first, before its virtual modules can be requested.
```

In real projects, this happens with pnpm's global virtual store (`virtualStoreType: global`) when the project is not under `$HOME`, or with a `node_modules` symlinked in from another mount (Docker volumes, buildpacks).

## Reproduce

Clone the repo **outside your OS temp dir**, for example under your home directory, then build:

```sh
git clone https://github.com/sebdanielsson/astro-outside-root-style-repro ~/astro-outside-root-style-repro
cd ~/astro-outside-root-style-repro
pnpm install
pnpm build   # fails with the error above
```

`astro.config.mjs` writes `Card.astro` to `<os.tmpdir()>/astro-outside-root-style-repro/` and maps the `@ext` alias to that directory. `src/pages/index.astro` imports `@ext/Card.astro`. On Linux the two paths are `/tmp/...` and `/home/...`; on macOS they are `/var/folders/...` and `/Users/...`. Windows doesn't reach this code path, because Vite ids there start with a drive letter.

Set `EXT_DIR` to put the component somewhere else.

## Control

The same component outside the root, but in a directory that shares a parent with the project, builds fine:

```sh
EXT_DIR="$PWD/../astro-ext" pnpm build   # passes
```

## Cause

`normalizeFilename` in `@astrojs/vite-plugin-astro` treats an absolute path as root-relative when it shares no ancestor directory with the root. It then joins that path onto the root, so the compile-metadata lookup misses.

## Try the fix

The fix is on the `fix/normalize-filename-outside-root` branch of [sebdanielsson/astro](https://github.com/sebdanielsson/astro/tree/fix/normalize-filename-outside-root). Build the plugin from that branch and point this project at the tarball:

```sh
git clone --depth 1 -b fix/normalize-filename-outside-root https://github.com/sebdanielsson/astro ../astro
pnpm -C ../astro install --filter "@astrojs/vite-plugin-astro..."
pnpm -C ../astro --filter "@astrojs/vite-plugin-astro..." run build
pnpm -C ../astro/packages/vite-plugin-astro pack --pack-destination "$PWD"

cat > pnpm-workspace.yaml <<'EOF'
overrides:
  '@astrojs/vite-plugin-astro': file:./astrojs-vite-plugin-astro-0.1.3.tgz
EOF
pnpm install
pnpm build   # passes
```
