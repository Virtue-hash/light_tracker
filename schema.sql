-- ============================================================
-- Light Tracker -- PostgreSQL schema
-- Converted from the original MySQL/MariaDB schema.
-- Includes the transformers table and users.email_verified /
-- verification_code / verification_code_expires columns that
-- used to be separate migration files -- they're merged in here
-- since this is a fresh database.
-- Run this ONCE against your new Render PostgreSQL database.
-- ============================================================

CREATE TABLE users (
    id                          SERIAL PRIMARY KEY,
    full_name                   VARCHAR(120) NOT NULL,
    email                       VARCHAR(160) NOT NULL UNIQUE,
    password_hash               VARCHAR(255) NOT NULL,
    email_verified              BOOLEAN NOT NULL DEFAULT FALSE,
    verification_code           VARCHAR(10),
    verification_code_expires   TIMESTAMP,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transformers (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    location    VARCHAR(150),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE electricity_profiles (
    id                  SERIAL PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    electricity_type    VARCHAR(20) NOT NULL CHECK (electricity_type IN ('Prepaid', 'Grid', 'Generator', 'Solar')),
    location            VARCHAR(120) NOT NULL,
    monthly_budget      NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    transformer_id      INT REFERENCES transformers(id) ON DELETE SET NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE power_status_events (
    id                  SERIAL PRIMARY KEY,
    user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              VARCHAR(3) NOT NULL CHECK (status IN ('ON', 'OFF')),
    started_at          TIMESTAMP NOT NULL,
    ended_at            TIMESTAMP,
    duration_minutes    INT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE unit_purchases (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    units           NUMERIC(8,2) NOT NULL,
    amount_naira    NUMERIC(10,2) NOT NULL,
    purchased_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chat_messages (
    id          SERIAL PRIMARY KEY,
    user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender      VARCHAR(4) NOT NULL CHECK (sender IN ('user', 'ai')),
    message     TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_settings (
    id                    SERIAL PRIMARY KEY,
    user_id               INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    outage_alerts         BOOLEAN NOT NULL DEFAULT TRUE,
    low_unit_reminders    BOOLEAN NOT NULL DEFAULT TRUE,
    community_map         BOOLEAN NOT NULL DEFAULT FALSE,
    data_saver_mode       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_power_status_events_user_id ON power_status_events(user_id);
CREATE INDEX idx_unit_purchases_user_id ON unit_purchases(user_id);
