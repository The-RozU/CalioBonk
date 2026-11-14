import { defineConfig } from 'vite';

// Relative URLs keep the build usable at /CalioBonk/ on GitHub Pages.
export default defineConfig({
  base: './',
  build: { target: 'es2022', sourcemap: false },
});
