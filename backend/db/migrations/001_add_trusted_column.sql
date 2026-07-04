-- db/migrations/001_add_trusted_column.sql
-- Add trusted boolean column to users table if it does not already exist.

ALTER TABLE users ADD COLUMN IF NOT EXISTS trusted BOOLEAN NOT NULL DEFAULT FALSE;
