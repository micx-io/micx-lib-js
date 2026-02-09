import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';

// Vite library build for micx-lib-js
// - ESM for modern bundlers
// - UMD for direct <script> usage
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    root: './',
    plugins: [
        dts({
            entryRoot: './',
            tsconfigPath: path.join(__dirname, 'tsconfig.json'),
            aliasesExclude: [/@trunkjs\/.*/],
        })
    ],
    server: {
      port: 4000,
    },
    build: {
      // Keep build output at project root /dist (not under /www)
      outDir: path.join(__dirname, 'dist'),
        emptyOutDir: true,
        reportCompressedSize: true,
        commonjsOptions: {
            transformMixedEsModules: true,
        },
        lib: {
            // Could also be a dictionary or array of multiple entry points.
            entry: 'index.ts',
            name: 'template',
            fileName: 'index',
            // Change this to the formats you want to support.
            // Don't forget to update your package.json as well.
            formats: ['es' as const],
        },
        rollupOptions: {
            // External packages that should not be bundled into your library.
            // External packages that should not be bundled into your library.
            external: (id: any) => !id.startsWith('.') && !path.isAbsolute(id),
        },
    },
  };
});
