-- ============================================================
-- Migration: add email verification
-- Safe to run once on your EXISTING database -- does NOT delete
-- or touch any existing rows, only adds columns to users.
-- ============================================================

USE light_tracker;

-- If this errors with "Duplicate column name", it just means this
-- migration already ran -- safe to ignore.
ALTER TABLE users
    ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN verification_code VARCHAR(10) NULL,
    ADD COLUMN verification_code_expires DATETIME NULL;
