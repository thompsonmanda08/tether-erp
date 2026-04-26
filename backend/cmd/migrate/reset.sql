-- Reset script — NOT a goose migration.
-- Drops the public schema and all objects. Run before re-applying migrations
-- via `make db-reset`. Invoked by backend/cmd/migrate with the -reset flag.

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
