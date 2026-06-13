CREATE TABLE IF NOT EXISTS accounts (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  account_id    INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  name          VARCHAR(255)  NOT NULL,
  age           INTEGER       NOT NULL,
  gender        VARCHAR(50)   NOT NULL,
  area          VARCHAR(255)  NOT NULL,
  whatsapp      VARCHAR(30)   NOT NULL,
  email         VARCHAR(255),
  occupation    TEXT,
  interests     TEXT,
  availability  JSONB         DEFAULT '{}',
  group_size_pref VARCHAR(20),
  bio           TEXT,
  edit_key      VARCHAR(64),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Migrations for existing databases (no-ops on fresh installs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS edit_key VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id          SERIAL PRIMARY KEY,
  date        DATE          NOT NULL,
  time_slot   VARCHAR(100)  NOT NULL,
  alley_name  VARCHAR(255)  NOT NULL,
  lane_count  INTEGER,
  status      VARCHAR(20)   DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'completed')),
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_members (
  session_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id)    ON DELETE CASCADE,
  PRIMARY KEY (session_id, user_id)
);

-- OTP table for password reset
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  otp_hash   VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ  NOT NULL,
  used       BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);
-- Clean up expired OTPs automatically via index
CREATE INDEX IF NOT EXISTS otp_email_idx ON password_reset_otps (email);
