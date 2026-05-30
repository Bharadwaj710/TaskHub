-- Migration 001: Add role column to users table
-- Run this in the Supabase SQL Editor BEFORE deploying the updated backend code.
-- This is safe to run on an existing database with existing users.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(10) NOT NULL DEFAULT 'user';

-- Verify the column was added:
-- SELECT id, email, role FROM users LIMIT 10;
