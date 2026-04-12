import { defineConfig } from 'tsup'

export default defineConfig([
  // Main entry (pipeline + withAuth)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['next', 'jose'],
    noExternal: ['@kaappu/core'],
    treeshake: true,
  },
  // Server entry (authorize, currentAuthorizedUser)
  {
    entry: { server: 'src/server.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    external: ['next', 'jose', 'react'],
    noExternal: ['@kaappu/core'],
    treeshake: true,
  },
])
