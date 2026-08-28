-- =============================================================================
--  002_migration_table — up
-- =============================================================================
--
--  The runner's own ledger: one row per migration that has been applied.
--
--  This file is the SINGLE definition of the table. It is read from two places,
--  which is the whole reason it is a file rather than a string literal:
--
--    • migration.ts → createMigrationsTable()
--        Runs before every command. The runner cannot read which migrations
--        have been applied until the table it reads from exists, so this is
--        bootstrapped outside the migration list.
--
--    • controllers/001_migration_table.controller.ts → up()
--        The same DDL as an ordinary migration, so a database bootstrapped by
--        an external tool still records 001 as applied.
--
--  Because both paths execute this file, the two can never drift. When it was
--  duplicated as two string literals, adding a column in one place left the
--  other creating a table one column short — and `CREATE TABLE IF NOT EXISTS`
--  succeeds silently against the older shape, so nothing reported the problem.
--
--  IDEMPOTENT ON PURPOSE
--  `IF NOT EXISTS` is required, not defensive: createMigrationsTable() runs on
--  every single command, and the migration may run over a table that is
--  already there.
--
-- =============================================================================

CREATE TABLE IF NOT EXISTS migrations (
    -- Surrogate key. Insertion order, not semantic order — read `name` when you
    -- care about sequence, since a re-run after a rollback takes a new id.
    id          SERIAL       PRIMARY KEY,

    -- The registry key from migration.ts, e.g. '001_migration_table'.
    --
    -- UNIQUE is what makes the ledger trustworthy. Without it the same
    -- migration can be recorded twice, and hasMigrationRun() starts reporting
    -- state that never happened.
    name        VARCHAR(255) NOT NULL UNIQUE,

    -- TIMESTAMPTZ, never TIMESTAMP. A bare TIMESTAMP stores no offset, so the
    -- same deploy reads as a different wall-clock time depending on the
    -- server's zone — and comparing two of them across a DST boundary is
    -- quietly wrong.
    executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Deliberately no index beyond the two the constraints already create:
-- PRIMARY KEY gives one on `id`, UNIQUE gives one on `name`, and every query
-- the runner makes is a lookup by name or a full ordered scan of a table that
-- holds one row per migration ever written.