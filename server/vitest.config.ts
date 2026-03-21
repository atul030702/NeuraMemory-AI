import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts'],
    // Use pool: 'forks' for better ESM support
    pool: 'forks',
  },
});
