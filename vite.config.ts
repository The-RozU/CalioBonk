import { defineConfig } from 'vite';

// GitHub Pages serves this repository at /CalioBonk/ rather than the domain root.
export default defineConfig({
  base: '/CalioBonk/',
  build: { target: 'es2022', sourcemap: false },
});
