/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirrors tsconfig `paths`, so tests import `@/…` like the source does.
    alias: { '@': path.resolve(__dirname, 'src') },
  },

  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts'],

    // Env vars must exist before any module that reads them is imported.
    setupFiles: ['./tests/setup/testEnv.ts'],
    globalSetup: ['./tests/setup/globalSetup.ts'],

    /**
     * Every suite shares one database, so files run one at a time. Faster
     * alternatives exist — a schema or database per worker — but they trade
     * clarity for a few seconds, and this suite runs in well under a minute.
     */
    fileParallelism: false,

    testTimeout: 20_000,
    hookTimeout: 30_000,

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        // Boots the process; exercised by the HTTP suite through app.ts.
        'src/server.ts',
        /**
         * Covered by tests/cli — but those spawn a child process, which v8
         * coverage does not instrument. Counting it would report 0% for code
         * that is in fact tested, and a misleading number is worse than none.
         */
        'src/database/cli/**',
        'src/routes/**',
        '**/*.d.ts',
      ],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },

    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './reports/junit.xml' },
  },
});
