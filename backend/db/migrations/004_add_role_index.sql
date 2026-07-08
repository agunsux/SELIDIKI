-- db/migrations/004_add_role_index.sql
-- SAFE — Add index on users.role for admin search queries.
-- No data modification. No breaking change.
-- Rollback: DROP INDEX IF EXISTS idx_users_role;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

COMMENT ON INDEX idx_users_role IS 'Supports UserRepository.search() filtering by role';
