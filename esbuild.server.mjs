/**
 * Single-file CJS server: Express + @devvit/* + app code.
 * ESM output breaks on Reddit with "Dynamic require of path is not supported"
 * (CJS deps like depd use require("path") inside closures).
 * External @devvit fails at runtime (MODULE_NOT_FOUND on Reddit).
 */
import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist/server', { recursive: true });

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/server/index.js',
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
} else {
  await esbuild.build(buildOptions);
}
