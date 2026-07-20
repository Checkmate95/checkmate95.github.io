import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('vendor', { recursive: true });

await build({
    entryPoints: ['vendor-entry.mjs'],
    bundle: true,
    format: 'esm',
    outfile: 'vendor/dependencies.js',
    platform: 'browser',
    target: 'es2020',
    sourcemap: false,
    loader: {
        '.wasm': 'file'
    }
});

await copyFile(
    'node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm',
    'vendor/squoosh_oxipng_bg.wasm'
);
