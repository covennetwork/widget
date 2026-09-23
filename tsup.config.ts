import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  external: ['react', 'react/jsx-runtime'],
  // Preserve the client-boundary directive in the bundled output so Next treats the component
  // as a client component regardless of how the host imports it.
  banner: { js: "'use client'" },
})
