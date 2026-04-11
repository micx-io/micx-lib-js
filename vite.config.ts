/// <reference types='vitest' />

import * as path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from "vite-tsconfig-paths";

const projectName = 'project';
const dirName = `build`;

export default defineConfig(() => ({
  server: {
    port: 4000,
    host: '0.0.0.0',
    hmr: true,
  },
  root: __dirname,
  cacheDir: `./node_modules/.vite/${dirName}`,
  plugins: [
    dts({ entryRoot: 'src', tsconfigPath: path.join(__dirname, 'tsconfig.json') }),
  ],
  // Uncomment this if you are using workers.
  // worker: {
  //  plugins: [ nxViteTsPaths() ],
  // },
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    reportsDirectory: `../../coverage/${dirName}`,
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Could also be a dictionary or array of multiple entry points.
      entry: 'src/index.ts',
      name: projectName,
      fileName: 'index',
      // Change this to the formats you want to support.
      // Don't forget to update your package.json as well.
      formats: ['es' as const],
    },
    rollupOptions: {
      // External packages that should not be bundled into your library. IMPORTANT!
      external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
    },
  },
  test: {
    passWithNoTests: true,
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: `../../coverage/${dirName}`,
      provider: 'v8' as const,
    },
  },
}));
