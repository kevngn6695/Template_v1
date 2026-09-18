/**
 * @copyright 2026 - present, Heniseeyou, LLC

 * @license Apache-2.0

 * @author Hiep Nguyen

 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests import from `../src/*.js` — the source, not `dist`. Importing the

    // built package would mean every test run needs a build first, and a stale

    // dist would make the suite pass against code that no longer exists.

    include: ['tests/**/*.test.ts'],

    environment: 'node',
  },
});
