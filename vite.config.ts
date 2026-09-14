import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // Project Pages URL: https://putmanmodel.github.io/kingpin-weak-signal-demo/
  base: command === 'build' || isPreview ? '/kingpin-weak-signal-demo/' : '/',
}));
