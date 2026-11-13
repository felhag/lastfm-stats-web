import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      projects: resolve(process.cwd(), 'projects'),
    },
  },
  test: {
    include: ['projects/**/*.spec.ts'],
  },
});
