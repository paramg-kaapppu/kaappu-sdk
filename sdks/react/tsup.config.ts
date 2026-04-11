import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  // Only react/react-dom should be peer dependencies the host app provides.
  // Everything else (including @kaappu/core) is bundled into the dist so the
  // published package is self-contained — customers get a single npm install.
  external: ['react', 'react-dom'],
  noExternal: ['@kaappu/core'],
  treeshake: true,
})
