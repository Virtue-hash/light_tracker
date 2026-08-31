-- ============================================================
-- Migration: add transformer tracking
-- Safe to run once on your EXISTING database -- does NOT delete
-- or touch any existing rows, only adds a new table and one new
-- column.
-- ============================================================

USE light_tracker;

CREATE TABLE IF NOT EXISTS transformers (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    location    VARCHAR(150),
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name)
) ENGINE=InnoDB;

ALTER TABLE electricity_profiles
    ADD COLUMN transformer_id INT NULL,
    ADD CONSTRAINT fk_transformer
        FOREIGN KEY (transformer_id) REFERENCES transformers(id)
        ON DELETE SET NULL;