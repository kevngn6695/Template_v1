CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

-- Inner comments in the database
-- COMMENT ON TABLE migrations IS "which migrations have run, and when. Maintained by src/db/migrate.ts"
-- COMMENT ON COLUMN 