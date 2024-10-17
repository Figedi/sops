import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts', 'src/test.ts', 'src/kms.ts'],
    splitting: false,
    sourcemap: true,
    clean: true,
    dts: true,
    outDir: 'dist',
    target: 'es2022',
    format: ['cjs', 'esm'],
    tsconfig: './tsconfig.json',
});
